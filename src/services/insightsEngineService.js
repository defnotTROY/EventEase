import { supabase } from '../lib/supabase';

/**
 * Rule-Based Insights Engine
 * No AI needed - just smart formulas and data analysis!
 */
class InsightsEngineService {
  constructor() {
    this.recommendationTemplates = this.getRecommendationTemplates();
    this.schedulingTemplates = this.getSchedulingTemplates();
    this.feedbackTemplates = this.getFeedbackTemplates();
  }

  // ===================================
  // 1. PERSONALIZED RECOMMENDATIONS (Rule-Based)
  // ===================================
  async getPersonalizedRecommendations(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required for personalized recommendations');
      }

      // Run all queries in parallel for faster loading
      const [userEventsResult, userParticipationsResult, allEventsResult] = await Promise.all([
        // Get user's created events (simplified query - no inner join needed)
        supabase
          .from('events')
          .select('id, title, description, category, tags, date, location')
          .eq('user_id', userId)
          .limit(50), // Limit to prevent slow queries
        
        // Get user's participant history (simplified query)
        supabase
          .from('participants')
          .select('event_id, status')
          .eq('user_id', userId)
          .limit(50), // Limit to prevent slow queries
        
        // Get all available events for recommendations
        supabase
          .from('events')
          .select('id, title, description, category, tags, date, location, max_participants')
          .neq('user_id', userId)
          .gte('date', new Date().toISOString().split('T')[0])
          .limit(100) // Limit to prevent slow queries with many events
      ]);

      const { data: userEvents, error: userEventsError } = userEventsResult;
      const { data: userParticipations, error: participationsError } = userParticipationsResult;
      const { data: allEvents, error: allEventsError } = allEventsResult;

      if (userEventsError) throw userEventsError;
      if (participationsError) throw participationsError;
      if (allEventsError) throw allEventsError;

      // Get event details for participations (if needed)
      let enrichedParticipations = [];
      if (userParticipations && userParticipations.length > 0) {
        const eventIds = userParticipations.map(p => p.event_id);
        const { data: participationEvents } = await supabase
          .from('events')
          .select('id, title, category, tags, description')
          .in('id', eventIds);
        
        enrichedParticipations = userParticipations.map(p => ({
          ...p,
          events: participationEvents?.find(e => e.id === p.event_id)
        }));
      }

      if (!allEvents || allEvents.length === 0) {
        return {
          recommendations: [],
          insights: "No events available for recommendations at this time. Check back later for new events!"
        };
      }

      // Extract user preferences (rule-based analysis)
      const userProfile = this.buildUserProfile(userEvents || [], enrichedParticipations || []);
      
      // Score and rank events
      const scoredEvents = allEvents.map(event => {
        const score = this.scoreEvent(event, userProfile);
        return { ...event, score };
      });

      // Get top recommendations
      const topRecommendations = scoredEvents
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(event => ({
          eventId: event.id,
          title: event.title,
          reason: this.generateRecommendationReason(event, userProfile),
          confidence: Math.min(Math.round((event.score / 100) * 10), 10),
          matchFactors: this.getMatchFactors(event, userProfile)
        }));

