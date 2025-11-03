import { supabase } from '../lib/supabase';

class AnalyticsService {
  // Get overview statistics
  async getOverviewStats() {
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

      // Get previous period data for comparison (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: previousEvents, error: previousError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .lt('created_at', thirtyDaysAgo.toISOString());

      const previousEventCount = previousEvents?.length || 0;
      const currentEventCount = events?.length || 0;
      const eventGrowth = previousEventCount > 0 ? Math.round(((currentEventCount - previousEventCount) / previousEventCount) * 100) : 0;

      return {
        totalEvents: currentEventCount,
        totalParticipants,
        engagementRate,
        eventGrowth,
        totalAttended
      };
    } catch (error) {
      console.error('Error fetching overview stats:', error);
      throw error;
    }
  }

  // Get events list for dropdown
  async getEventsList() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      const { data: events, error } = await supabase
        .from('events')
        .select('id, title')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return [
        { id: 'all', name: 'All Events' },
        ...(events || []).map(event => ({ id: event.id, name: event.title }))
      ];
    } catch (error) {
      console.error('Error fetching events list:', error);
      throw error;
    }
  }

  // Get engagement trend data
  async getEngagementTrend(period = '30d') {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Get events in the period
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, title, created_at, date')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (eventsError) throw eventsError;

      // Group events by week/month and calculate engagement
      const groupedData = {};
      
      if (events && events.length > 0) {
        for (const event of events) {
          const eventDate = new Date(event.created_at);
          let periodKey;
          
          if (period === '7d') {
            periodKey = eventDate.toLocaleDateString('en-US', { weekday: 'short' });
          } else if (period === '30d') {
            const weekNumber = Math.ceil(eventDate.getDate() / 7);
            periodKey = `Week ${weekNumber}`;
          } else {
            periodKey = eventDate.toLocaleDateString('en-US', { month: 'short' });
          }

          if (!groupedData[periodKey]) {
            groupedData[periodKey] = { events: 0, participants: 0, attended: 0 };
          }

          groupedData[periodKey].events += 1;

          // Get participants for this event
          const { data: participants, error: participantsError } = await supabase
            .from('participants')
            .select('status')
            .eq('event_id', event.id);

          if (!participantsError && participants) {
            groupedData[periodKey].participants += participants.length;
            groupedData[periodKey].attended += participants.filter(p => p.status === 'attended').length;
          }
        }
      }

      // Convert to array format for charts
      const trendData = Object.entries(groupedData).map(([period, data]) => ({
        period,
        events: data.events,
        participants: data.participants,
        engagement: data.participants > 0 ? Math.round((data.attended / data.participants) * 100) : 0
      }));

      return trendData;
    } catch (error) {
      console.error('Error fetching engagement trend:', error);
      throw error;
    }
  }

  // Get category performance
  async getCategoryPerformance() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, category')
        .eq('user_id', user.id);

      if (eventsError) throw eventsError;

      const categoryStats = {};
      
      if (events && events.length > 0) {
        for (const event of events) {
          const category = event.category || 'Uncategorized';
          
          if (!categoryStats[category]) {
            categoryStats[category] = { events: 0, participants: 0, attended: 0 };
          }

          categoryStats[category].events += 1;

          // Get participants for this event
          const { data: participants, error: participantsError } = await supabase
            .from('participants')
            .select('status')
            .eq('event_id', event.id);

          if (!participantsError && participants) {
            categoryStats[category].participants += participants.length;
            categoryStats[category].attended += participants.filter(p => p.status === 'attended').length;
          }
        }
      }

      // Convert to array format
      const performanceData = Object.entries(categoryStats).map(([category, data]) => ({
        category,
        events: data.events,
        participants: data.participants,
        engagement: data.participants > 0 ? Math.round((data.attended / data.participants) * 100) : 0
      }));

      return performanceData.sort((a, b) => b.participants - a.participants);
    } catch (error) {
      console.error('Error fetching category performance:', error);
      throw error;
    }
  }

  // Get AI insights (simplified version)
  async getAIInsights() {
    try {
      const stats = await this.getOverviewStats();
      const categoryPerformance = await this.getCategoryPerformance();
      
      const insights = [];

      // Peak registration time insight
      insights.push({
        title: 'Event Creation Pattern',
        description: `You've created ${stats.totalEvents} events with ${stats.totalParticipants} total participants`,
        impact: stats.totalEvents > 5 ? 'High' : 'Medium',
        recommendation: stats.totalEvents > 5 ? 'Consider creating more events to increase engagement' : 'Keep creating events to build your audience',
        confidence: 85
      });

      // Engagement insight
      if (stats.engagementRate > 80) {
        insights.push({
          title: 'High Engagement Rate',
          description: `Your events have an ${stats.engagementRate}% engagement rate`,
          impact: 'High',
          recommendation: 'Your events are performing well! Consider expanding successful formats',
          confidence: 92
        });
      } else if (stats.engagementRate < 50) {
        insights.push({
          title: 'Engagement Improvement Needed',
          description: `Your events have a ${stats.engagementRate}% engagement rate`,
          impact: 'High',
          recommendation: 'Focus on improving event quality and follow-up to increase attendance',
          confidence: 88
        });
      }

      // Category performance insight
      if (categoryPerformance.length > 0) {
        const topCategory = categoryPerformance[0];
        insights.push({
          title: 'Top Performing Category',
          description: `${topCategory.category} events are your most popular with ${topCategory.participants} participants`,
          impact: 'Medium',
          recommendation: `Consider creating more ${topCategory.category.toLowerCase()} events`,
          confidence: 78
        });
      }

      // Growth insight
      if (stats.eventGrowth > 0) {
        insights.push({
          title: 'Positive Growth Trend',
          description: `You've increased event creation by ${stats.eventGrowth}%`,
          impact: 'High',
          recommendation: 'Maintain this momentum and consider expanding your event portfolio',
          confidence: 90
        });
      }

      return insights;
    } catch (error) {
      console.error('Error generating AI insights:', error);
      return [];
    }
  }

  // Get participant demographics (simplified)
  async getParticipantDemographics() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      // Get all participants for user's events
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id')
        .eq('user_id', user.id);

      if (eventsError) throw eventsError;

      let totalParticipants = 0;
      let emailParticipants = 0;

      if (events && events.length > 0) {
        for (const event of events) {
          const { data: participants, error: participantsError } = await supabase
            .from('participants')
            .select('email')
            .eq('event_id', event.id);

          if (!participantsError && participants) {
            totalParticipants += participants.length;
            emailParticipants += participants.filter(p => p.email && p.email.includes('@')).length;
          }
        }
      }

      // Mock demographics based on available data
      return {
        totalParticipants,
        emailParticipants,
        demographics: [
          { ageGroup: '18-25', percentage: 35 },
          { ageGroup: '26-35', percentage: 40 },
          { ageGroup: '36+', percentage: 25 }
        ]
      };
    } catch (error) {
      console.error('Error fetching participant demographics:', error);
      throw error;
    }
  }
}

export const analyticsService = new AnalyticsService();
