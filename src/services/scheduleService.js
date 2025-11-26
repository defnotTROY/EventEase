import { supabase } from '../lib/supabase';

/**
 * Schedule Service
 * Fetches schedules for users:
 * - Regular users: Events they're registered for
 * - Organizers/Admins: Events they created/manage
 */
class ScheduleService {
  /**
   * Get user's schedule based on their role
   * @param {string} userId - User ID
   * @param {string} userRole - User role (user, organizer, admin)
   * @returns {Promise<Array>} Array of scheduled events
   */
  async getUserSchedule(userId, userRole) {
    try {
      // For organizers and admins: show events they created
      if (userRole === 'organizer' || userRole === 'Organizer' || 
          userRole === 'admin' || userRole === 'Administrator' || 
          userRole === 'Admin') {
        return await this.getOrganizerSchedule(userId);
      }
      
      // For regular users: show events they're registered for
      return await this.getUserRegisteredSchedule(userId);
    } catch (error) {
      console.error('Error fetching user schedule:', error);
      return [];
    }
  }

  /**
   * Get schedule for organizers (events they created)
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of events
   */
  async getOrganizerSchedule(userId) {
    try {
      // Get today's date in LOCAL timezone for filtering
      const todayStr = this.getLocalDateString();
      console.log('📅 Organizer schedule - Today (local):', todayStr);

      const { data: events, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          date,
          time,
          location,
          category,
          status,
          max_participants,
          is_virtual,
          virtual_link,
          created_at
        `)
        .eq('user_id', userId)
        .gte('date', todayStr) // Only events today or in the future
        .neq('status', 'cancelled') // Exclude cancelled events
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;

      console.log('📋 Events from DB (before filter):', events?.map(e => ({ title: e.title, date: e.date })));

      // Filter to only include events that are actually in the future (haven't ended)
      const futureEvents = (events || []).filter(event => {
        const isFuture = this.isEventInFuture(event);
        console.log(`  - ${event.title} (${event.date}): isFuture=${isFuture}`);
        return isFuture;
      });

      console.log('✅ Future events after filter:', futureEvents?.map(e => ({ title: e.title, date: e.date })));

      // Get participant counts for each event and calculate accurate status
      const eventsWithDetails = await Promise.all(
        futureEvents.map(async (event) => {
          const { data: participants } = await supabase
            .from('participants')
            .select('id')
            .eq('event_id', event.id);

          return {
            ...event,
            status: this.calculateAccurateStatus(event), // Use calculated status
            participant_count: participants?.length || 0,
            type: 'managed' // Indicates user manages this event
          };
        })
      );

      return eventsWithDetails;
    } catch (error) {
      console.error('Error fetching organizer schedule:', error);
      return [];
    }
  }

  /**
   * Get schedule for regular users (events they're registered for)
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of events
   */
  async getUserRegisteredSchedule(userId) {
    try {
      console.log('📅 Fetching schedule for user:', userId);
      
      // Get today's date in LOCAL timezone for filtering
      const todayStr = this.getLocalDateString();
      console.log('📅 User schedule - Today (local):', todayStr);
      
      // First, get all participant entries for this user
      const { data: participantEntries, error: partError } = await supabase
        .from('participants')
        .select('id, event_id, registration_date, status')
        .eq('user_id', userId);

      if (partError) {
        console.error('Error fetching participant entries:', partError);
        throw partError;
      }

      console.log('📋 Participant entries found:', participantEntries);

      if (!participantEntries || participantEntries.length === 0) {
        console.log('❌ No participant entries found for user');
        return [];
      }

      // Filter active registrations (status is 'registered' or NULL)
      const activeParticipants = participantEntries.filter(p => 
        !p.status || p.status === 'registered'
      );

      console.log('✅ Active participant entries:', activeParticipants);

      if (activeParticipants.length === 0) {
        console.log('❌ No active registrations found');
        return [];
      }

      // Get the event IDs
      const eventIds = activeParticipants.map(p => p.event_id);
      console.log('🎯 Event IDs to fetch:', eventIds);

      // Fetch the events - filter by date (today or future) instead of database status
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .in('id', eventIds)
        .gte('date', todayStr) // Only events today or in the future
        .neq('status', 'cancelled'); // Exclude cancelled events

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        throw eventsError;
      }

      console.log('📆 Events fetched:', events);

      if (!events || events.length === 0) {
        console.log('❌ No upcoming events found');
        return [];
      }

      // Filter to only include events that are actually in the future (double-check)
      const futureEvents = events.filter(event => this.isEventInFuture(event));

      console.log('📆 Future events after date check:', futureEvents);

      if (futureEvents.length === 0) {
        console.log('❌ No future events after date filtering');
        return [];
      }

      // Combine participant data with event data
      const schedule = futureEvents.map(event => {
        const participant = activeParticipants.find(p => p.event_id === event.id);
        return {
          ...event,
          status: this.calculateAccurateStatus(event), // Use calculated status
          registration_id: participant?.id,
          registration_date: participant?.registration_date,
          registration_status: participant?.status,
          participant_count: null,
          type: 'registered'
        };
      });

      // Sort by date and time
      schedule.sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time || '00:00'}`);
        const dateB = new Date(`${b.date} ${b.time || '00:00'}`);
        return dateA - dateB;
      });

