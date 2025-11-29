import { supabase } from '../lib/supabase';

/**
 * Conflict Detection Service
 * Prevents users from registering for multiple events with the same date and time
 */
class ConflictDetectionService {
  /**
   * Check if user has a conflicting registration (same date and time)
   * @param {string} userId - User ID
   * @param {string} eventId - Event ID to check
   * @returns {Promise<{hasConflict: boolean, conflictingEvent: Object|null, error: Error|null}>}
   */
  async checkForConflict(userId, eventId) {
    try {
      // Get the event details we're trying to register for
      const { data: targetEvent, error: eventError } = await supabase
        .from('events')
        .select('id, title, date, time, end_time')
        .eq('id', eventId)
        .single();

      if (eventError || !targetEvent) {
        return {
          hasConflict: false,
          conflictingEvent: null,
          error: eventError || new Error('Event not found')
        };
      }

      // If event doesn't have date/time, no conflict check needed
      if (!targetEvent.date || !targetEvent.time) {
        return {
          hasConflict: false,
          conflictingEvent: null,
          error: null
        };
      }

      // Get all events the user is registered for
      // Note: We fetch all and filter in JS to handle NULL status from older registrations
      const { data: allRegistrations, error: registrationsError } = await supabase
        .from('participants')
        .select(`
          event_id,
          status,
          events!inner(id, title, date, time, end_time, status)
        `)
        .eq('user_id', userId)
        .neq('event_id', eventId); // Exclude the current event

      if (registrationsError) {
        console.error('Error fetching user registrations:', registrationsError);
        return {
          hasConflict: false,
          conflictingEvent: null,
          error: registrationsError
        };
      }

      // Filter to only include active registrations (status is 'registered' or NULL)
      const userRegistrations = (allRegistrations || []).filter(r => 
        !r.status || r.status === 'registered'
      );

      if (userRegistrations.length === 0) {
        return {
          hasConflict: false,
          conflictingEvent: null,
          error: null
        };
      }

      // Normalize time format for comparison
      const normalizeTime = (timeString) => {
        if (!timeString) return null;
        // Convert various time formats to HH:MM
        // Handle formats like "14:30", "2:30 PM", "14:30:00", etc.
        const time = timeString.trim().toUpperCase();
        
        // If it's already in 24-hour format (HH:MM or HH:MM:SS)
        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(time)) {
          const [hours, minutes] = time.split(':');
          return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        }
        
        // Handle 12-hour format (e.g., "2:30 PM")
        const pmMatch = time.match(/(\d{1,2}):(\d{2})\s*PM/i);
        const amMatch = time.match(/(\d{1,2}):(\d{2})\s*AM/i);
        
        if (pmMatch) {
          let hours = parseInt(pmMatch[1]);
          if (hours !== 12) hours += 12;
          return `${hours.toString().padStart(2, '0')}:${pmMatch[2]}`;
        }
        
        if (amMatch) {
          let hours = parseInt(amMatch[1]);
          if (hours === 12) hours = 0;
          return `${hours.toString().padStart(2, '0')}:${amMatch[2]}`;
        }
        
        return null;
      };

      // Helper function to convert time string to minutes since midnight for comparison
      const timeToMinutes = (timeString) => {
        const normalized = normalizeTime(timeString);
        if (!normalized) return null;
        const [hours, minutes] = normalized.split(':').map(Number);
        return hours * 60 + minutes;
      };

      // Get target event time range
      const targetDate = targetEvent.date;
      const targetStartMinutes = timeToMinutes(targetEvent.time);
      let targetEndMinutes = targetEvent.end_time 
        ? timeToMinutes(targetEvent.end_time)
        : targetStartMinutes + 120; // Default 2 hours if no end time
      
      // Handle case where end time is 00:00 (midnight) or less than start time
      // This means the event ends at midnight (whole day event)
      if (targetEvent.end_time && (targetEndMinutes === 0 || targetEndMinutes <= targetStartMinutes)) {
        targetEndMinutes = 1440; // End of day (24:00 = 1440 minutes)
      }

      if (targetStartMinutes === null) {
        // Can't check conflicts without a valid start time
        return {
          hasConflict: false,
          conflictingEvent: null,
          error: null
        };
      }

      // Check each registered event for conflicts
      for (const registration of userRegistrations) {
        const event = registration.events;
        if (!event || !event.date || !event.time) continue;

        const eventDate = event.date;
        
        // Only check events on the same date
        if (eventDate !== targetDate) continue;

        const eventStartMinutes = timeToMinutes(event.time);
        let eventEndMinutes = event.end_time 
          ? timeToMinutes(event.end_time)
          : eventStartMinutes + 120; // Default 2 hours if no end time

        if (eventStartMinutes === null) continue;

        // Handle case where end time is 00:00 (midnight) or less than start time
        // This means the event ends at midnight (whole day event)
        if (event.end_time && (eventEndMinutes === 0 || eventEndMinutes <= eventStartMinutes)) {
          eventEndMinutes = 1440; // End of day (24:00 = 1440 minutes)
        }

        // Check if time ranges overlap
        // Two time ranges overlap if:
        // - targetStart < eventEnd AND targetEnd > eventStart
        const timeRangesOverlap = 
          targetStartMinutes < eventEndMinutes && 
          targetEndMinutes > eventStartMinutes;

        if (timeRangesOverlap) {
          return {
            hasConflict: true,
            conflictingEvent: {
              id: event.id,
              title: event.title,
              date: event.date,
              time: event.time,
              end_time: event.end_time
            },
            error: null
          };
        }
      }

      return {
        hasConflict: false,
        conflictingEvent: null,
        error: null
      };
    } catch (error) {
      console.error('Error checking for conflicts:', error);
      return {
        hasConflict: false,
        conflictingEvent: null,
        error: error
      };
    }
  }

  /**
   * Get all conflicting events for a user
   * @param {string} userId - User ID
   * @param {string} eventId - Event ID to check
   * @returns {Promise<Array>} Array of conflicting events
   */
  async getConflictingEvents(userId, eventId) {
    const { hasConflict, conflictingEvent } = await this.checkForConflict(userId, eventId);
    return hasConflict ? [conflictingEvent] : [];
  }

  /**
   * Format conflict message for display
   * @param {Object} conflictingEvent - Conflicting event object
   * @returns {string} Formatted error message
   */
  formatConflictMessage(conflictingEvent) {
    if (!conflictingEvent) {
      return 'You already have a registration for an event at this date and time.';
    }

    const eventDate = new Date(conflictingEvent.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Format time range for display
    const formatTime = (timeStr) => {
      if (!timeStr) return '';
      if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    const startTime = formatTime(conflictingEvent.time);
    const endTime = conflictingEvent.end_time ? formatTime(conflictingEvent.end_time) : null;
    const timeRange = endTime ? `${startTime} - ${endTime}` : startTime;

    return `You are already registered for "${conflictingEvent.title}" on ${eventDate} from ${timeRange}. You cannot register for overlapping events.`;
  }
}

export const conflictDetectionService = new ConflictDetectionService();

