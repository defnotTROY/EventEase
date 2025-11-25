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
        .in('status', ['upcoming', 'ongoing']) // Only show upcoming and ongoing events
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;

      // Get participant counts for each event
      const eventsWithDetails = await Promise.all(
        (events || []).map(async (event) => {
          const { data: participants } = await supabase
            .from('participants')
            .select('id')
            .eq('event_id', event.id);

          return {
            ...event,
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
      // Get events user is registered for
      const { data: registrations, error } = await supabase
        .from('participants')
        .select(`
          id,
          registration_date,
          status,
          events!inner(
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
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'registered') // Only active registrations
        .in('events.status', ['upcoming', 'ongoing']); // Only upcoming/ongoing events

      if (error) throw error;

      // Format the data
      const schedule = (registrations || []).map(registration => ({
        ...registration.events,
        registration_id: registration.id,
        registration_date: registration.registration_date,
        registration_status: registration.status,
        participant_count: null, // Not needed for user view
        type: 'registered' // Indicates user is registered for this event
      }));

      // Sort by date and time
      schedule.sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time || '00:00'}`);
        const dateB = new Date(`${b.date} ${b.time || '00:00'}`);
        return dateA - dateB;
      });

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
}

export const scheduleService = new ScheduleService();