      return {
        recommendations: topRecommendations,
        insights: this.generateOverallInsights(userProfile)
      };
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      throw error;
    }
  }

  buildUserProfile(userEvents, userParticipations) {
    const categories = this.extractCategories(userEvents);
    const tags = this.extractTags(userEvents);
    
    // Calculate category preferences
    const categoryFrequency = {};
    userEvents?.forEach(e => {
      categoryFrequency[e.category] = (categoryFrequency[e.category] || 0) + 1;
    });
    
    const topCategory = Object.entries(categoryFrequency)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'General';

    // Calculate tag preferences
    const tagFrequency = {};
    tags?.forEach(tag => {
      tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
    });
    
    const topTags = Object.entries(tagFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag);

    return {
      eventsCreated: userEvents?.length || 0,
      eventsAttended: userParticipations?.filter(p => p.status === 'attended').length || 0,
      favoriteCategories: categories,
      favoriteTags: topTags,
      topCategory,
      participationHistory: userParticipations?.map(p => ({
        category: p.events?.category,
        tags: p.events?.tags,
        status: p.status
      })) || []
    };
  }

  scoreEvent(event, userProfile) {
    // For new users with no history, use popularity and recency scoring
    if (userProfile.eventsCreated === 0 && userProfile.eventsAttended === 0) {
      return this.scoreEventForNewUser(event);
    }

    let score = 50; // Base score

    // Category match (0-30 points)
    if (event.category === userProfile.topCategory) {
      score += 30;
    } else if (userProfile.favoriteCategories.includes(event.category)) {
      score += 15;
    }

    // Tag matches (0-20 points)
    const matchingTags = event.tags?.filter(tag => 
      userProfile.favoriteTags.includes(tag)
    ).length || 0;
    score += matchingTags * 5;

    // Proximity to past events (0-20 points)
    const recentDays = this.daysUntilEvent(event.date);
    if (recentDays <= 7) score += 20;
    else if (recentDays <= 30) score += 15;
    else if (recentDays <= 60) score += 10;

    // Popularity bonus (0-10 points)
    const fillRate = event.max_participants > 0 
      ? (event.max_participants / 100) * 10 
      : 5;
    score += fillRate;

    // Attendance history (0-20 points)
    const historicalAttendance = userProfile.eventsAttended > 0 
      ? Math.min((userProfile.eventsAttended / userProfile.eventsCreated) * 20, 20)
      : 5;
    score += historicalAttendance;

    return Math.min(score, 100);
  }

  scoreEventForNewUser(event) {
    // For new users, score based on:
    // 1. Event recency (closer dates = higher score)
    // 2. Event popularity (moderate fill rate = higher score)
    // 3. Diversity (mix of categories)
    
    let score = 30; // Base score for new users

    // Date proximity (0-40 points) - closer events get higher scores
    const recentDays = this.daysUntilEvent(event.date);
    if (recentDays <= 7) score += 40;
    else if (recentDays <= 14) score += 35;
    else if (recentDays <= 30) score += 30;
    else if (recentDays <= 60) score += 20;
    else if (recentDays <= 90) score += 10;

    // Popularity bonus (0-20 points) - moderate popularity is best
    if (event.max_participants > 0) {
      // Moderate capacity events (30-70% full) are more appealing
      const capacity = event.max_participants;
      if (capacity >= 50 && capacity <= 300) {
        score += 20; // Good size for networking
      } else if (capacity >= 300 && capacity <= 500) {
        score += 15; // Large events
      } else {
        score += 10; // Small or very large events
      }
    }

    // Category diversity bonus (0-10 points)
    // Popular categories get slight bonus for new users
    const popularCategories = ['Tech Summit', 'Networking', 'Workshop', 'Community Event'];
    if (popularCategories.includes(event.category)) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  generateRecommendationReason(event, userProfile) {
    const reasons = [];
    
    // For new users
    if (userProfile.eventsCreated === 0 && userProfile.eventsAttended === 0) {
      const recentDays = this.daysUntilEvent(event.date);
      if (recentDays <= 14) {
        reasons.push(`Happening soon`);
      }
      if (event.max_participants >= 50 && event.max_participants <= 300) {
        reasons.push(`Great networking opportunity`);
      }
      reasons.push(`Popular ${event.category.toLowerCase()} event`);
      return reasons.join(' - ') + '.';
    }
    
    // For users with history
    if (event.category === userProfile.topCategory) {
      reasons.push(`Similar to your favorite ${event.category.toLowerCase()} events`);
    }
    
    const matchingTags = event.tags?.filter(tag => 
      userProfile.favoriteTags.includes(tag)
    );
    if (matchingTags && matchingTags.length > 0) {
      reasons.push(`Matches your interests: ${matchingTags.join(', ')}`);
    }
    
    const recentDays = this.daysUntilEvent(event.date);
    if (recentDays <= 7) {
      reasons.push(`Happening soon - perfect timing!`);
    }
    
    if (reasons.length === 0) {
      reasons.push(`This ${event.category.toLowerCase()} event might interest you`);
    }
    
    return reasons.join('. ') + '.';
  }

  getMatchFactors(event, userProfile) {
    const factors = [];
    
    if (event.category === userProfile.topCategory) {
      factors.push('Category match');
    }
    
    const matchingTags = event.tags?.filter(tag => 
      userProfile.favoriteTags.includes(tag)
    ).length || 0;
    if (matchingTags > 0) {
      factors.push(`${matchingTags} tag${matchingTags > 1 ? 's' : ''} match`);
    }
    
    const recentDays = this.daysUntilEvent(event.date);
    if (recentDays <= 30) {
      factors.push('Upcoming soon');
    }
    
    return factors.length > 0 ? factors : ['General recommendation'];
  }

  generateOverallInsights(userProfile) {
    // For new users with no history
    if (userProfile.eventsCreated === 0 && userProfile.eventsAttended === 0) {
      return "Welcome! We've selected trending and upcoming events that might interest you. As you attend or create events, your recommendations will become more personalized!";
    }
    
    if (userProfile.eventsCreated === 0) {
      return "Start creating or attending events to get personalized recommendations!";
    }
    
    if (userProfile.favoriteCategories.length === 0) {
      return "Explore different event categories to discover your preferences!";
    }
    
    const tagsText = userProfile.favoriteTags.length > 0 
      ? `topics like ${userProfile.favoriteTags.slice(0, 2).join(' and ')}`
      : 'your interests';
    
    return `Based on your interest in ${userProfile.topCategory} events and ${tagsText}, we've curated these recommendations for you!`;
  }

  // ===================================
  // 2. AUTOMATED SCHEDULING (Rule-Based)
  // ===================================
  async generateOptimalSchedule(eventId, constraints = {}) {
    try {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .eq('event_id', eventId);

      if (participantsError) throw participantsError;

      // Generate schedule based on event type and best practices
      const schedule = this.buildSchedule(event, participants, constraints);
      const recommendations = this.getSchedulingRecommendations(event, participants);

      return {
        schedule,
        totalDuration: this.calculateTotalDuration(schedule),
        recommendations
      };
    } catch (error) {
      console.error('Error generating schedule:', error);
      throw error;
    }
  }

  buildSchedule(event, participants, constraints) {
    const schedule = [];
    const startTime = this.parseTime(constraints.startTime || '09:00');
    const duration = this.parseDuration(constraints.duration || '4 hours');
    const isWorkshop = event.category?.toLowerCase().includes('workshop') || 
                       event.category?.toLowerCase().includes('training');
    const isConference = event.category?.toLowerCase().includes('conference');
    
    // Welcome/Registration
    schedule.push({
      time: this.formatTime(startTime),
      duration: 15,
      activity: 'Registration & Welcome',
      description: 'Check-in, networking, coffee',
      type: 'registration'
    });

    // Opening remarks (longer for conferences)
    schedule.push({
      time: this.formatTime(startTime + 15),
      duration: isConference ? 30 : 15,
      activity: 'Opening Remarks',
      description: 'Introduction, housekeeping, agenda overview',
      type: 'presentation'
    });

    // Main content (varies by event type)
    const mainStart = startTime + (isConference ? 45 : 30);
    const sessionLength = constraints.sessionLength || (isWorkshop ? 90 : 45);
    
    if (isWorkshop) {
      // Workshop: longer sessions with breaks
      schedule.push({
        time: this.formatTime(mainStart),
        duration: sessionLength,
        activity: 'Main Session',
        description: 'Hands-on learning and activities',
        type: 'workshop'
      });
      
      schedule.push({
        time: this.formatTime(mainStart + sessionLength),
        duration: 15,
        activity: 'Break',
        description: 'Networking and refreshments',
        type: 'break'
      });
      
      schedule.push({
        time: this.formatTime(mainStart + sessionLength + 15),
        duration: sessionLength,
        activity: 'Continuation Session',
        description: 'Advanced topics and practice',
        type: 'workshop'
      });
    } else {
      // Regular event: shorter sessions
      for (let i = 0; i < 3; i++) {
        schedule.push({
          time: this.formatTime(mainStart + i * (sessionLength + 15)),
          duration: sessionLength,
          activity: `Session ${i + 1}`,
          description: 'Engaging content and discussion',
          type: 'session'
        });
        
        if (i < 2) {
          schedule.push({
            time: this.formatTime(mainStart + (i + 1) * sessionLength + i * 15),
            duration: 15,
            activity: 'Break',
            description: 'Networking and refreshments',
            type: 'break'
          });
        }
      }
    }

    // Lunch (for longer events)
    if (duration >= 6) {
      const lunchStart = this.parseTime(constraints.lunchStart || '12:30');
      schedule.push({
        time: this.formatTime(lunchStart),
        duration: 60,
        activity: 'Lunch Break',
        description: 'Networking lunch',
        type: 'break'
      });
    }

    // Closing remarks
    schedule.push({
      time: this.formatTime(startTime + duration - 15),
      duration: 15,
      activity: 'Closing Remarks',
      description: 'Summary, next steps, thank you',
      type: 'presentation'
    });

    return schedule;
  }

  getSchedulingRecommendations(event, participants) {
    const recommendations = [];
    const participantCount = participants?.length || 0;
    
    if (participantCount > 50) {
      recommendations.push('Consider having breakout rooms for better engagement');
    }
    
    if (event.is_virtual) {
      recommendations.push('Schedule 5-minute breaks between sessions to avoid screen fatigue');
    } else {
      recommendations.push('Ensure adequate time for networking and Q&A sessions');
    }
    
    if (participantCount < 10) {
      recommendations.push('Small group size allows for more interactive formats');
    }

    return recommendations.length > 0 ? recommendations : ['Schedule looks good for your event format!'];
  }

  // ===================================
  // 3. FEEDBACK ANALYSIS (Rule-Based)
  // ===================================
  async analyzeFeedback(eventId) {
    try {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .eq('event_id', eventId);

      if (participantsError) throw participantsError;

      // Calculate metrics
      const totalParticipants = participants?.length || 0;
      const attendedCount = participants?.filter(p => p.status === 'attended').length || 0;
      const attendanceRate = totalParticipants > 0 ? (attendedCount / totalParticipants) * 100 : 0;
      const registrationRate = event.max_participants > 0 
        ? (totalParticipants / event.max_participants) * 100 
        : 0;

      // Generate analysis
      const performanceScore = this.calculatePerformanceScore(attendanceRate, registrationRate, event);
      const strengths = this.identifyStrengths(attendanceRate, registrationRate, event, participants);
      const improvements = this.identifyImprovements(attendanceRate, registrationRate, event, participants);
      const sentiment = this.analyzeSentiment(attendanceRate, registrationRate);
      const recommendations = this.generateFeedbackRecommendations(attendanceRate, registrationRate, event);
      const engagementInsights = this.generateEngagementInsights(attendanceRate, registrationRate, event, participants);

      const metrics = {
        totalParticipants,
        attendedCount,
        attendanceRate: Math.round(attendanceRate),
        registrationRate: Math.min(Math.round(registrationRate), 100)
      };

      return {
        performanceScore,
        strengths,
        improvements,
        sentiment,
        recommendations,
        engagementInsights,
        nextSteps: this.generateNextSteps(event, attendanceRate, registrationRate),
        metrics
      };
    } catch (error) {
      console.error('Error analyzing feedback:', error);
      throw error;
    }
  }

  calculatePerformanceScore(attendanceRate, registrationRate, event) {
    let score = 50; // Base score

    // Attendance rate contribution (0-40 points)
    if (attendanceRate >= 90) score += 40;
    else if (attendanceRate >= 80) score += 35;
    else if (attendanceRate >= 70) score += 30;
    else if (attendanceRate >= 60) score += 20;
    else if (attendanceRate >= 50) score += 10;
    else if (attendanceRate >= 40) score += 5;

    // Registration rate contribution (0-30 points)
    if (registrationRate >= 100) score += 30;
    else if (registrationRate >= 90) score += 25;
    else if (registrationRate >= 80) score += 20;
    else if (registrationRate >= 70) score += 15;
    else if (registrationRate >= 60) score += 10;
    else if (registrationRate >= 50) score += 5;

    // Event completeness bonus (0-20 points)
    const eventQuality = this.assessEventQuality(event);
    score += eventQuality;

    return Math.min(Math.max(score, 1), 10);
  }

  identifyStrengths(attendanceRate, registrationRate, event, participants) {
    const strengths = [];

    if (attendanceRate >= 80) {
      strengths.push('Excellent attendance rate');
    } else if (attendanceRate >= 70) {
      strengths.push('Strong attendance rate');
    }

    if (registrationRate >= 90) {
      strengths.push('High registration numbers');
    } else if (registrationRate >= 80) {
      strengths.push('Good registration numbers');
    }

    if (event.category === 'Conference' || event.category === 'Workshop') {
      strengths.push('Professional event format');
    }

    const cancelRate = participants?.filter(p => p.status === 'cancelled').length || 0;
    const totalParticipants = participants?.length || 0;
    if (totalParticipants > 0 && (cancelRate / totalParticipants) < 0.1) {
      strengths.push('Low cancellation rate');
    }

    return strengths.length > 0 ? strengths : ['Event executed successfully'];
  }

  identifyImprovements(attendanceRate, registrationRate, event, participants) {
    const improvements = [];

    if (attendanceRate < 70) {
      improvements.push('Improve attendance rate through better follow-up');
    }

    if (registrationRate < 70 && event.max_participants > 0) {
      improvements.push('Increase marketing and promotion efforts');
    }

    const daysUntilEvent = this.daysUntilEvent(event.date);
    if (daysUntilEvent > 30) {
      improvements.push('Consider shorter lead time for events');
    }

    if (event.is_virtual && attendanceRate < 75) {
      improvements.push('Engage virtual attendees with interactive elements');
    }

    return improvements.length > 0 ? improvements : ['Continue current strategies'];
  }

  analyzeSentiment(attendanceRate, registrationRate) {
    if (attendanceRate >= 80 && registrationRate >= 80) {
      return 'very positive';
    } else if (attendanceRate >= 70 && registrationRate >= 70) {
      return 'positive';
    } else if (attendanceRate >= 60 && registrationRate >= 60) {
      return 'neutral';
    } else if (attendanceRate >= 50 || registrationRate >= 50) {
      return 'mixed';
    } else {
      return 'needs_improvement';
    }
  }

  generateFeedbackRecommendations(attendanceRate, registrationRate, event) {
    const recommendations = [];

    if (attendanceRate < 70) {
      recommendations.push('Send reminder emails 24-48 hours before the event');
      recommendations.push('Consider adjusting event timing or format');
    }

    if (registrationRate < 70 && event.max_participants > 0) {
      recommendations.push('Expand marketing channels and reach');
      recommendations.push('Adjust registration pricing if applicable');
    }

    if (attendanceRate >= 80 && registrationRate >= 90) {
      recommendations.push('Consider expanding event capacity for next time');
      recommendations.push('Plan follow-up events in the same category');
    }

    return recommendations.length > 0 ? recommendations : ['Maintain current event strategy'];
  }

  generateEngagementInsights(attendanceRate, registrationRate, event, participants) {
    if (attendanceRate >= 90) {
      return 'Exceptional participant engagement and interest in your event content';
    } else if (attendanceRate >= 80) {
      return 'Strong participant engagement with high commitment to attendance';
    } else if (attendanceRate >= 70) {
      return 'Good engagement levels with room for improvement in follow-up';
    } else if (attendanceRate >= 60) {
      return 'Moderate engagement - consider adjusting event timing or format';
    } else {
      return 'Engagement needs improvement - analyze barriers to attendance';
    }
  }

  generateNextSteps(event, attendanceRate, registrationRate) {
    if (attendanceRate >= 80) {
      return 'Plan similar events and expand your event portfolio';
    } else if (attendanceRate >= 70) {
      return 'Focus on improving follow-up and retention strategies';
    } else if (attendanceRate >= 50) {
      return 'Review event format, timing, and marketing approach';
    } else {
      return 'Conduct participant feedback survey to identify improvement areas';
    }
  }

  // ===================================
  // HELPER METHODS
  // ===================================

  assessEventQuality(event) {
    let qualityScore = 0;
    
    // Check event completeness
    if (event.title && event.title.length > 10) qualityScore += 5;
    if (event.description && event.description.length > 50) qualityScore += 5;
    if (event.category) qualityScore += 3;
    if (event.location || event.is_virtual) qualityScore += 3;
    if (event.max_participants > 0) qualityScore += 4;

    return qualityScore;
  }

  daysUntilEvent(eventDate) {
    const today = new Date();
    const event = new Date(eventDate);
    const diff = event - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  parseTime(timeString) {
    // Convert "09:00" to minutes
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }

  formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  parseDuration(durationString) {
    // Convert "4 hours" to minutes
    const match = durationString.match(/(\d+)\s*(hour|hr)/i);
    return match ? parseInt(match[1]) * 60 : 240;
  }

  calculateTotalDuration(schedule) {
    return schedule.reduce((total, item) => total + item.duration, 0);
  }

  extractCategories(events) {
    if (!events) return [];
    const categories = events.map(e => e.category).filter(Boolean);
    return [...new Set(categories)];
  }

  extractTags(events) {
    if (!events) return [];
    const allTags = events.flatMap(e => e.tags || []).filter(Boolean);
    return [...new Set(allTags)];
  }

  getRecommendationTemplates() {
    return {
      highMatch: "Perfect match for your interests",
      categoryMatch: "Similar to your favorite events",
      tagMatch: "Matches your preferred topics",
      timingMatch: "Happening soon - great timing"
    };
  }

  getSchedulingTemplates() {
    return {
      registration: "Check-in and welcome activities",
      break: "Networking and refreshments",
      workshop: "Hands-on learning session",
      session: "Engaging content presentation",
      presentation: "Keynote or presentation"
    };
  }

  getFeedbackTemplates() {
    return {
      excellent: "Outstanding event performance",
      good: "Solid event execution",
      average: "Room for improvement identified",
      poor: "Significant improvements needed"
    };
  }
}

export const insightsEngineService = new InsightsEngineService();

