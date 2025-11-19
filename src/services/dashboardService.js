import { supabase } from '../lib/supabase';

class DashboardService {
  // Get dashboard overview statistics
  async getDashboardStats() {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      // Get all events for the user
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id);

      if (eventsError) throw eventsError;

      // Calculate statistics
      const totalEvents = events?.length || 0;
      const upcomingEvents = events?.filter(e => e.status === 'upcoming').length || 0;
      const activeEvents = events?.filter(e => e.status === 'ongoing').length || 0;
      const completedEvents = events?.filter(e => e.status === 'completed').length || 0;

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
        .eq('user_id', user.id)
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

      const previousUpcomingEvents = previousEvents?.filter(e => e.status === 'upcoming').length || 0;
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
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  // Get upcoming events
  async getUpcomingEvents(limit = 5) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'upcoming')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(limit);

      if (eventsError) throw eventsError;

      // Get participant counts for each event
      const eventsWithParticipants = await Promise.all(
        (events || []).map(async (event) => {
          const { data: participants, error: participantsError } = await supabase
            .from('participants')
            .select('id')
            .eq('event_id', event.id);

          const participantCount = participantsError ? 0 : (participants?.length || 0);

          return {
            id: event.id,
            title: event.title,
            date: event.date,
            time: event.time,
            location: event.location,
            participants: participantCount,
            status: event.status,
            description: event.description,
            category: event.category
          };
        })
      );

      return eventsWithParticipants;
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

  // Get all events for the events tab
  async getAllEvents() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;

      // Get participant counts for each event
      const eventsWithParticipants = await Promise.all(
        (events || []).map(async (event) => {
          const { data: participants, error: participantsError } = await supabase
            .from('participants')
            .select('id')
            .eq('event_id', event.id);

          const participantCount = participantsError ? 0 : (participants?.length || 0);

          return {
            id: event.id,
            title: event.title,
            date: event.date,
            time: event.time,
            location: event.location,
            participants: participantCount,
            status: event.status,
            description: event.description,
            category: event.category,
            created_at: event.created_at
          };
        })
      );

      return eventsWithParticipants;
    } catch (error) {
      console.error('Error fetching all events:', error);
      throw error;
    }
  }

  // Get AI insights (non-AI version for dashboard)
  async getDashboardInsights() {
    try {
      const stats = await this.getDashboardStats();
      const upcomingEvents = await this.getUpcomingEvents(3);
      
      const insights = [];

      // Event creation insight
      if (stats.totalEvents > 0) {
        insights.push({
          title: 'Event Creation Pattern',
          description: `You've created ${stats.totalEvents} events with ${stats.totalParticipants} total participants`,
          recommendation: stats.totalEvents > 5 ? 'Consider creating more events to increase engagement' : 'Keep creating events to build your audience',
          icon: 'calendar'
        });
      }

      // Engagement insight
      if (stats.engagementRate > 80) {
        insights.push({
          title: 'High Engagement Rate',
          description: `Your events have an ${stats.engagementRate}% engagement rate`,
          recommendation: 'Your events are performing well! Consider expanding successful formats',
          icon: 'trending-up'
        });
      } else if (stats.engagementRate < 50 && stats.totalParticipants > 0) {
        insights.push({
          title: 'Engagement Improvement Needed',
          description: `Your events have a ${stats.engagementRate}% engagement rate`,
          recommendation: 'Focus on improving event quality and follow-up to increase attendance',
          icon: 'trending-up'
        });
      }

      // Upcoming events insight
      if (upcomingEvents.length > 0) {
        insights.push({
          title: 'Upcoming Events',
          description: `You have ${upcomingEvents.length} upcoming events scheduled`,
          recommendation: 'Prepare materials and send reminders to participants',
          icon: 'clock'
        });
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
