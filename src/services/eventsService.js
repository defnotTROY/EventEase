import { supabase } from '../lib/supabase';
import { conflictDetectionService } from './conflictDetectionService';
import { notificationService } from './notificationService';

export const eventsService = {
  // Get all events for the current user
  async getEvents(userId) {
    try {
      // First, update all event statuses based on dates
      try {
        await supabase.rpc('update_all_event_statuses');
      } catch (updateError) {
        // Log but don't fail - status update is best effort
        console.warn('Could not update event statuses:', updateError);
      }

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
      // First, update all event statuses based on dates
      try {
        await supabase.rpc('update_all_event_statuses');
      } catch (updateError) {
        // Log but don't fail - status update is best effort
        console.warn('Could not update event statuses:', updateError);
      }

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
      // First, update all event statuses based on dates
      try {
        await supabase.rpc('update_all_event_statuses');
      } catch (updateError) {
        // Log but don't fail - status update is best effort
        console.warn('Could not update event statuses:', updateError);
      }

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
      // Get the old event data to detect changes
      const { data: oldEvent, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (fetchError) throw fetchError;

      // Update the event
      const { data: updatedEvent, error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;

      // Detect changes and notify participants
      if (oldEvent) {
        const changes = this.detectEventChanges(oldEvent, updatedEvent);
        if (changes.length > 0) {
          // Notify all participants about the changes (async, don't wait)
          this.notifyParticipantsOfEventUpdate(eventId, updatedEvent, changes)
            .catch(err => console.error('Error notifying participants:', err));
        }
      }

      return { data: updatedEvent, error: null };
    } catch (error) {
      console.error('Error updating event:', error);
      return { data: null, error };
    }
  },

  // Detect what changed in an event update
  detectEventChanges(oldEvent, newEvent) {
    const changes = [];
    const importantFields = [
      { key: 'title', label: 'Title' },
      { key: 'date', label: 'Date' },
      { key: 'time', label: 'Time' },
      { key: 'location', label: 'Location' },
      { key: 'description', label: 'Description' },
      { key: 'max_participants', label: 'Maximum Participants' },
      { key: 'is_virtual', label: 'Event Type' },
      { key: 'virtual_link', label: 'Virtual Link' },
      { key: 'status', label: 'Status' }
    ];

    importantFields.forEach(field => {
      const oldValue = oldEvent[field.key];
      const newValue = newEvent[field.key];

      // Handle special cases
      if (field.key === 'is_virtual') {
        if (oldValue !== newValue) {
          changes.push({
            field: field.label,
            oldValue: oldValue ? 'Virtual' : 'In-person',
            newValue: newValue ? 'Virtual' : 'In-person'
          });
        }
      } else if (field.key === 'date') {
        if (oldValue !== newValue) {
          const oldDate = new Date(oldValue).toLocaleDateString();
          const newDate = new Date(newValue).toLocaleDateString();
          changes.push({
            field: field.label,
            oldValue: oldDate,
            newValue: newDate
          });
        }
      } else if (oldValue !== newValue && (oldValue || newValue)) {
        changes.push({
          field: field.label,
          oldValue: oldValue || 'Not set',
          newValue: newValue || 'Not set'
        });
      }
    });

    return changes;
  },

  // Notify all participants about event updates
  async notifyParticipantsOfEventUpdate(eventId, event, changes) {
    try {
      // Get all participants for this event
      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select('user_id, email, first_name, last_name')
        .eq('event_id', eventId)
        .eq('status', 'registered'); // Only notify active registrations

      if (participantsError) {
        console.error('Error fetching participants:', participantsError);
        return;
      }

      if (!participants || participants.length === 0) {
        return; // No participants to notify
      }

      // Format changes message
      const changesList = changes.map(change => 
        `• ${change.field}: ${change.oldValue} → ${change.newValue}`
      ).join('\n');

      const notificationTitle = `Event Updated: ${event.title}`;
      const notificationMessage = `The event "${event.title}" has been updated:\n\n${changesList}\n\nPlease review the changes.`;

      // Create notifications for all participants
      const notifications = participants.map(participant => ({
        user_id: participant.user_id,
        type: 'event_update',
        title: notificationTitle,
        message: notificationMessage,
        priority: 'high',
        action_url: `/events/${eventId}`,
        metadata: {
          event_id: eventId,
          event_title: event.title,
          changes: changes,
          updated_at: new Date().toISOString()
        }
      }));

      // Insert all notifications in batch
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        console.error('Error creating notifications:', notificationError);
      } else {
        console.log(`✅ Notified ${participants.length} participants about event update`);
      }
    } catch (error) {
      console.error('Error notifying participants:', error);
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

      // Check for scheduling conflicts (same date and time)
      const conflictCheck = await conflictDetectionService.checkForConflict(user.id, eventId);
      
      if (conflictCheck.error) {
        console.error('Error checking for conflicts:', conflictCheck.error);
        // Don't block registration if conflict check fails, but log it
      }
      
      if (conflictCheck.hasConflict) {
        const errorMessage = conflictDetectionService.formatConflictMessage(conflictCheck.conflictingEvent);
        throw new Error(errorMessage);
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
      if (!userId) {
        throw new Error('User ID is required to update participant status');
      }

      const updateData = { status: newStatus };
      
      // If setting status to 'attended', also set checked_in_at timestamp
      if (newStatus === 'attended') {
        updateData.checked_in_at = new Date().toISOString();
      }
      
      // First check if participant exists
      const { data: existingParticipant, error: checkError } = await supabase
        .from('participants')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (!existingParticipant) {
        throw new Error('Participant not found for this event');
      }

      // Update the participant
      const { data, error } = await supabase
        .from('participants')
        .update(updateData)
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .select();

      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('Failed to update participant status - no rows affected');
      }

      // Return the first (and should be only) updated participant
      return { data: data[0], error: null };
    } catch (error) {
      console.error('Error updating participant status:', error);
      return { data: null, error };
    }
  },

  // Update participant status by participant ID (for manual check-ins)
  async updateParticipantStatusById(participantId, newStatus) {
    try {
      const updateData = { status: newStatus };
      
      // If setting status to 'attended', also set checked_in_at timestamp
      if (newStatus === 'attended') {
        updateData.checked_in_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('participants')
        .update(updateData)
        .eq('id', participantId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating participant status by ID:', error);
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
