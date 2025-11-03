import { statusService } from './statusService';

class AutoStatusUpdateService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.updateInterval = 60000; // Update every minute (60 seconds)
  }

  // Start automatic status updates
  start(userId) {
    if (this.isRunning) {
      console.log('AutoStatusUpdateService: Already running');
      return;
    }

    console.log('AutoStatusUpdateService: Starting automatic status updates');
    this.isRunning = true;
    
    // Run immediately on start
    this.updateStatuses(userId);
    
    // Then run every minute
    this.intervalId = setInterval(() => {
      this.updateStatuses(userId);
    }, this.updateInterval);
  }

  // Stop automatic status updates
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('AutoStatusUpdateService: Stopped automatic status updates');
  }

  // Update all event statuses for a user
  async updateStatuses(userId) {
    try {
      console.log('AutoStatusUpdateService: Checking event statuses...');
      const { data, error } = await statusService.autoUpdateAllStatuses(userId);
      
      if (error) {
        console.error('AutoStatusUpdateService: Error updating statuses:', error);
        return;
      }

      if (data.updated > 0) {
        console.log(`AutoStatusUpdateService: Updated ${data.updated} event statuses`);
        // You could emit an event here to notify the UI to refresh
        this.notifyStatusUpdate(data.updated);
      }
    } catch (error) {
      console.error('AutoStatusUpdateService: Unexpected error:', error);
    }
  }

  // Notify that statuses have been updated (for UI refresh)
  notifyStatusUpdate(updatedCount) {
    // Dispatch a custom event that the UI can listen to
    const event = new CustomEvent('eventStatusUpdated', {
      detail: { updatedCount }
    });
    window.dispatchEvent(event);
  }

  // Get current status
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId,
      updateInterval: this.updateInterval
    };
  }

  // Change update interval
  setUpdateInterval(intervalMs) {
    this.updateInterval = intervalMs;
    
    if (this.isRunning) {
      // Restart with new interval
      this.stop();
      this.start(); // Note: This would need userId to be passed
    }
  }
}

// Create singleton instance
const autoStatusUpdateService = new AutoStatusUpdateService();

export default autoStatusUpdateService;
