import { supabase } from '../lib/supabase';

export const eventsService = {
  // Get all events for the current user
  async getEvents(userId) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching events:', error);
      return { data: null, error };
    }
  },

  // Get all public events (visible to everyone)
  async getAllEvents() {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching all events:', error);
      return { data: null, error };
    }
  },

  // Get a single event by ID
  async getEvent(eventId) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching event:', error);
      return { data: null, error };
    }
  },

  // Get a single event by ID (alias for getEvent)
  async getEventById(eventId) {
    return this.getEvent(eventId);
  },

  // Create a new event
  async createEvent(eventData) {
    try {
      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating event:', error);
      return { data: null, error };
    }
  },

  // Update an existing event
  async updateEvent(eventId, eventData) {
    try {
      const { data, error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating event:', error);
      return { data: null, error };
    }
  },

  // Delete an event
  async deleteEvent(eventId) {
    try {
      const { data, error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error deleting event:', error);
      return { data: null, error };
    }
  },

  // Get event participants count
  async getEventParticipants(eventId) {
    try {
      console.log('Fetching participants for event:', eventId);
      
      const { data, error } = await supabase
        .from('participants')
        .select('id')
        .eq('event_id', eventId);

      if (error) {
        console.error('Error fetching participants:', error);
        throw error;
      }
      
      const count = data?.length || 0;
      console.log('Participants found:', data, 'Count:', count);
      return { data: count, error: null };
    } catch (error) {
      console.error('Error fetching participants:', error);
      return { data: 0, error };
    }
  },

  // Get event participants with full details
  async getEventParticipantsDetails(eventId) {
    try {
      console.log('Fetching participant details for event:', eventId);
      
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('event_id', eventId);

      if (error) {
        console.error('Error fetching participant details:', error);
        throw error;
      }
      
      console.log('Participant details found:', data);
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching participant details:', error);
      return { data: [], error };
    }
  },

  // Register for an event
  async registerForEvent(eventId, participantData) {
    try {
      console.log('Registering for event:', eventId, 'with data:', participantData);
      
      // Get current user to ensure we have the right user ID
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      
      // Check if user is an admin - admins cannot register for events
      const userRole = user.user_metadata?.role;
      if (userRole === 'Administrator' || userRole === 'Admin') {
        throw new Error('Administrators cannot register for events. Admins manage the platform and should not participate as regular attendees.');
      }
      
      console.log('Current user ID:', user.id);
      console.log('Participant user ID:', participantData.userId);
      
      // Ensure the user ID matches the authenticated user
      if (user.id !== participantData.userId) {
        throw new Error('User ID mismatch');
      }
      
      const { data, error } = await supabase
        .from('participants')
        .insert([{
          event_id: eventId,
          user_id: participantData.userId,
          first_name: participantData.firstName,
          last_name: participantData.lastName,
          email: participantData.email,
          phone: participantData.phone
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Registration successful:', data);
      return { data, error: null };
    } catch (error) {
      console.error('Error registering for event:', error);
      return { data: null, error };
    }
  },

  // Check if user is already registered for an event
  async isUserRegistered(eventId, userId) {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return { data: !!data, error: null };
    } catch (error) {
      console.error('Error checking registration:', error);
      return { data: false, error };
    }
  },

  // Update event status
  async updateEventStatus(eventId, status) {
    try {
      const { data, error } = await supabase
        .from('events')
        .update({ status })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating event status:', error);
      return { data: null, error };
    }
  },

  // Update participant status
  async updateParticipantStatus(eventId, userId, newStatus) {
    try {
      const { data, error } = await supabase
        .from('participants')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating participant status:', error);
      return { data: null, error };
    }
  },

  // Get available participant statuses from database
  async getParticipantStatuses() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      // Get all events for the user
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id')
        .eq('user_id', user.id);

      if (eventsError) throw eventsError;

      if (!events || events.length === 0) {
        return { data: ['all', 'registered', 'attended', 'cancelled'], error: null };
      }

      const eventIds = events.map(e => e.id);

      // Get unique statuses from participants
      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select('status')
        .in('event_id', eventIds);

      if (participantsError) throw participantsError;

      // Extract unique statuses
      const uniqueStatuses = new Set();
      if (participants && participants.length > 0) {
        participants.forEach(p => {
          if (p.status) {
            uniqueStatuses.add(p.status);
          }
        });
      }

      // Default statuses if none found
      const defaultStatuses = ['registered', 'attended', 'cancelled'];
      const statusList = uniqueStatuses.size > 0 
        ? Array.from(uniqueStatuses).sort()
        : defaultStatuses;

      return { data: ['all', ...statusList], error: null };
    } catch (error) {
      console.error('Error fetching participant statuses:', error);
      return { data: ['all', 'registered', 'attended', 'cancelled'], error };
    }
  }
};
