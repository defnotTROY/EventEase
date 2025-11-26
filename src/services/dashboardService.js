import { supabase } from '../lib/supabase';

class DashboardService {
  // Get dashboard overview statistics based on user role
  async getDashboardStats(userId = null, userRole = 'user') {
    try {
      // Get current user if not provided
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');
      
      const activeUserId = userId || user.id;
      const isOrganizer = userRole === 'Organizer' || userRole === 'organizer';
      const isAdmin = userRole === 'Administrator' || userRole === 'Admin';

      // For regular users - get stats about events they're REGISTERED for
      if (!isOrganizer && !isAdmin) {
        return await this.getUserStats(activeUserId);
      }

      // For organizers/admins - get stats about events they CREATED
      return await this.getOrganizerStats(activeUserId);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  // Get stats for regular users (events they're registered for)
  async getUserStats(userId) {
    try {
      // Get all registrations for this user
      const { data: registrations, error: regError } = await supabase
        .from('participants')
        .select(`
          id,
          status,
          event_id,
          events (
            id,
            status,
            date,
            time
          )
        `)
        .eq('user_id', userId);

      if (regError) throw regError;

      // Filter active registrations (status is 'registered' or NULL)
      const activeRegistrations = (registrations || []).filter(r => 
        !r.status || r.status === 'registered' || r.status === 'attended'
      );

      // Count registrations
      const registeredEvents = activeRegistrations.length;
      
      // Count attended events
      const attendedEvents = activeRegistrations.filter(r => r.status === 'attended').length;
      
      // Count upcoming registrations using ACCURATE status calculation (not stored status)
      const upcomingRegistrations = activeRegistrations.filter(r => {
        if (!r.events) return false;
        const accurateStatus = this.calculateAccurateStatus(r.events);
        return accurateStatus === 'upcoming' || accurateStatus === 'ongoing';
      }).length;

      return {
        registeredEvents,
        attendedEvents,
        upcomingRegistrations,
        // For compatibility with organizer view
        totalEvents: registeredEvents,
        totalParticipants: 0,
        engagementRate: registeredEvents > 0 ? Math.round((attendedEvents / registeredEvents) * 100) : 0,
        upcomingEvents: upcomingRegistrations,
        eventGrowth: null,
        participantGrowth: null,
        engagementChange: null,
        upcomingChange: null
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return {
        registeredEvents: 0,
        attendedEvents: 0,
        upcomingRegistrations: 0,
        totalEvents: 0,
        totalParticipants: 0,
        engagementRate: 0,
        upcomingEvents: 0,
        eventGrowth: null,
        participantGrowth: null,
        engagementChange: null,
        upcomingChange: null
      };
    }
  }

  // Get stats for organizers/admins (events they created)
  async getOrganizerStats(userId) {
    try {
      // Get all events created by this user
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId);

      if (eventsError) throw eventsError;

      // Calculate statistics using ACCURATE status (not stored status)
      const totalEvents = events?.length || 0;
      const upcomingEvents = events?.filter(e => this.calculateAccurateStatus(e) === 'upcoming').length || 0;
      const activeEvents = events?.filter(e => this.calculateAccurateStatus(e) === 'ongoing').length || 0;
      const completedEvents = events?.filter(e => this.calculateAccurateStatus(e) === 'completed').length || 0;

      // Get total participants across all events
      let totalParticipants = 0;
      let totalAttended = 0;
      
      if (events && events.length > 0) {
        for (const event of events) {
          const { data: participants, error: participantsError } = await supabase
            .from('participants')
            .select('status')
            .eq('event_id', event.id);
          
          if (!participantsError && participants) {
            totalParticipants += participants.length;
            totalAttended += participants.filter(p => p.status === 'attended').length;
          }
        }
      }

      // Calculate engagement rate
      const engagementRate = totalParticipants > 0 ? Math.round((totalAttended / totalParticipants) * 100) : 0;

      // Calculate growth (compare with previous period)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: previousEvents, error: previousError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .lt('created_at', thirtyDaysAgo.toISOString());

      const previousEventCount = previousEvents?.length || 0;
      let previousParticipants = 0;
      let previousAttended = 0;

      if (previousEvents && previousEvents.length > 0) {
        for (const event of previousEvents) {
          const { data: participants, error: participantsError } = await supabase
            .from('participants')
            .select('status')
            .eq('event_id', event.id);

          if (!participantsError && participants) {
            previousParticipants += participants.length;
            previousAttended += participants.filter(p => p.status === 'attended').length;
          }
        }
      }

      const previousEngagementRate = previousParticipants > 0
        ? Math.round((previousAttended / previousParticipants) * 100)
        : null;

      const eventGrowth = previousEventCount > 0
        ? Math.round(((totalEvents - previousEventCount) / previousEventCount) * 100)
        : null;

      const participantGrowth = previousParticipants > 0
        ? Math.round(((totalParticipants - previousParticipants) / previousParticipants) * 100)
        : null;

      const engagementChange = previousEngagementRate !== null
        ? engagementRate - previousEngagementRate
        : null;

      const previousUpcomingEvents = previousEvents?.filter(e => this.calculateAccurateStatus(e) === 'upcoming').length || 0;
      const upcomingChange = previousUpcomingEvents > 0
        ? Math.round(((upcomingEvents - previousUpcomingEvents) / previousUpcomingEvents) * 100)
        : null;

      return {
        totalEvents,
        totalParticipants,
        engagementRate,
        upcomingEvents,
        activeEvents,
        completedEvents,
        eventGrowth,
        participantGrowth,
        engagementChange,
        upcomingChange,
        totalAttended
      };
    } catch (error) {
      console.error('Error fetching organizer stats:', error);
      throw error;
    }
  }

  // Get today's date as a string in YYYY-MM-DD format (LOCAL timezone)
  getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Get upcoming events
  async getUpcomingEvents(limit = 5) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      const todayStr = this.getLocalDateString();

      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', todayStr)
        .neq('status', 'cancelled')
        .order('date', { ascending: true })
        .limit(limit);

      if (eventsError) throw eventsError;

      // Filter to only truly upcoming events and get participant counts
      const eventsWithParticipants = await Promise.all(
        (events || []).map(async (event) => {
          const { data: participants, error: participantsError } = await supabase
            .from('participants')
            .select('id')
            .eq('event_id', event.id);

          const participantCount = participantsError ? 0 : (participants?.length || 0);
          const accurateStatus = this.calculateAccurateStatus(event);

          return {
            id: event.id,
            title: event.title,
            date: event.date,
            time: event.time,
            location: event.location,
            participants: participantCount,
            status: accurateStatus,
            description: event.description,
            category: event.category
          };
        })
      );

      // Only return truly upcoming events
      return eventsWithParticipants.filter(e => e.status === 'upcoming' || e.status === 'ongoing');
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      throw error;
    }
  }

