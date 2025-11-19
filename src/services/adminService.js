import { supabase } from '../lib/supabase';

class AdminService {
  // Get total users count (combines all sources for accurate count)
  async getTotalUsers() {
    try {
      // Method 1: Try to call database function if it exists (MOST ACCURATE - counts from auth.users)
      try {
        const { data: rpcCount, error: rpcError } = await supabase
          .rpc('get_user_count');

        if (!rpcError && rpcCount !== null && typeof rpcCount === 'number' && rpcCount > 0) {
          console.log('✅ Using RPC function for accurate user count:', rpcCount);
          return rpcCount;
        }
      } catch (e) {
        console.log('RPC function not available, using aggregated count...');
      }

      // Method 2: Aggregate unique user_ids from all sources
      const userSet = new Set();

      // Get unique user_ids from events table (organizers who created events)
      try {
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select('user_id');

        if (!eventsError && events && events.length > 0) {
          events.forEach(e => {
            if (e.user_id) userSet.add(e.user_id);
          });
          console.log(`Found ${userSet.size} unique users from events table`);
        }
      } catch (e) {
        console.error('Error fetching users from events:', e);
      }

      // Get unique user_ids from participants table (if user_id column exists)
      try {
        // First, try to get participants with user_id
        const { data: participants, error: participantsError } = await supabase
          .from('participants')
          .select('user_id, email, name');

        if (!participantsError && participants && participants.length > 0) {
          // Check if user_id exists in the data
          const hasUserId = participants.some(p => p.user_id !== null && p.user_id !== undefined);
          
          if (hasUserId) {
            participants.forEach(p => {
              if (p.user_id) userSet.add(p.user_id);
            });
            console.log(`Found ${userSet.size} unique users (including from participants)`);
          } else {
            // If no user_id column, we can't track users from participants
            console.log('Participants table does not have user_id column');
          }
        }
      } catch (e) {
        console.error('Error fetching users from participants:', e);
      }

      // Try profiles table if it exists
      try {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id');

        if (!profilesError && profiles && profiles.length > 0) {
          profiles.forEach(p => {
            if (p.id) userSet.add(p.id);
          });
          console.log(`Found ${userSet.size} unique users (including from profiles)`);
        }
      } catch (e) {
        // Profiles table might not exist, that's okay
        console.log('Profiles table not accessible');
      }

      // Return the count of unique users found across all sources
      const totalCount = userSet.size;
      console.log(`📊 Total unique users found: ${totalCount}`);

      if (totalCount > 0) {
        return totalCount;
      }

      // If we got 0, log a warning
      console.warn('⚠️ No users found. Make sure you have events or participants in the database.');
      return 0;
    } catch (error) {
      console.error('❌ Error getting total users:', error);
      return 0;
    }
  }

  // Get recent registrations (users who signed up recently)
  async getRecentRegistrations(limit = 10) {
    try {
      // Get recent events and extract unique user_ids
      const { data: recentEvents, error } = await supabase
        .from('events')
        .select('user_id, created_at, title')
        .order('created_at', { ascending: false })
        .limit(limit * 2); // Get more to account for duplicates

      if (error) throw error;

      // Group by user_id and get most recent
      const userActivityMap = new Map();
      
      if (recentEvents) {
        recentEvents.forEach(event => {
          if (!userActivityMap.has(event.user_id) || 
              new Date(event.created_at) > new Date(userActivityMap.get(event.user_id).created_at)) {
            userActivityMap.set(event.user_id, {
              user_id: event.user_id,
              created_at: event.created_at,
              last_event: event.title
            });
          }
        });
      }

      // Sort by created_at and limit
      return Array.from(userActivityMap.values())
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting recent registrations:', error);
      return [];
    }
  }

