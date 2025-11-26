import { supabase } from '../lib/supabase';

export const searchService = {
  // Check if user is organizer or admin
  isOrganizerOrAdmin(userRole) {
    return userRole === 'Organizer' || userRole === 'organizer' || 
           userRole === 'Administrator' || userRole === 'admin';
  },

  // Global search across all data - role-aware
  async globalSearch(userId, query, userRole = null) {
    if (!query || query.trim().length < 2) {
      return { events: [], participants: [], registeredEvents: [], myEvents: [], total: 0 };
    }

    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      const isOrgOrAdmin = this.isOrganizerOrAdmin(userRole);
      const today = new Date().toISOString().split('T')[0];

      let allEvents = [];
      let myEvents = [];
      let registeredEvents = [];
      let participants = [];

      // 1. Search ALL events (including past events) - comprehensive search
      // Search across multiple fields: title, description, location, category, tags, event_type
      const { data: discoveredEvents, error: discoverError } = await supabase
        .from('events')
        .select('*')
        .neq('status', 'cancelled')
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},location.ilike.${searchTerm},category.ilike.${searchTerm},event_type.ilike.${searchTerm}`)
        .order('date', { ascending: false })
        .limit(15);

      if (!discoverError && discoveredEvents) {
        // Also do a secondary search for tags (stored as array/text)
        // Filter in JS for more flexible matching
        allEvents = discoveredEvents.filter(event => {
          const searchLower = query.toLowerCase();
          // Check all text fields
          const matchesBasic = 
            event.title?.toLowerCase().includes(searchLower) ||
            event.description?.toLowerCase().includes(searchLower) ||
            event.location?.toLowerCase().includes(searchLower) ||
            event.category?.toLowerCase().includes(searchLower) ||
            event.event_type?.toLowerCase().includes(searchLower);
          
          // Check tags array if it exists
          const matchesTags = Array.isArray(event.tags) && 
            event.tags.some(tag => tag.toLowerCase().includes(searchLower));
          
          // Check virtual_link for online events
          const matchesVirtual = event.virtual_link?.toLowerCase().includes(searchLower);
          
          return matchesBasic || matchesTags || matchesVirtual;
        });

        // Sort: upcoming events first, then past events
        allEvents.sort((a, b) => {
          const aDate = new Date(a.date);
          const bDate = new Date(b.date);
          const todayDate = new Date(today);
          const aIsUpcoming = aDate >= todayDate;
          const bIsUpcoming = bDate >= todayDate;
          
          // Upcoming events come first
          if (aIsUpcoming && !bIsUpcoming) return -1;
          if (!aIsUpcoming && bIsUpcoming) return 1;
          
          // Within same category, sort by date (upcoming: ascending, past: descending)
          if (aIsUpcoming) return aDate - bDate;
          return bDate - aDate;
        });
      }

      // 2. For regular users: Search events they're registered for
      if (!isOrgOrAdmin) {
        const { data: userRegistrations, error: regError } = await supabase
          .from('participants')
          .select(`
            *,
            events!inner(*)
          `)
          .eq('user_id', userId)
          .limit(20);

        if (!regError && userRegistrations) {
          // Filter in JS for more flexible matching
          const searchLower = query.toLowerCase();
          registeredEvents = userRegistrations
            .filter(reg => {
              const event = reg.events;
              return event.title?.toLowerCase().includes(searchLower) ||
                     event.description?.toLowerCase().includes(searchLower) ||
                     event.location?.toLowerCase().includes(searchLower) ||
                     event.category?.toLowerCase().includes(searchLower);
            })
            .map(reg => ({
              ...reg.events,
              registration_status: reg.status,
              registration_date: reg.registration_date
            }));
        }
      }

      // 3. For organizers/admins: Search their created events (all, not just future)
      if (isOrgOrAdmin) {
        const { data: createdEvents, error: createdError } = await supabase
          .from('events')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (!createdError && createdEvents) {
          const searchLower = query.toLowerCase();
          myEvents = createdEvents.filter(event => 
            event.title?.toLowerCase().includes(searchLower) ||
            event.description?.toLowerCase().includes(searchLower) ||
            event.location?.toLowerCase().includes(searchLower) ||
            event.category?.toLowerCase().includes(searchLower) ||
            event.event_type?.toLowerCase().includes(searchLower) ||
            (Array.isArray(event.tags) && event.tags.some(tag => tag.toLowerCase().includes(searchLower)))
          );
        }

        // 4. For organizers/admins: Search participants in their events
        const { data: eventParticipants, error: participantsError } = await supabase
          .from('participants')
          .select(`
            *,
            events!inner(title, user_id)
          `)
          .eq('events.user_id', userId)
          .limit(20);

        if (!participantsError && eventParticipants) {
          const searchLower = query.toLowerCase();
          participants = eventParticipants.filter(p =>
            p.first_name?.toLowerCase().includes(searchLower) ||
            p.last_name?.toLowerCase().includes(searchLower) ||
            p.email?.toLowerCase().includes(searchLower) ||
            p.phone?.toLowerCase().includes(searchLower)
          );
        }
      }

      // Calculate total
      const total = allEvents.length + registeredEvents.length + myEvents.length + participants.length;

      // Build quickLinks based on user role
      const quickLinks = [{ label: 'Browse all events', href: '/events' }];
      if (isOrgOrAdmin) {
        quickLinks.push({ label: 'Create a new event', href: '/create-event' });
        quickLinks.push({ label: 'View participants', href: '/participants' });
      } else {
        quickLinks.push({ label: 'My schedule', href: '/#my-schedule' });
      }

      // Build suggestions
      const suggestions = {
        popularCategories: [],
        upcomingEvents: [],
        quickLinks
      };

      try {
        // Get popular categories from all events
        const { data: categorySamples } = await supabase
          .from('events')
          .select('category')
          .not('category', 'is', null)
          .gte('date', today)
          .limit(100);

        if (categorySamples) {
          const categoryCounts = categorySamples.reduce((acc, event) => {
            if (event?.category) {
              acc[event.category] = (acc[event.category] || 0) + 1;
            }
            return acc;
          }, {});

          suggestions.popularCategories = Object.entries(categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([category, count]) => ({ category, count }));
        }

        // Get upcoming events suggestions
        const { data: upcomingEvents } = await supabase
          .from('events')
          .select('id,title,date,location,category')
          .gte('date', today)
          .neq('status', 'cancelled')
          .order('date', { ascending: true })
          .limit(5);

        if (upcomingEvents) {
          suggestions.upcomingEvents = upcomingEvents;
        }
      } catch (suggestionError) {
        console.error('Error building search suggestions:', suggestionError);
      }

      return {
        events: allEvents,
        registeredEvents,
        myEvents,
        participants,
        total,
        suggestions,
        isOrganizerOrAdmin: isOrgOrAdmin
      };
    } catch (error) {
      console.error('Error performing global search:', error);
      
      const isOrgOrAdmin = this.isOrganizerOrAdmin(userRole);
      const quickLinks = [{ label: 'Browse all events', href: '/events' }];
      if (isOrgOrAdmin) {
        quickLinks.push({ label: 'Create a new event', href: '/create-event' });
      }
      
      return { 
        events: [], 
        registeredEvents: [],
        myEvents: [],
        participants: [], 
        total: 0, 
        error: error.message,
        suggestions: {
          popularCategories: [],
          upcomingEvents: [],
          quickLinks
        },
        isOrganizerOrAdmin: isOrgOrAdmin
      };
    }
  },

  // Search only events
  async searchEvents(userId, query) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},location.ilike.${searchTerm},category.ilike.${searchTerm}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching events:', error);
      return [];
    }
  },

  // Search only participants
  async searchParticipants(userId, query) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      
      const { data, error } = await supabase
        .from('participants')
        .select(`
          *,
          events!inner(title, user_id)
        `)
        .eq('events.user_id', userId)
        .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
        .order('registration_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching participants:', error);
      return [];
    }
  }
};
