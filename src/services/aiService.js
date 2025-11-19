import { supabase } from '../lib/supabase';

class AIService {
  constructor() {
    this.apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    this.baseURL = 'https://api.openai.com/v1';
  }

  // Check if AI is properly configured
  isConfigured() {
    return !!this.apiKey;
  }

  // Generic AI API call
  async makeAIRequest(messages, model = 'gpt-3.5-turbo', temperature = 0.7) {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured. Please add REACT_APP_OPENAI_API_KEY to your environment variables.');
    }

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('AI API Error:', error);
      throw error;
    }
  }

  // 1. PERSONALIZED EVENT RECOMMENDATIONS
  async getPersonalizedRecommendations(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required for personalized recommendations');
      }

      // Get user's event history and preferences
      const { data: userEvents, error: userEventsError } = await supabase
        .from('events')
        .select(`
          id, title, description, category, tags, date, location,
          participants!inner(status)
        `)
        .eq('user_id', userId);

      if (userEventsError) throw userEventsError;

      // Get user's participant history
      const { data: userParticipations, error: participationsError } = await supabase
        .from('participants')
        .select(`
          event_id, status,
          events!inner(title, category, tags, description)
        `)
        .eq('user_id', userId);

      if (participationsError) throw participationsError;

      // Get all available events for recommendations
      const { data: allEvents, error: allEventsError } = await supabase
        .from('events')
        .select('id, title, description, category, tags, date, location, max_participants')
        .neq('user_id', userId) // Don't recommend user's own events
        .gte('date', new Date().toISOString().split('T')[0]); // Only future events

      if (allEventsError) throw allEventsError;

      // If no events available for recommendations, return empty result
      if (!allEvents || allEvents.length === 0) {
        return {
          recommendations: [],
          insights: "No events available for recommendations at this time. Check back later for new events!"
        };
      }

      // Prepare data for AI analysis
      const userProfile = {
        eventsCreated: userEvents?.length || 0,
        eventsAttended: userParticipations?.filter(p => p.status === 'attended').length || 0,
        favoriteCategories: this.extractCategories(userEvents),
        favoriteTags: this.extractTags(userEvents),
        participationHistory: userParticipations?.map(p => ({
          category: p.events?.category,
          tags: p.events?.tags,
          status: p.status
        })) || []
      };

      const availableEvents = allEvents?.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        category: event.category,
        tags: event.tags,
        date: event.date,
        location: event.location,
        maxParticipants: event.max_participants
      })) || [];

      // Create AI prompt for recommendations
      const prompt = `
        Analyze this user's event preferences and recommend 3-5 events they would be most interested in attending.
        
        User Profile:
        - Events Created: ${userProfile.eventsCreated}
        - Events Attended: ${userProfile.eventsAttended}
        - Favorite Categories: ${userProfile.favoriteCategories.join(', ')}
        - Favorite Tags: ${userProfile.favoriteTags.join(', ')}
        - Participation History: ${JSON.stringify(userProfile.participationHistory)}
        
        Available Events:
        ${availableEvents.map(event => `
          - ${event.title} (${event.category})
            Date: ${event.date}
            Location: ${event.location}
            Tags: ${event.tags?.join(', ') || 'None'}
            Description: ${event.description}
        `).join('\n')}
        
        Please provide:
        1. Top 3-5 event recommendations with reasoning
        2. Confidence score for each recommendation (1-10)
        3. Why each event matches their interests
        4. Any potential conflicts or considerations
        
        Format as JSON with this structure:
        {
          "recommendations": [
            {
              "eventId": "uuid",
              "title": "Event Title",
              "reason": "Why this event matches their interests",
              "confidence": 8,
              "matchFactors": ["category", "tags", "timing"]
            }
          ],
          "insights": "Overall insights about user preferences"
        }
      `;

      const aiResponse = await this.makeAIRequest([
        { role: 'system', content: 'You are an expert event recommendation AI that analyzes user preferences to suggest relevant events.' },
        { role: 'user', content: prompt }
      ]);

      return JSON.parse(aiResponse);
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      throw error;
    }
  }

  // 2. AUTOMATED SCHEDULING
  async generateOptimalSchedule(eventId, constraints = {}) {
    try {
      // Get event details
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      // Get participants
      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .eq('event_id', eventId);

      if (participantsError) throw participantsError;

      // Get similar events for pattern analysis
      const { data: similarEvents, error: similarError } = await supabase
        .from('events')
        .select('*')
        .eq('category', event.category)
        .neq('id', eventId)
        .limit(10);

      if (similarError) throw similarError;

      const prompt = `
        Create an optimal schedule for this event based on best practices and participant preferences.
        
        Event Details:
        - Title: ${event.title}
        - Description: ${event.description}
        - Category: ${event.category}
        - Date: ${event.date}
        - Time: ${event.time}
        - Duration: ${constraints.duration || '4 hours'}
        - Location: ${event.location}
        - Max Participants: ${event.max_participants}
        - Is Virtual: ${event.is_virtual}
        
        Participant Count: ${participants?.length || 0}
        
        Constraints:
        - Start Time: ${constraints.startTime || '9:00 AM'}
        - End Time: ${constraints.endTime || '5:00 PM'}
        - Break Duration: ${constraints.breakDuration || '15 minutes'}
        - Lunch Break: ${constraints.lunchBreak || '1 hour'}
        - Session Length: ${constraints.sessionLength || '45 minutes'}
        
        Similar Events Pattern:
        ${similarEvents?.map(e => `- ${e.title} (${e.time})`).join('\n') || 'None'}
        
        Please create a detailed schedule with:
        1. Welcome/Registration (15-30 min)
        2. Opening remarks (15-30 min)
        3. Main sessions/activities
        4. Breaks and networking
        5. Lunch (if applicable)
        6. Closing remarks (15-30 min)
        
        Format as JSON:
        {
          "schedule": [
            {
              "time": "09:00",
              "duration": 30,
              "activity": "Registration & Welcome",
              "description": "Check-in, networking, coffee",
              "type": "registration"
            }
          ],
          "totalDuration": 240,
          "recommendations": "Additional suggestions for improvement"
        }
      `;

      const aiResponse = await this.makeAIRequest([
        { role: 'system', content: 'You are an expert event scheduler that creates optimal timelines for events based on best practices and participant engagement.' },
        { role: 'user', content: prompt }
      ]);

      return JSON.parse(aiResponse);
    } catch (error) {
      console.error('Error generating schedule:', error);
      throw error;
    }
  }

  // 3. INTELLIGENT FEEDBACK ANALYSIS
  async analyzeFeedback(eventId) {
    try {
      // Get event details
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      // Get participants and their feedback (we'll simulate this since we don't have a feedback table yet)
      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .eq('event_id', eventId);

      if (participantsError) throw participantsError;

      // For now, we'll analyze based on attendance patterns and generate insights
      const attendedCount = participants?.filter(p => p.status === 'attended').length || 0;
      const attendanceRate = attendedCount / (participants?.length || 1);
      const registrationRate = participants?.length / (event.max_participants || 1);

      const prompt = `
        Analyze the feedback and performance data for this event and provide intelligent insights.
        
        Event Details:
        - Title: ${event.title}
        - Category: ${event.category}
        - Date: ${event.date}
        - Location: ${event.location}
        - Max Participants: ${event.max_participants}
        
        Performance Metrics:
        - Total Registrations: ${participants?.length || 0}
        - Attendance Rate: ${Math.round(attendanceRate * 100)}%
        - Registration Rate: ${Math.round(registrationRate * 100)}%
        - Participant Status: ${JSON.stringify(participants?.map(p => p.status))}
        
        Please analyze and provide:
        1. Overall event performance score (1-10)
        2. Key strengths and areas for improvement
        3. Sentiment analysis based on attendance patterns
        4. Recommendations for future similar events
        5. Participant engagement insights
        
        Format as JSON:
        {
          "performanceScore": 8,
          "strengths": ["High attendance rate", "Good registration numbers"],
          "improvements": ["Better time slot", "More engaging content"],
          "sentiment": "positive",
          "recommendations": [
            "Schedule similar events at the same time",
            "Consider expanding capacity"
          ],
          "engagementInsights": "Participants showed strong interest based on attendance patterns",
          "nextSteps": "Plan follow-up events in the same category"
        }
      `;

      const aiResponse = await this.makeAIRequest([
        { role: 'system', content: 'You are an expert event analyst that provides intelligent feedback analysis and recommendations for event improvement.' },
        { role: 'user', content: prompt }
      ]);

      const parsed = JSON.parse(aiResponse);

      return {
        ...parsed,
        metrics: {
          totalParticipants: participants?.length || 0,
          attendedCount,
          attendanceRate: Math.round(attendanceRate * 100),
          registrationRate: event.max_participants > 0
            ? Math.min(Math.round(registrationRate * 100), 100)
            : Math.round(registrationRate * 100)
        }
      };
    } catch (error) {
      console.error('Error analyzing feedback:', error);
      throw error;
    }
  }

  // Helper methods
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

  // 4. SMART EVENT OPTIMIZATION
  async optimizeEvent(eventId) {
    try {
      const analysis = await this.analyzeFeedback(eventId);
      const { data: event } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      const prompt = `
        Based on the feedback analysis, provide specific optimization recommendations for this event.
        
        Event: ${event.title}
        Analysis: ${JSON.stringify(analysis)}
        
        Provide actionable recommendations for:
        1. Timing optimization
        2. Content improvement
        3. Participant engagement
        4. Resource allocation
        5. Future event planning
        
        Format as JSON with specific, actionable recommendations.
      `;

      const aiResponse = await this.makeAIRequest([
        { role: 'system', content: 'You are an expert event optimization consultant that provides specific, actionable recommendations for improving events.' },
        { role: 'user', content: prompt }
      ]);

      return JSON.parse(aiResponse);
    } catch (error) {
      console.error('Error optimizing event:', error);
      throw error;
    }
  }
}

export const aiService = new AIService();