      console.log('✨ Final schedule:', schedule);
      return schedule;
    } catch (error) {
      console.error('Error fetching user registered schedule:', error);
      return [];
    }
  }

  /**
   * Get schedule grouped by date
   * @param {Array} schedule - Array of events
   * @returns {Object} Events grouped by date
   */
  groupScheduleByDate(schedule) {
    const grouped = {};

    schedule.forEach(event => {
      if (!event.date) return;

      const dateKey = event.date; // Use date as key (YYYY-MM-DD format)
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      grouped[dateKey].push(event);
    });

    // Sort events within each date by time
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => {
        const timeA = a.time || '00:00';
        const timeB = b.time || '00:00';
        return timeA.localeCompare(timeB);
      });
    });

    return grouped;
  }

  /**
   * Format date for display
   * @param {string} dateString - Date string
   * @returns {string} Formatted date
   */
  formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }

    // Check if it's tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }

    // Format as weekday, month day
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Format time for display
   * @param {string} timeString - Time string
   * @returns {string} Formatted time
   */
  formatTime(timeString) {
    if (!timeString) return '';
    
    // If already in readable format, return as is
    if (timeString.includes('AM') || timeString.includes('PM')) {
      return timeString;
    }

    // Convert 24-hour to 12-hour format
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    
    return `${displayHour}:${minutes} ${ampm}`;
  }

  /**
   * Get today's date as a string in YYYY-MM-DD format (LOCAL timezone)
   * @returns {string} Today's date string
   */
  getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Check if an event is in the future (hasn't ended yet)
   * @param {Object} event - Event object with date and time
   * @returns {boolean} True if event hasn't ended yet
   */
  isEventInFuture(event) {
    const now = new Date();
    
    // Parse event date properly (add T00:00:00 to ensure local timezone parsing)
    const eventDateStr = event.date;
    const eventDate = new Date(eventDateStr + 'T00:00:00');
    
    // If event has a time, calculate when it ends (event + 2 hours)
    if (event.time) {
      const timeParts = event.time.match(/(\d+):(\d+)/);
      if (timeParts) {
        const eventStart = new Date(eventDateStr + 'T00:00:00');
        eventStart.setHours(parseInt(timeParts[1]), parseInt(timeParts[2]), 0, 0);
        
        // Event ends 2 hours after start
        const eventEnd = new Date(eventStart);
        eventEnd.setHours(eventEnd.getHours() + 2);
        
        // Event is "in future" if it hasn't ended yet
        return now < eventEnd;
      }
    }
    
    // No time specified - consider event "in future" until end of that day
    const endOfEventDay = new Date(eventDateStr + 'T23:59:59');
    return now <= endOfEventDay;
  }

  /**
   * Calculate accurate status based on current date/time
   * @param {Object} event - Event object
   * @returns {string} Accurate status: 'upcoming', 'ongoing', or 'completed'
   */
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
}

export const scheduleService = new ScheduleService();

