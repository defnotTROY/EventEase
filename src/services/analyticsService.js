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
        ? Math.round(((currentEventCount - previousEventCount) / previousEventCount) * 100)
        : null;

      const participantGrowth = previousParticipants > 0
        ? Math.round(((totalParticipants - previousParticipants) / previousParticipants) * 100)
        : null;

      const engagementChange = previousEngagementRate !== null
        ? engagementRate - previousEngagementRate
        : null;

      const upcomingEvents = events?.filter(e => e.status === 'upcoming').length || 0;
      const previousUpcomingEvents = previousEvents?.filter(e => e.status === 'upcoming').length || 0;
      const upcomingChange = previousUpcomingEvents > 0
        ? Math.round(((upcomingEvents - previousUpcomingEvents) / previousUpcomingEvents) * 100)
        : null;

      const cards = [
        {
          id: 'total-events',
          label: 'Total Events',
          value: currentEventCount.toString(),
          changeValue: eventGrowth,
          changeUnit: '%',
          icon: 'Calendar',
          iconBackgroundClass: 'bg-blue-100',
          iconColorClass: 'text-blue-600'
        },
        {
          id: 'total-participants',
          label: 'Total Participants',
          value: totalParticipants.toLocaleString(),
          changeValue: participantGrowth,
          changeUnit: '%',
          icon: 'Users',
          iconBackgroundClass: 'bg-green-100',
          iconColorClass: 'text-green-600'
        },
        {
          id: 'engagement-rate',
          label: 'Engagement Rate',
          value: `${engagementRate}%`,
          changeValue: engagementChange,
          changeUnit: 'pp',
          icon: 'TrendingUp',
          iconBackgroundClass: 'bg-purple-100',
          iconColorClass: 'text-purple-600'
        },
        {
          id: 'upcoming-events',
          label: 'Upcoming Events',
          value: upcomingEvents.toString(),
          changeValue: upcomingChange,
          changeUnit: '%',
          icon: 'Activity',
          iconBackgroundClass: 'bg-orange-100',
          iconColorClass: 'text-orange-600'
        }
      ];

      return {
        totalEvents: currentEventCount,
        totalParticipants,
        engagementRate,
        eventGrowth,
        participantGrowth,
        engagementChange,
        upcomingEvents,
        upcomingChange,
        totalAttended,
        cards
      };
    } catch (error) {
      console.error('Error fetching overview stats:', error);
      throw error;
    }
  }

  // Get available periods for analytics filtering based on event history
  async getAvailablePeriods() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('date')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (eventsError) throw eventsError;

      const defaultPeriods = [
        { id: '7d', name: 'Last 7 days' },
        { id: '30d', name: 'Last 30 days' },
        { id: '90d', name: 'Last 90 days' },
        { id: '1y', name: 'Last year' }
      ];

      if (!events || events.length === 0) {
        return defaultPeriods;
      }

      const firstEventDate = events.reduce((earliest, event) => {
        if (!event.date) return earliest;
        const eventDate = new Date(event.date);
        if (!earliest || eventDate < earliest) {
          return eventDate;
        }
        return earliest;
      }, null);

      if (!firstEventDate) {
        return defaultPeriods;
      }

      const now = new Date();
      const daysOfHistory = Math.floor((now - firstEventDate) / (1000 * 60 * 60 * 24));

      const periods = [
        { id: '7d', name: 'Last 7 days', requiredDays: 7 },
        { id: '30d', name: 'Last 30 days', requiredDays: 30 },
        { id: '90d', name: 'Last 90 days', requiredDays: 90 },
        { id: '1y', name: 'Last year', requiredDays: 365 }
      ];

      const available = periods.filter(period => daysOfHistory >= period.requiredDays / 2);

      return available.length > 0 ? available.map(({ id, name }) => ({ id, name })) : defaultPeriods;
    } catch (error) {
      console.error('Error fetching available periods:', error);
      return [
        { id: '7d', name: 'Last 7 days' },
        { id: '30d', name: 'Last 30 days' },
        { id: '90d', name: 'Last 90 days' },
        { id: '1y', name: 'Last year' }
      ];
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

  // Generate contextual recommendation based on metrics
  _generateRecommendation(type, data) {
    const recommendations = {
      eventCount: {
        low: (count) => `You've created ${count} event${count !== 1 ? 's' : ''}. Keep creating events to build your audience and increase engagement.`,
        medium: (count) => `You have ${count} events. Consider diversifying your event types to reach a broader audience.`,
        high: (count) => `You've created ${count} events! Consider focusing on quality over quantity and analyzing which formats perform best.`
      },
      engagement: {
        excellent: (rate) => `Your events have an excellent ${rate}% engagement rate! Your audience is highly engaged. Consider expanding successful formats and increasing event frequency.`,
        good: (rate) => `Your events have a good ${rate}% engagement rate. Focus on maintaining quality and consider adding interactive elements to boost participation.`,
        needsImprovement: (rate) => `Your events have a ${rate}% engagement rate. Focus on improving event quality, better promotion, and follow-up communication to increase attendance.`
      },
      category: {
        single: (category, participants) => `Your ${category} events are performing well with ${participants} participants. Consider creating more ${category.toLowerCase()} events or exploring similar categories.`,
        multiple: (topCategory, secondCategory) => `Your top categories are ${topCategory.category} and ${secondCategory.category}. Consider creating events that combine elements from both to maximize engagement.`
      },
      growth: {
        positive: (growth) => `You've increased event creation by ${growth}%. Maintain this momentum by analyzing what's working and scaling successful event formats.`,
        stable: () => `Your event creation is stable. Consider experimenting with new event types or increasing promotion to drive growth.`,
        negative: (decline) => `Event creation has decreased by ${Math.abs(decline)}%. Review your event strategy and consider what changes might help re-engage your audience.`
      }
    };

    switch (type) {
      case 'eventCount':
        if (data.count < 3) return recommendations.eventCount.low(data.count);
        if (data.count < 10) return recommendations.eventCount.medium(data.count);
        return recommendations.eventCount.high(data.count);
      
      case 'engagement':
        if (data.rate >= 80) return recommendations.engagement.excellent(data.rate);
        if (data.rate >= 50) return recommendations.engagement.good(data.rate);
        return recommendations.engagement.needsImprovement(data.rate);
      
      case 'category':
        if (data.secondCategory) {
          return recommendations.category.multiple(data.topCategory, data.secondCategory);
        }
        return recommendations.category.single(data.topCategory.category, data.topCategory.participants);
      
      case 'growth':
        if (data.growth > 10) return recommendations.growth.positive(data.growth);
        if (data.growth < -5) return recommendations.growth.negative(data.growth);
        return recommendations.growth.stable();
      
      default:
        return 'Continue monitoring your event performance and adjust your strategy based on data insights.';
    }
  }

  // Get AI insights (simplified version)
  async getAIInsights() {
    try {
      const stats = await this.getOverviewStats();
      const categoryPerformance = await this.getCategoryPerformance();
      
      const insights = [];

      // Event creation pattern insight with contextual recommendation
      insights.push({
        title: 'Event Creation Pattern',
        description: `You've created ${stats.totalEvents} event${stats.totalEvents !== 1 ? 's' : ''} with ${stats.totalParticipants} total participant${stats.totalParticipants !== 1 ? 's' : ''}`,
        impact: stats.totalEvents > 5 ? 'High' : stats.totalEvents > 2 ? 'Medium' : 'Low',
        recommendation: this._generateRecommendation('eventCount', { count: stats.totalEvents }),
        confidence: 85
      });

      // Engagement insight with contextual recommendations
      if (stats.engagementRate !== null && stats.engagementRate !== undefined) {
        insights.push({
          title: stats.engagementRate >= 80 ? 'High Engagement Rate' : stats.engagementRate < 50 ? 'Engagement Improvement Needed' : 'Good Engagement Rate',
          description: `Your events have a ${stats.engagementRate}% engagement rate`,
          impact: stats.engagementRate >= 80 ? 'High' : stats.engagementRate < 50 ? 'High' : 'Medium',
          recommendation: this._generateRecommendation('engagement', { rate: stats.engagementRate }),
          confidence: stats.engagementRate >= 80 ? 92 : stats.engagementRate < 50 ? 88 : 85
        });
      }

      // Category performance insight with contextual recommendations
      if (categoryPerformance.length > 0) {
        const topCategory = categoryPerformance[0];
        const secondCategory = categoryPerformance.length > 1 ? categoryPerformance[1] : null;
        
        insights.push({
          title: categoryPerformance.length > 1 ? 'Top Performing Categories' : 'Top Performing Category',
          description: secondCategory 
            ? `${topCategory.category} events lead with ${topCategory.participants} participants, followed by ${secondCategory.category} with ${secondCategory.participants}`
            : `${topCategory.category} events are your most popular with ${topCategory.participants} participant${topCategory.participants !== 1 ? 's' : ''}`,
          impact: 'Medium',
          recommendation: this._generateRecommendation('category', { topCategory, secondCategory }),
          confidence: 78
        });
      }

      // Growth insight with contextual recommendations
      if (stats.eventGrowth !== null && stats.eventGrowth !== undefined) {
        insights.push({
          title: stats.eventGrowth > 10 ? 'Strong Growth Trend' : stats.eventGrowth > 0 ? 'Positive Growth Trend' : stats.eventGrowth < 0 ? 'Growth Decline' : 'Stable Growth',
          description: stats.eventGrowth > 0 
            ? `You've increased event creation by ${stats.eventGrowth}%`
            : stats.eventGrowth < 0
            ? `Event creation has decreased by ${Math.abs(stats.eventGrowth)}%`
            : 'Your event creation rate is stable',
          impact: Math.abs(stats.eventGrowth) > 10 ? 'High' : Math.abs(stats.eventGrowth) > 0 ? 'Medium' : 'Low',
          recommendation: this._generateRecommendation('growth', { growth: stats.eventGrowth }),
          confidence: Math.abs(stats.eventGrowth) > 10 ? 90 : 75
        });
      }

      return insights;
    } catch (error) {
      console.error('Error generating AI insights:', error);
      return [];
    }
  }

  // Get participant demographics (real data from age field)
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
      const ageGroups = {
        '18-25': 0,
        '26-35': 0,
        '36-50': 0,
        '51+': 0
      };

      if (events && events.length > 0) {
        for (const event of events) {
          const { data: participants, error: participantsError } = await supabase
            .from('participants')
            .select('email, age')
            .eq('event_id', event.id);

          if (!participantsError && participants) {
            totalParticipants += participants.length;
            emailParticipants += participants.filter(p => p.email && p.email.includes('@')).length;
            
            // Categorize by age
            participants.forEach(p => {
              if (p.age) {
                if (p.age >= 18 && p.age <= 25) ageGroups['18-25']++;
                else if (p.age >= 26 && p.age <= 35) ageGroups['26-35']++;
                else if (p.age >= 36 && p.age <= 50) ageGroups['36-50']++;
                else if (p.age >= 51) ageGroups['51+']++;
              }
            });
          }
        }
      }

      // Calculate percentages
      const participantsWithAge = Object.values(ageGroups).reduce((sum, count) => sum + count, 0);
      
      // If no age data, return empty demographics
      if (participantsWithAge === 0) {
        return {
          totalParticipants,
          emailParticipants,
          demographics: [],
          hasData: false
        };
      }

      const demographics = [
        { ageGroup: '18-25', count: ageGroups['18-25'], percentage: Math.round((ageGroups['18-25'] / participantsWithAge) * 100) },
        { ageGroup: '26-35', count: ageGroups['26-35'], percentage: Math.round((ageGroups['26-35'] / participantsWithAge) * 100) },
        { ageGroup: '36-50', count: ageGroups['36-50'], percentage: Math.round((ageGroups['36-50'] / participantsWithAge) * 100) },
        { ageGroup: '51+', count: ageGroups['51+'], percentage: Math.round((ageGroups['51+'] / participantsWithAge) * 100) }
      ].filter(d => d.count > 0); // Only show groups with participants

      return {
        totalParticipants,
        emailParticipants,
        demographics,
        hasData: true
      };
    } catch (error) {
      console.error('Error fetching participant demographics:', error);
      throw error;
    }
  }

  // Get registration sources breakdown
  async getRegistrationSources() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      // Get all participants across user's events
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id')
        .eq('user_id', user.id);

      if (eventsError) throw eventsError;

      if (!events || events.length === 0) {
        return {
          sources: [],
          total: 0
        };
      }

      const eventIds = events.map(e => e.id);

      // Get all participants with registration sources
      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select('registration_source')
        .in('event_id', eventIds);

      if (participantsError) throw participantsError;

      const total = participants?.length || 0;
      
      // Count by source
      const sourceCounts = {};
      participants?.forEach(p => {
        const source = p.registration_source || 'website'; // default to website
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });

      // Format for display
      const sources = Object.entries(sourceCounts).map(([source, count]) => ({
        source: this.formatSourceName(source),
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }));

      return {
        sources: sources.sort((a, b) => b.count - a.count),
        total
      };
    } catch (error) {
      console.error('Error fetching registration sources:', error);
      throw error;
    }
  }

  // Get event satisfaction ratings
  async getEventSatisfaction() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id')
        .eq('user_id', user.id);

      if (eventsError) throw eventsError;

      if (!events || events.length === 0) {
        return {
          averageRating: 0,
          totalRatings: 0,
          distribution: [],
          isEmpty: true
        };
      }

      const eventIds = events.map(e => e.id);

      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select('rating')
        .in('event_id', eventIds)
        .not('rating', 'is', null);

      if (participantsError) throw participantsError;

      const totalRatings = participants?.length || 0;

      if (totalRatings === 0) {
        return {
          averageRating: 0,
          totalRatings: 0,
          distribution: [],
          isEmpty: true
        };
      }

      // Calculate average rating
      const sum = participants?.reduce((acc, p) => acc + (p.rating || 0), 0) || 0;
      const averageRating = Math.round((sum / totalRatings) * 100) / 100;

      // Distribution by rating
      const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      participants?.forEach(p => {
        const rating = p.rating;
        if (rating >= 1 && rating <= 5) {
          ratingCounts[rating] = (ratingCounts[rating] || 0) + 1;
        }
      });

      const distribution = [
        { rating: 5, count: ratingCounts[5], percentage: Math.round((ratingCounts[5] / totalRatings) * 100) },
        { rating: 4, count: ratingCounts[4], percentage: Math.round((ratingCounts[4] / totalRatings) * 100) },
        { rating: 3, count: ratingCounts[3], percentage: Math.round((ratingCounts[3] / totalRatings) * 100) },
        { rating: 2, count: ratingCounts[2], percentage: Math.round((ratingCounts[2] / totalRatings) * 100) },
        { rating: 1, count: ratingCounts[1], percentage: Math.round((ratingCounts[1] / totalRatings) * 100) }
      ];

      return {
        averageRating,
        totalRatings,
        distribution,
        isEmpty: false
      };
    } catch (error) {
      console.error('Error fetching event satisfaction:', error);
      throw error;
    }
  }

  // Helper: format source name for display
  formatSourceName(source) {
    const sourceMap = {
      'website': 'Direct Website',
      'social-media': 'Social Media',
      'email': 'Email Marketing',
      'referral': 'Referral',
      'direct': 'Direct',
      'other': 'Other'
    };
    return sourceMap[source] || source.charAt(0).toUpperCase() + source.slice(1);
  }
}

export const analyticsService = new AnalyticsService();