  // Get recent activity feed
  async getRecentActivity(limit = 10) {
    try {
      const activities = [];

      // Get recent events
      const { data: recentEvents, error: eventsError } = await supabase
        .from('events')
        .select('id, title, status, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!eventsError && recentEvents) {
        recentEvents.forEach(event => {
          activities.push({
            id: `event-${event.id}`,
            type: event.status === 'completed' ? 'event_completed' : 'event_created',
            message: event.status === 'completed' 
              ? `Event completed: ${event.title}`
              : `New event created: ${event.title}`,
            time: this.formatTimeAgo(new Date(event.created_at)),
            timestamp: new Date(event.created_at),
            icon: event.status === 'completed' ? 'CheckCircle' : 'Calendar'
          });
        });
      }

      // Get recent participants
      const { data: recentParticipants, error: participantsError } = await supabase
        .from('participants')
        .select('id, event_id, name, email, created_at')
        .order('created_at', { ascending: false })
        .limit(limit * 2); // Get more to account for grouping

      if (!participantsError && recentParticipants) {
        // Get event titles for participants
        const eventIds = [...new Set(recentParticipants.map(p => p.event_id))];
        const { data: events } = await supabase
          .from('events')
          .select('id, title')
          .in('id', eventIds);

        const eventTitleMap = new Map();
        if (events) {
          events.forEach(e => eventTitleMap.set(e.id, e.title));
        }

        // Group participants by event
        const participantsByEvent = new Map();
        recentParticipants.forEach(p => {
          const eventId = p.event_id;
          const eventTitle = eventTitleMap.get(eventId) || 'Event';
          
          if (!participantsByEvent.has(eventId)) {
            participantsByEvent.set(eventId, {
              event_title: eventTitle,
              count: 0,
              timestamp: new Date(p.created_at)
            });
          }
          participantsByEvent.get(eventId).count++;
          // Update timestamp to most recent
          if (new Date(p.created_at) > participantsByEvent.get(eventId).timestamp) {
            participantsByEvent.get(eventId).timestamp = new Date(p.created_at);
          }
        });

        // Add participant activities
        participantsByEvent.forEach((info, eventId) => {
          activities.push({
            id: `participants-${eventId}`,
            type: 'participant_registered',
            message: `${info.count} new participant${info.count > 1 ? 's' : ''} registered for ${info.event_title}`,
            time: this.formatTimeAgo(info.timestamp),
            timestamp: info.timestamp,
            icon: 'Users'
          });
        });
      }

      // Sort all activities by timestamp and limit
      return activities
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  }

  // Get system health status
  async getSystemHealth() {
    try {
      // Check if Supabase is accessible
      const { data, error } = await supabase
        .from('events')
        .select('id')
        .limit(1);

      if (error) {
        return {
          status: 'degraded',
          message: 'Database connection issues detected',
          severity: 'medium'
        };
      }

      return {
        status: 'healthy',
        message: 'All systems operational',
        severity: 'low'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'System error detected',
        severity: 'high'
      };
    }
  }

  // Get system alerts
  async getSystemAlerts() {
    try {
      const alerts = [];
      
      // Check for upcoming events with low registration
      const { data: upcomingEvents, error: eventsError } = await supabase
        .from('events')
        .select('id, title, registration_deadline, max_participants')
        .eq('status', 'upcoming')
        .lte('registration_deadline', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

      if (!eventsError && upcomingEvents) {
        for (const event of upcomingEvents) {
          const { data: participants } = await supabase
            .from('participants')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', event.id);

          const participantCount = participants?.length || 0;
          const registrationRate = event.max_participants > 0 
            ? (participantCount / event.max_participants) * 100 
            : 0;

          if (registrationRate < 30 && participantCount < event.max_participants) {
            alerts.push({
              id: `low-registration-${event.id}`,
              type: 'warning',
              message: `Low registration for "${event.title}" (${participantCount}/${event.max_participants})`,
              severity: 'medium',
              time: this.formatTimeAgo(new Date()),
              timestamp: new Date()
            });
          }
        }
      }

      // Check system health
      const health = await this.getSystemHealth();
      if (health.status !== 'healthy') {
        alerts.push({
          id: 'system-health',
          type: health.status === 'unhealthy' ? 'error' : 'warning',
          message: health.message,
          severity: health.severity,
          time: this.formatTimeAgo(new Date()),
          timestamp: new Date()
        });
      }

      return alerts.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error getting system alerts:', error);
      return [];
    }
  }

  // Get all users with their details (for User Management page)
  async getAllUsers() {
    try {
      const usersMap = new Map();

      // Method 1: Aggregate users from events table
      try {
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select('user_id, created_at, updated_at');

        if (!eventsError && events && events.length > 0) {
          // Group events by user_id to get event counts and activity
          events.forEach(event => {
            if (event.user_id) {
              if (!usersMap.has(event.user_id)) {
                usersMap.set(event.user_id, {
                  id: event.user_id,
                  events_created: 1,
                  first_seen: event.created_at,
                  last_activity: event.updated_at || event.created_at
                });
              } else {
                // Update user info
                const user = usersMap.get(event.user_id);
                user.events_created = (user.events_created || 0) + 1;
                // Update last activity if this event is more recent
                const eventDate = new Date(event.updated_at || event.created_at);
                const lastActivity = new Date(user.last_activity);
                if (eventDate > lastActivity) {
                  user.last_activity = event.updated_at || event.created_at;
                }
                // Update first seen if this event is older
                const firstSeen = new Date(user.first_seen);
                if (eventDate < firstSeen) {
                  user.first_seen = event.created_at;
                }
              }
            }
          });
        }
      } catch (e) {
        console.error('Error fetching users from events:', e);
      }

      // Method 2: Get users from participants table
      try {
        const { data: participants, error: participantsError } = await supabase
          .from('participants')
          .select('user_id, email, first_name, last_name, created_at, registration_date, event_id');

        if (!participantsError && participants && participants.length > 0) {
          participants.forEach(participant => {
            if (participant.user_id) {
              const participantDate = participant.created_at || participant.registration_date || new Date().toISOString();
              
              if (!usersMap.has(participant.user_id)) {
                usersMap.set(participant.user_id, {
                  id: participant.user_id,
                  email: participant.email || '',
                  first_name: participant.first_name || '',
                  last_name: participant.last_name || '',
                  events_created: 0,
                  participants_registered: 0,
                  first_seen: participantDate,
                  last_activity: participantDate
                });
              } else {
                // Update user info if we have more details
                const user = usersMap.get(participant.user_id);
                user.participants_registered = (user.participants_registered || 0) + 1;
                
                if (!user.email && participant.email) user.email = participant.email;
                if (!user.first_name && participant.first_name) user.first_name = participant.first_name;
                if (!user.last_name && participant.last_name) user.last_name = participant.last_name;
                
                // Update timestamps
                const partDate = new Date(participantDate);
                const lastActivity = new Date(user.last_activity);
                if (partDate > lastActivity) {
                  user.last_activity = participantDate;
                }
                const firstSeen = new Date(user.first_seen);
                if (partDate < firstSeen) {
                  user.first_seen = participantDate;
                }
              }
            }
          });
        }
      } catch (e) {
        console.error('Error fetching users from participants:', e);
      }

      // Convert map to array and format
      const usersList = Array.from(usersMap.values()).map(userData => {
        // Try to infer role - if they created events, likely organizer; otherwise user
        const role = userData.events_created > 0 ? 'Event Organizer' : 'User';
        
        return {
          id: userData.id,
          email: userData.email || 'N/A',
          first_name: userData.first_name || 'Unknown',
          last_name: userData.last_name || 'User',
          role: role,
          status: 'active', // Default to active
          created_at: userData.first_seen || new Date().toISOString(),
          last_login: userData.last_activity || null,
          phone: '',
          organization: '',
          events_created: userData.events_created || 0,
          participants_registered: userData.participants_registered || 0
        };
      });

      // Sort by last activity (most recent first)
      usersList.sort((a, b) => {
        const dateA = new Date(a.last_login || a.created_at || 0);
        const dateB = new Date(b.last_login || b.created_at || 0);
        return dateB - dateA;
      });

      console.log(`📊 Loaded ${usersList.length} users from database`);
      return usersList;
    } catch (error) {
      console.error('❌ Error getting all users:', error);
      return [];
    }
  }

  // Helper: Format time ago
  formatTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks} week${diffInWeeks !== 1 ? 's' : ''} ago`;
  }
}

export const adminService = new AdminService();