  // Get recent activities
  async getRecentActivities(limit = 10) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      // Get recent events
      const { data: recentEvents, error: eventsError } = await supabase
        .from('events')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (eventsError) throw eventsError;

      // Get recent participants
      const { data: recentParticipants, error: participantsError } = await supabase
        .from('participants')
        .select(`
          id, registration_date, status,
          events!inner(title, user_id)
        `)
        .eq('events.user_id', user.id)
        .order('registration_date', { ascending: false })
        .limit(5);

      if (participantsError) throw participantsError;

      // Combine and format activities
      const activities = [];

      // Add event creation activities
      if (recentEvents) {
        recentEvents.forEach(event => {
          activities.push({
            id: `event-${event.id}`,
            action: 'Event created',
            event: event.title,
            time: this.getTimeAgo(event.created_at),
            type: 'event_created',
            icon: 'calendar'
          });
        });
      }

      // Add participant registration activities
      if (recentParticipants) {
        recentParticipants.forEach(participant => {
          activities.push({
            id: `participant-${participant.id}`,
            action: 'New participant registered',
            event: participant.events?.title || 'Unknown Event',
            time: this.getTimeAgo(participant.registration_date),
            type: 'participant_registered',
            icon: 'user'
          });
        });
      }

      // Sort by time and limit
      return activities
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      throw error;
    }
  }

  // Get all events for the events tab based on user role
  async getAllEvents(userRole = 'user') {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      const isOrganizer = userRole === 'Organizer' || userRole === 'organizer';
      const isAdmin = userRole === 'Administrator' || userRole === 'Admin';

      let events = [];

      if (isOrganizer || isAdmin) {
        // For organizers/admins - get events they created
        const { data: createdEvents, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (eventsError) throw eventsError;
        events = createdEvents || [];
      } else {
        // For regular users - get events they're registered for
        const { data: registrations, error: regError } = await supabase
          .from('participants')
          .select(`
            event_id,
            status,
            registration_date,
            events (*)
          `)
          .eq('user_id', user.id);

        if (regError) throw regError;

        // Filter to only include active registrations (registered or NULL status)
        const activeRegistrations = (registrations || []).filter(r => 
          !r.status || r.status === 'registered' || r.status === 'attended'
        );

        // Extract events from registrations
        events = activeRegistrations
          .filter(r => r.events) // Make sure event exists
          .map(r => ({
            ...r.events,
            registration_status: r.status,
            registration_date: r.registration_date
          }));
      }

      // Get participant counts for each event and calculate accurate status
      const eventsWithParticipants = await Promise.all(
        events.map(async (event) => {
          const { data: participants, error: participantsError } = await supabase
            .from('participants')
            .select('id')
            .eq('event_id', event.id);

          const participantCount = participantsError ? 0 : (participants?.length || 0);

          // Calculate accurate status based on date
          const accurateStatus = this.calculateAccurateStatus(event);

          return {
            id: event.id,
            title: event.title,
            date: event.date,
            time: event.time,
            location: event.location,
            participants: participantCount,
            status: accurateStatus, // Use calculated status, not stored status
            description: event.description,
            category: event.category,
            created_at: event.created_at,
            registration_status: event.registration_status,
            registration_date: event.registration_date
          };
        })
      );

      // Sort by date (most recent first for organizers, upcoming first for users)
      if (isOrganizer || isAdmin) {
        return eventsWithParticipants.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      } else {
        return eventsWithParticipants.sort((a, b) => new Date(a.date) - new Date(b.date));
      }
    } catch (error) {
      console.error('Error fetching all events:', error);
      throw error;
    }
  }

  // Calculate accurate status based on current date (using LOCAL timezone)
  calculateAccurateStatus(event) {
    // If event is cancelled, keep it cancelled
    if (event.status === 'cancelled') {
      return 'cancelled';
    }

    const now = new Date();
    
    // Parse event date properly (add T00:00:00 to ensure local timezone parsing)
    const eventDateStr = event.date;
    const eventStart = new Date(eventDateStr + 'T00:00:00');
    
    // Parse time if available
    if (event.time) {
      const timeParts = event.time.match(/(\d+):(\d+)/);
      if (timeParts) {
        eventStart.setHours(parseInt(timeParts[1]), parseInt(timeParts[2]), 0, 0);
      }
    }
    
    // Event end is 2 hours after start by default
    const eventEnd = new Date(eventStart);
    eventEnd.setHours(eventEnd.getHours() + 2);
    
    // Determine status
    if (now < eventStart) {
      return 'upcoming';
    } else if (now >= eventStart && now <= eventEnd) {
      return 'ongoing';
    } else {
      return 'completed';
    }
  }

  // Get AI insights (non-AI version for dashboard) based on user role
  async getDashboardInsights(userId = null, userRole = 'user') {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      const activeUserId = userId || user.id;
      const isOrganizer = userRole === 'Organizer' || userRole === 'organizer';
      const isAdmin = userRole === 'Administrator' || userRole === 'Admin';

      // Get role-specific stats
      const stats = await this.getDashboardStats(activeUserId, userRole);
      const insights = [];

      if (isOrganizer || isAdmin) {
        // ORGANIZER/ADMIN INSIGHTS
        
        // Event creation insight
        if (stats.totalEvents > 0) {
          insights.push({
            title: 'Event Creation Pattern',
            description: `You've created ${stats.totalEvents} events with ${stats.totalParticipants} total registrations`,
            recommendation: stats.totalEvents > 5 ? 'Consider creating more events to increase engagement' : 'Keep creating events to build your audience',
            icon: 'calendar'
          });
        } else {
          insights.push({
            title: 'Get Started',
            description: "You haven't created any events yet",
            recommendation: 'Create your first event to start building your audience!',
            icon: 'calendar'
          });
        }

        // Engagement insight for organizers
        if (stats.engagementRate > 80) {
          insights.push({
            title: 'High Attendance Rate',
            description: `Your events have an ${stats.engagementRate}% attendance rate`,
            recommendation: 'Your events are performing well! Consider expanding successful formats',
            icon: 'trending-up'
          });
        } else if (stats.engagementRate < 50 && stats.totalParticipants > 0) {
          insights.push({
            title: 'Attendance Improvement',
            description: `Your events have a ${stats.engagementRate}% attendance rate`,
            recommendation: 'Send reminders before events and follow up with registered participants',
            icon: 'trending-up'
          });
        }

        // Upcoming events insight for organizers
        if (stats.upcomingEvents > 0) {
          insights.push({
            title: 'Upcoming Events',
            description: `You have ${stats.upcomingEvents} upcoming events scheduled`,
            recommendation: 'Prepare materials and send reminders to participants',
            icon: 'clock'
          });
        }

      } else {
        // REGULAR USER INSIGHTS
        
        // Registration activity insight
        if (stats.registeredEvents > 0) {
          insights.push({
            title: 'Your Event Activity',
            description: `You're registered for ${stats.registeredEvents} events`,
            recommendation: stats.upcomingRegistrations > 0 
              ? `Don't forget - you have ${stats.upcomingRegistrations} upcoming events to attend!`
              : 'Browse more events to find ones that match your interests',
            icon: 'calendar'
          });
        } else {
          insights.push({
            title: 'Get Started',
            description: "You haven't registered for any events yet",
            recommendation: 'Explore events and register for ones that match your interests!',
            icon: 'calendar'
          });
        }

        // Attendance insight for users
        if (stats.registeredEvents > 0) {
          const attendanceRate = stats.registeredEvents > 0 
            ? Math.round((stats.attendedEvents / stats.registeredEvents) * 100) 
            : 0;
          
          if (attendanceRate >= 80) {
            insights.push({
              title: 'Great Attendance!',
              description: `You've attended ${stats.attendedEvents} of ${stats.registeredEvents} events (${attendanceRate}%)`,
              recommendation: 'Keep up the great engagement! Your participation makes events better',
              icon: 'trending-up'
            });
          } else if (stats.attendedEvents === 0 && stats.registeredEvents > 0) {
            insights.push({
              title: 'Time to Attend!',
              description: `You're registered for ${stats.registeredEvents} events but haven't attended any yet`,
              recommendation: 'Make sure to show up to events you register for - organizers are counting on you!',
              icon: 'users'
            });
          } else if (attendanceRate < 50) {
            insights.push({
              title: 'Improve Your Attendance',
              description: `You've attended ${stats.attendedEvents} of ${stats.registeredEvents} registered events`,
              recommendation: 'Try to attend more events you register for to get the most out of your experience',
              icon: 'trending-up'
            });
          }
        }

        // Upcoming events reminder for users
        if (stats.upcomingRegistrations > 0) {
          insights.push({
            title: 'Upcoming Events',
            description: `You have ${stats.upcomingRegistrations} upcoming events on your schedule`,
            recommendation: 'Check the dates and mark your calendar so you don\'t miss them!',
            icon: 'clock'
          });
        } else if (stats.registeredEvents > 0) {
          insights.push({
            title: 'Find New Events',
            description: 'You have no upcoming events scheduled',
            recommendation: 'Browse events to find something new and exciting to attend!',
            icon: 'clock'
          });
        }
      }

      return insights;
    } catch (error) {
      console.error('Error generating dashboard insights:', error);
      return [];
    }
  }

  // Helper method to calculate time ago
  getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }

  // Format date for display
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  // Format time for display
  formatTime(timeString) {
    if (!timeString) return '';
    return timeString;
  }
}

export const dashboardService = new DashboardService();
