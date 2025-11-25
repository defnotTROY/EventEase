import { supabase } from '../lib/supabase';

export const statusService = {
  // Calculate event status based on current date and event dates
  calculateEventStatus(event) {
    const now = new Date();
    const eventDate = new Date(event.date);
    
    // If no time is provided, default to start of day
    let eventStart = new Date(eventDate);
    eventStart.setHours(0, 0, 0, 0);
    
    if (event.time) {
      // Parse event time (assuming format like "9:00 AM - 6:00 PM" or "14:00")
      const startTime = this.parseTime(event.time);
      
      // Create start datetime
      eventStart = new Date(eventDate);
      eventStart.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
    }
    
    // Default to 2-hour duration
    const eventEnd = new Date(eventStart);
    eventEnd.setHours(eventStart.getHours() + 2);
    
    // Determine status based on current time
    if (event.status === 'cancelled') {
      return 'cancelled';
    }
    
    if (now < eventStart) {
      return 'upcoming';
    } else if (now >= eventStart && now <= eventEnd) {
      return 'ongoing';
    } else {
      return 'completed';
    }
  },

  // Enhanced time parsing to handle more formats
  parseTime(timeString) {
    const time = new Date();
    
    if (!timeString) {
      return time;
    }
    
    // Handle different time formats
    if (timeString.includes('AM') || timeString.includes('PM')) {
      // 12-hour format: "9:00 AM", "2:30 PM", etc.
      const [timePart, period] = timeString.split(' ');
      const [hours, minutes] = timePart.split(':').map(Number);
      
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) {
        hour24 += 12;
      } else if (period === 'AM' && hours === 12) {
        hour24 = 0;
      }
      
      time.setHours(hour24, minutes || 0);
    } else if (timeString.includes(':')) {
      // 24-hour format: "09:00", "14:30", etc.
      const [hours, minutes] = timeString.split(':').map(Number);
      time.setHours(hours, minutes || 0);
    } else if (timeString.includes('-')) {
      // Time range format: "9:00 AM - 6:00 PM" - use start time
      const startTime = timeString.split(' - ')[0].trim();
      return this.parseTime(startTime);
    } else {
      // Try to parse as a number (hours)
      const hours = parseInt(timeString);
      if (!isNaN(hours)) {
        time.setHours(hours, 0);
      }
    }
    
    return time;
  },

  // Update event status in database
  async updateEventStatus(eventId, newStatus) {
    try {
      console.log('StatusService: Updating event', eventId, 'to status', newStatus);
      
      // Validate inputs
      if (!eventId) {
        throw new Error('Event ID is required');
      }
      if (!newStatus || !['upcoming', 'ongoing', 'completed', 'cancelled'].includes(newStatus)) {
        throw new Error('Invalid status provided');
      }
      
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      
      console.log('StatusService: User authenticated:', user.email);
      
      const { data, error } = await supabase
        .from('events')
        .update({ status: newStatus })
        .eq('id', eventId)
        .eq('user_id', user.id) // Ensure user owns the event
        .select()
        .single();

      if (error) {
        console.error('StatusService: Supabase error:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('Event not found or you do not have permission to update it');
      }
      
      console.log('StatusService: Update successful:', data);
      return { data, error: null };
    } catch (error) {
      console.error('StatusService: Error updating event status:', error);
      return { data: null, error };
    }
  },

  // Bulk update statuses for multiple events
  async bulkUpdateStatuses(eventIds, newStatus) {
    try {
      const { data, error } = await supabase
        .from('events')
        .update({ status: newStatus })
        .in('id', eventIds)
        .select();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error bulk updating event statuses:', error);
      return { data: null, error };
    }
  },

  // Auto-update all event statuses based on dates using database function
  async autoUpdateAllStatuses(userId = null) {
    try {
      // Call the database function to update all event statuses
      // This is more efficient than fetching and updating individually
      const { data, error } = await supabase.rpc('update_all_event_statuses');

      if (error) {
        console.error('Error calling update_all_event_statuses:', error);
        // Fallback to user-specific update if RPC fails
        if (userId) {
          return await this.autoUpdateUserEvents(userId);
        }
        throw error;
      }

      const updatedCount = data || 0;
      console.log(`StatusService: Updated ${updatedCount} event statuses via database function`);

      return { 
        data: { updated: updatedCount, total: updatedCount }, 
        error: null 
      };
    } catch (error) {
      console.error('Error auto-updating event statuses:', error);
      // Fallback to user-specific update if available
      if (userId) {
        return await this.autoUpdateUserEvents(userId);
      }
      return { data: null, error };
    }
  },

  // Fallback: Update events for a specific user (used if RPC fails)
  async autoUpdateUserEvents(userId) {
    try {
      // Get all events for the user
      const { data: events, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId);

      if (fetchError) throw fetchError;

      const updates = [];
      
      for (const event of events) {
        const calculatedStatus = this.calculateEventStatus(event);
        
        // Only update if status has changed
        if (calculatedStatus !== event.status) {
          updates.push({
            id: event.id,
            status: calculatedStatus
          });
        }
      }

      // Batch update all changed events
      if (updates.length > 0) {
        const { data, error } = await supabase
          .from('events')
          .upsert(updates.map(update => ({ id: update.id, status: update.status })));

        if (error) throw error;
      }

      return { 
        data: { updated: updates.length, total: events.length }, 
        error: null 
      };
    } catch (error) {
      console.error('Error auto-updating user event statuses:', error);
      return { data: null, error };
    }
  },

  // Get automation info
  getAutomationInfo() {
    return {
      enabled: true,
      method: 'database_trigger',
      frequency: 'real-time',
      description: 'Statuses update automatically based on event dates and times',
      lastUpdate: new Date().toISOString()
    };
  },

  // Get status options for dropdown
  getStatusOptions() {
    return [
      { value: 'upcoming', label: 'Upcoming', color: 'bg-blue-100 text-blue-800' },
      { value: 'ongoing', label: 'Ongoing', color: 'bg-green-100 text-green-800' },
      { value: 'completed', label: 'Completed', color: 'bg-gray-100 text-gray-800' },
      { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' }
    ];
  },

  // Get status color class
  getStatusColor(status) {
    const option = this.getStatusOptions().find(opt => opt.value === status);
    return option ? option.color : 'bg-gray-100 text-gray-800';
  }
};
