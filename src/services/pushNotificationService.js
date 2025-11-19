import { supabase } from '../lib/supabase';

/**
 * Push Notification Service
 * Handles browser push notifications
 */
class PushNotificationService {
  constructor() {
    this.registration = null;
    this.subscription = null;
    this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Request permission for push notifications
   * @returns {Promise<string>} Permission status ('granted', 'denied', 'default')
   */
  async requestPermission() {
    if (!this.isSupported) {
      console.warn('Push notifications are not supported in this browser');
      return 'unsupported';
    }

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Check if notifications are permitted
   * @returns {boolean}
   */
  isPermissionGranted() {
    if (!this.isSupported) return false;
    return Notification.permission === 'granted';
  }

  /**
   * Register service worker for push notifications
   * @returns {Promise<ServiceWorkerRegistration>}
   */
  async registerServiceWorker() {
    if (!this.isSupported) {
      throw new Error('Service workers are not supported');
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      this.registration = registration;
      return registration;
    } catch (error) {
      console.error('Error registering service worker:', error);
      throw error;
    }
  }

  /**
   * Subscribe to push notifications
   * @param {string} userId - User ID
   * @returns {Promise<PushSubscription>}
   */
  async subscribe(userId) {
    if (!this.isSupported) {
      throw new Error('Push notifications are not supported');
    }

    if (!this.isPermissionGranted()) {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }
    }

    try {
      // Register service worker if not already registered
      if (!this.registration) {
        await this.registerServiceWorker();
      }

      // Get existing subscription or create new one
      let subscription = await this.registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription
        const applicationServerKey = this.urlBase64ToUint8Array(
          process.env.REACT_APP_VAPID_PUBLIC_KEY || ''
        );
        
        subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey
        });
      }

      this.subscription = subscription;

      // Save subscription to database
      await this.saveSubscription(userId, subscription);

      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async unsubscribe(userId) {
    try {
      if (this.subscription) {
        await this.subscription.unsubscribe();
        await this.removeSubscription(userId, this.subscription);
        this.subscription = null;
      }
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw error;
    }
  }

  /**
   * Save push subscription to database
   * @param {string} userId - User ID
   * @param {PushSubscription} subscription - Push subscription object
   * @returns {Promise<void>}
   */
  async saveSubscription(userId, subscription) {
    try {
      const subscriptionData = {
        user_id: userId,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: this.arrayBufferToBase64(subscription.getKey('auth'))
        },
        created_at: new Date().toISOString()
      };

      // Check if subscription already exists
      const { data: existing } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint)
        .single();

      if (existing) {
        // Update existing subscription
        await supabase
          .from('push_subscriptions')
          .update(subscriptionData)
          .eq('id', existing.id);
      } else {
        // Create new subscription
        await supabase
          .from('push_subscriptions')
          .insert([subscriptionData]);
      }
    } catch (error) {
      console.error('Error saving push subscription:', error);
      throw error;
    }
  }

  /**
   * Remove push subscription from database
   * @param {string} userId - User ID
   * @param {PushSubscription} subscription - Push subscription object
   * @returns {Promise<void>}
   */
  async removeSubscription(userId, subscription) {
    try {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint);
    } catch (error) {
      console.error('Error removing push subscription:', error);
      throw error;
    }
  }

  /**
   * Show a local notification
   * @param {string} title - Notification title
   * @param {Object} options - Notification options
   * @returns {Notification}
   */
  showNotification(title, options = {}) {
    if (!this.isPermissionGranted()) {
      console.warn('Notification permission not granted');
      return null;
    }

    const defaultOptions = {
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [200, 100, 200],
      tag: 'eventease-notification',
      requireInteraction: false,
      ...options
    };

    // Show notification using service worker if available
    if (this.registration) {
      this.registration.showNotification(title, defaultOptions);
    } else {
      // Fallback to regular notification
      return new Notification(title, defaultOptions);
    }
  }

  /**
   * Convert VAPID key from base64 URL to Uint8Array
   * @param {string} base64String - Base64 URL string
   * @returns {Uint8Array}
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Convert ArrayBuffer to base64 string
   * @param {ArrayBuffer} buffer - ArrayBuffer to convert
   * @returns {string} Base64 string
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Check if user has push notifications enabled
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  async isSubscribed(userId) {
    try {
      const { data } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking subscription:', error);
      return false;
    }
  }
}

export const pushNotificationService = new PushNotificationService();

