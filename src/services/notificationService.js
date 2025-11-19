import { supabase } from '../lib/supabase';

/**
 * Smart Notification Service
 * Generates contextual, intelligent notifications based on user behavior and preferences
 */
class NotificationService {
  /**
   * Get all notifications for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of notifications
   */
  async getNotifications(userId, options = {}) {
    try {
      const { limit = 50, unreadOnly = false, priority = null } = options;
      
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (unreadOnly) {
        query = query.eq('read', false);
      }

      if (priority) {
        query = query.eq('priority', priority);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { data: [], error };
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>}
   */
  async markAsRead(notificationId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { data: null, error };
    }
  }

  /**
   * Mark all notifications as read
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async markAllAsRead(userId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('read', false)
        .select();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { data: null, error };
    }
  }

  /**
   * Get user notification preferences
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async getPreferences(userId) {
    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      
      // Return default preferences if none exist
      if (!data) {
        return {
          data: this.getDefaultPreferences(),
          error: null
        };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      return { data: this.getDefaultPreferences(), error };
    }
  }

  /**
   * Update user notification preferences
   * @param {string} userId - User ID
   * @param {Object} preferences - Preference updates
   * @returns {Promise<Object>}
   */
  async updatePreferences(userId, preferences) {
    try {
      // Check if preferences exist
      const { data: existing } = await supabase
        .from('user_notification_preferences')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existing) {
        // Update existing preferences
        const { data, error } = await supabase
          .from('user_notification_preferences')
          .update({
            ...preferences,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return { data, error: null };
      } else {
        // Create new preferences
        const { data, error } = await supabase
          .from('user_notification_preferences')
          .insert([{
            user_id: userId,
            ...this.getDefaultPreferences(),
            ...preferences
          }])
          .select()
          .single();

        if (error) throw error;
        return { data, error: null };
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return { data: null, error };
    }
  }

  /**
   * Get default notification preferences
   * @returns {Object}
   */
  getDefaultPreferences() {
    return {
      frequency: 'real-time', // 'real-time' | 'daily-digest' | 'weekly-digest'
      categories: {
        music: true,
        sports: true,
        food: true,
        tech: true,
        arts: true,
        business: true,
        education: true,
        other: true
      },
      quiet_hours: {
        enabled: true,
        start: '22:00', // 10 PM
        end: '08:00'    // 8 AM
      },
      priority_level: 'all', // 'all' | 'urgent-only' | 'high-priority'
      location_based: true,
      max_daily_notifications: 3,
      timely_suggestions: true,
      price_alerts: true,
      last_chance_reminders: true,
      nearby_alerts: true
    };
  }

  /**
   * Generate smart notifications for a user
   * This is called by a backend job/cron to generate notifications
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Generated notifications
   */
  async generateSmartNotifications(userId) {
    try {
      const notifications = [];
      
      // Get user preferences
      const { data: preferences } = await this.getPreferences(userId);
      if (!preferences) return { data: [], error: null };

      // Check if we should generate notifications (respect max daily limit)
      const todayCount = await this.getTodayNotificationCount(userId);
      if (todayCount >= preferences.max_daily_notifications) {
        return { data: [], error: null };
      }

      // Check quiet hours
      if (this.isQuietHours(preferences.quiet_hours)) {
        return { data: [], error: null };
      }

      // Get user's notification settings from metadata
      const { data: { user } } = await supabase.auth.getUser();
      const userNotificationSettings = user?.user_metadata?.notification_settings || {};
      const systemAlertsEnabled = userNotificationSettings.systemAlerts !== false; // Default to true

      // Generate different types of notifications
      const [timelySuggestions, priceAlerts, lastChance, nearby, systemAlerts] = await Promise.all([
        preferences.timely_suggestions ? this.generateTimelySuggestions(userId, preferences) : Promise.resolve([]),
        preferences.price_alerts ? this.generatePriceAlerts(userId, preferences) : Promise.resolve([]),
        preferences.last_chance_reminders ? this.generateLastChanceReminders(userId, preferences) : Promise.resolve([]),
        preferences.nearby_alerts && preferences.location_based ? this.generateNearbyAlerts(userId, preferences) : Promise.resolve([]),
        systemAlertsEnabled ? this.generateSystemAlerts(userId, preferences) : Promise.resolve([])
      ]);

      // Combine and prioritize notifications
      const allNotifications = [
        ...timelySuggestions,
        ...priceAlerts,
        ...lastChance,
        ...nearby,
        ...systemAlerts
      ];

      // Filter by priority level
      const filteredNotifications = this.filterByPriority(allNotifications, preferences.priority_level);

      // Limit to remaining daily quota
      const remainingQuota = preferences.max_daily_notifications - todayCount;
      const finalNotifications = filteredNotifications.slice(0, remainingQuota);

      // Create notifications in database
      if (finalNotifications.length > 0) {
        const { data, error } = await supabase
          .from('notifications')
          .insert(finalNotifications.map(notif => ({
            user_id: userId,
            ...notif,
            created_at: new Date().toISOString()
          })))
          .select();

        if (error) throw error;
        return { data: data || [], error: null };
      }

      return { data: [], error: null };
    } catch (error) {
      console.error('Error generating smart notifications:', error);
      return { data: [], error };
    }
  }

  /**
   * Generate timely event suggestions based on user interests
   */
  async generateTimelySuggestions(userId, preferences) {
    try {
      // Get user's past event interests and preferences
      const { data: userEvents } = await supabase
        .from('participants')
        .select('event_id, events(*)')
        .eq('user_id', userId)
        .limit(10);

      // Extract interests from past events
      const interests = this.extractInterests(userEvents);

      // Find upcoming events matching interests
      const { data: upcomingEvents } = await supabase
        .from('events')
        .select('*')
        .in('category', interests.categories || [])
        .gte('date', new Date().toISOString())
        .lte('date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()) // Next week
        .eq('visibility', 'public')
        .limit(5);

      if (!upcomingEvents || upcomingEvents.length === 0) return [];

      // Generate personalized suggestions
      return upcomingEvents.map(event => ({
        type: 'timely_suggestion',
        title: 'Event Suggestion',
        message: this.generateTimelySuggestionMessage(event, interests),
        priority: 'medium',
        action_url: `/events/${event.id}`,
        metadata: {
          event_id: event.id,
          event_title: event.title,
          category: event.category,
          date: event.date
        }
      }));
    } catch (error) {
      console.error('Error generating timely suggestions:', error);
      return [];
    }
  }

  /**
   * Generate price alerts for events user viewed
   */
  async generatePriceAlerts(userId, preferences) {
    try {
      // Get events user has viewed (would need a view tracking table)
      // For now, check events user is interested in but hasn't registered
      const { data: viewedEvents } = await supabase
        .from('event_views')
        .select('event_id, events(*)')
        .eq('user_id', userId)
        .gte('viewed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .limit(10);

      if (!viewedEvents || viewedEvents.length === 0) return [];

      const alerts = [];
      for (const view of viewedEvents) {
        const event = view.events;
        if (!event || !event.price) continue;

        // Check if price dropped
        const priceDrop = await this.detectPriceDrop(event);
        if (priceDrop) {
          alerts.push({
            type: 'price_alert',
            title: 'Price Drop Alert',
            message: `Tickets dropped for "${event.title}" - ${priceDrop.percentage}% off!`,
            priority: 'high',
            action_url: `/events/${event.id}`,
            metadata: {
              event_id: event.id,
              event_title: event.title,
              old_price: priceDrop.oldPrice,
              new_price: priceDrop.newPrice,
              percentage: priceDrop.percentage
            }
          });
        }
      }

      return alerts;
    } catch (error) {
      console.error('Error generating price alerts:', error);
      return [];
    }
  }

  /**
   * Generate last-chance reminders for events
   */
  async generateLastChanceReminders(userId, preferences) {
    try {
      // Find events with registration deadlines in next 2-3 days
      const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

      const { data: events } = await supabase
        .from('events')
        .select('*')
        .gte('registration_deadline', twoDaysFromNow.toISOString())
        .lte('registration_deadline', threeDaysFromNow.toISOString())
        .eq('visibility', 'public')
        .limit(5);

      if (!events || events.length === 0) return [];

      // Check if user is already registered
      const reminders = [];
      for (const event of events) {
        const { data: isRegistered } = await supabase
          .from('participants')
          .select('id')
          .eq('event_id', event.id)
          .eq('user_id', userId)
          .single();

        if (!isRegistered) {
          const daysLeft = Math.ceil((new Date(event.registration_deadline) - new Date()) / (1000 * 60 * 60 * 24));
          if (daysLeft > 0 && daysLeft <= 3) {
            reminders.push({
              type: 'last_chance',
              title: 'Last Chance to Register',
              message: `Only ${daysLeft} day${daysLeft > 1 ? 's' : ''} left to register for "${event.title}"`,
              priority: 'high',
              action_url: `/events/${event.id}`,
              metadata: {
                event_id: event.id,
                event_title: event.title,
                deadline: event.registration_deadline,
                days_left: daysLeft
              }
            });
          }
        }
      }

      return reminders;
    } catch (error) {
      console.error('Error generating last-chance reminders:', error);
      return [];
    }
  }

  /**
   * Generate nearby event alerts (location-based)
   */
  async generateNearbyAlerts(userId, preferences) {
    try {
      // Get user's location (would need location tracking)
      const { data: userLocation } = await supabase
        .from('user_locations')
        .select('latitude, longitude, city')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (!userLocation) return [];

      // Find events starting soon near user's location
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      const { data: nearbyEvents } = await supabase
        .from('events')
        .select('*')
        .gte('date', now.toISOString())
        .lte('date', oneHourFromNow.toISOString())
        .ilike('location', `%${userLocation.city}%`)
        .eq('visibility', 'public')
        .limit(5);

      if (!nearbyEvents || nearbyEvents.length === 0) return [];

      return nearbyEvents.map(event => ({
        type: 'nearby_alert',
        title: 'Event Starting Nearby',
        message: `"${event.title}" is starting soon near you!`,
        priority: 'high',
        action_url: `/events/${event.id}`,
        metadata: {
          event_id: event.id,
          event_title: event.title,
          location: event.location,
          start_time: event.date
        }
      }));
    } catch (error) {
      console.error('Error generating nearby alerts:', error);
      return [];
    }
  }

  /**
   * Helper methods
   */
  async getTodayNotificationCount(userId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', today.toISOString());

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting today notification count:', error);
      return 0;
    }
  }

  isQuietHours(quietHours) {
    if (!quietHours || !quietHours.enabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const start = quietHours.start;
    const end = quietHours.end;

    // Handle quiet hours that span midnight
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    }
    return currentTime >= start && currentTime <= end;
  }

  filterByPriority(notifications, priorityLevel) {
    if (priorityLevel === 'all') return notifications;
    if (priorityLevel === 'urgent-only') {
      return notifications.filter(n => n.priority === 'urgent');
    }
    if (priorityLevel === 'high-priority') {
      return notifications.filter(n => ['urgent', 'high'].includes(n.priority));
    }
    return notifications;
  }

  extractInterests(userEvents) {
    const categories = new Set();
    const tags = new Set();

    if (userEvents) {
      userEvents.forEach(ue => {
        if (ue.events?.category) categories.add(ue.events.category);
        if (ue.events?.tags) {
          ue.events.tags.forEach(tag => tags.add(tag));
        }
      });
    }

    return { categories: Array.from(categories), tags: Array.from(tags) };
  }

  generateTimelySuggestionMessage(event, interests) {
    const artistMatch = interests.tags?.find(tag => 
      event.title.toLowerCase().includes(tag.toLowerCase()) ||
      event.description?.toLowerCase().includes(tag.toLowerCase())
    );

    if (artistMatch) {
      return `Concert by ${artistMatch} coming to your area next week!`;
    }

    return `${event.category || 'Event'} "${event.title}" coming to your area next week`;
  }

  /**
   * Create a system alert notification
   * @param {string} userId - User ID
   * @param {string} title - Alert title
   * @param {string} message - Alert message
   * @param {string} actionUrl - URL to navigate to
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>}
   */
  async createSystemAlert(userId, title, message, actionUrl = null, metadata = {}) {
    try {
      const notification = {
        user_id: userId,
        type: 'system_alert',
        title,
        message,
        priority: 'high',
        action_url: actionUrl,
        metadata: {
          alert_type: 'system',
          ...metadata
        }
      };

      const { data, error } = await supabase
        .from('notifications')
        .insert([notification])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating system alert:', error);
      return { data: null, error };
    }
  }

  async detectPriceDrop(event) {
    try {
      // Check price history for this event
      const { data: priceHistory } = await supabase
        .from('event_price_history')
        .select('price')
        .eq('event_id', event.id)
        .order('recorded_at', { ascending: false })
        .limit(2);

      if (!priceHistory || priceHistory.length < 2) return null;

      const currentPrice = parseFloat(event.price || 0);
      const previousPrice = parseFloat(priceHistory[0].price);

      if (currentPrice < previousPrice && currentPrice > 0) {
        const percentage = Math.round(((previousPrice - currentPrice) / previousPrice) * 100);
        return {
          oldPrice: previousPrice,
          newPrice: currentPrice,
          percentage
        };
      }

      return null;
    } catch (error) {
      console.error('Error detecting price drop:', error);
      return null;
    }
  }

  /**
   * Generate system alerts for a user
   * @param {string} userId - User ID
   * @param {Object} preferences - User preferences
   * @returns {Promise<Array>} System alert notifications
   */
  async generateSystemAlerts(userId, preferences) {
    try {
      const alerts = [];

      // Check for account security alerts
      const { data: recentLogins } = await supabase
        .from('auth_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Check for suspicious login activity (multiple logins from different locations)
      if (recentLogins && recentLogins.length > 0) {
        const uniqueLocations = new Set(recentLogins.map(login => login.ip_address || login.location));
        if (uniqueLocations.size > 3) {
          alerts.push({
            type: 'system_alert',
            title: 'Security Alert',
            message: 'Multiple login attempts detected from different locations. If this wasn\'t you, please secure your account.',
            priority: 'urgent',
            action_url: '/settings?tab=security',
            metadata: {
              alert_type: 'suspicious_activity',
              locations: Array.from(uniqueLocations)
            }
          });
        }
      }

      // Check for verification status changes
      const { data: verification } = await supabase
        .from('user_verifications')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (verification) {
        if (verification.status === 'approved' && !verification.notification_sent) {
          alerts.push({
            type: 'system_alert',
            title: 'Verification Approved',
            message: 'Your profile verification has been approved! You can now register for events.',
            priority: 'high',
            action_url: '/settings?tab=profile',
            metadata: {
              alert_type: 'verification_approved',
              verification_id: verification.id
            }
          });
        } else if (verification.status === 'rejected' && !verification.notification_sent) {
          alerts.push({
            type: 'system_alert',
            title: 'Verification Rejected',
            message: `Your profile verification was rejected. Reason: ${verification.rejection_reason || 'Please review and resubmit your verification documents.'}`,
            priority: 'high',
            action_url: '/settings?tab=profile',
            metadata: {
              alert_type: 'verification_rejected',
              verification_id: verification.id
            }
          });
        }
      }

      // Check for system maintenance notifications
      const { data: maintenance } = await supabase
        .from('system_maintenance')
        .select('*')
        .eq('is_active', true)
        .gte('scheduled_start', new Date().toISOString())
        .lte('scheduled_start', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
        .limit(1)
        .single();

      if (maintenance) {
        alerts.push({
          type: 'system_alert',
          title: 'Scheduled Maintenance',
          message: `System maintenance scheduled: ${maintenance.description || 'The system will be unavailable during this time.'}`,
          priority: 'high',
          action_url: '/',
          metadata: {
            alert_type: 'maintenance',
            maintenance_id: maintenance.id,
            scheduled_start: maintenance.scheduled_start,
            scheduled_end: maintenance.scheduled_end
          }
        });
      }

      // Check for important account updates
      const { data: accountUpdates } = await supabase
        .from('system_announcements')
        .select('*')
        .eq('is_active', true)
        .eq('priority', 'high')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(3);

      if (accountUpdates && accountUpdates.length > 0) {
        accountUpdates.forEach(update => {
          alerts.push({
            type: 'system_alert',
            title: 'Important Update',
            message: update.message || update.title,
            priority: 'high',
            action_url: update.action_url || '/',
            metadata: {
              alert_type: 'announcement',
              announcement_id: update.id
            }
          });
        });
      }

      return alerts;
    } catch (error) {
      console.error('Error generating system alerts:', error);
      return [];
    }
  }
}

export const notificationService = new NotificationService();

