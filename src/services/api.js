// API service for EventEase frontend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('token');
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  // Get headers with auth token
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'An error occurred');
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // POST request
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Authentication methods
  async login(email, password) {
    const response = await this.post('/auth/login', { email, password });
    if (response.success && response.data.token) {
      this.setToken(response.data.token);
    }
    return response;
  }

  async register(userData) {
    const response = await this.post('/auth/register', userData);
    if (response.success && response.data.token) {
      this.setToken(response.data.token);
    }
    return response;
  }

  async logout() {
    this.setToken(null);
    return this.post('/auth/logout');
  }

  async getCurrentUser() {
    return this.get('/auth/me');
  }

  async updateProfile(profileData) {
    return this.put('/auth/profile', profileData);
  }

  async updateSettings(settingsData) {
    return this.put('/auth/settings', settingsData);
  }

  async changePassword(passwordData) {
    return this.put('/auth/change-password', passwordData);
  }

  // Event methods
  async getEvents(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/events?${queryString}` : '/events';
    return this.get(endpoint);
  }

  async getEvent(id) {
    return this.get(`/events/${id}`);
  }

  async createEvent(eventData) {
    return this.post('/events', eventData);
  }

  async updateEvent(id, eventData) {
    return this.put(`/events/${id}`, eventData);
  }

  async deleteEvent(id) {
    return this.delete(`/events/${id}`);
  }

  async publishEvent(id) {
    return this.put(`/events/${id}/publish`);
  }

  async cancelEvent(id) {
    return this.put(`/events/${id}/cancel`);
  }

  async getEventParticipants(id) {
    return this.get(`/events/${id}/participants`);
  }

  async getEventAnalytics(id) {
    return this.get(`/events/${id}/analytics`);
  }

  // Participant methods
  async getParticipants(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/participants?${queryString}` : '/participants';
    return this.get(endpoint);
  }

  async getParticipant(id) {
    return this.get(`/participants/${id}`);
  }

  async registerForEvent(participantData) {
    return this.post('/participants', participantData);
  }

  async updateParticipant(id, participantData) {
    return this.put(`/participants/${id}`, participantData);
  }

  async deleteParticipant(id) {
    return this.delete(`/participants/${id}`);
  }

  async checkInParticipant(id, method = 'manual') {
    return this.put(`/participants/${id}/checkin`, { method });
  }

  async cancelParticipant(id) {
    return this.put(`/participants/${id}/cancel`);
  }

  async submitFeedback(id, feedbackData) {
    return this.post(`/participants/${id}/feedback`, feedbackData);
  }

  async getParticipantStats() {
    return this.get('/participants/stats');
  }

  // Analytics methods
  async getDashboardAnalytics(period = '30d', eventId = null) {
    const params = { period };
    if (eventId) params.eventId = eventId;
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/analytics/dashboard?${queryString}`);
  }

  async getEventAnalytics(period = '30d', category = null, sortBy = 'startDate') {
    const params = { period, sortBy };
    if (category) params.category = category;
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/analytics/events?${queryString}`);
  }

  async getParticipantAnalytics(period = '30d', eventId = null) {
    const params = { period };
    if (eventId) params.eventId = eventId;
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/analytics/participants?${queryString}`);
  }

  async getAIInsights() {
    return this.get('/analytics/insights');
  }

  async getPerformanceMetrics(period = '30d') {
    const queryString = new URLSearchParams({ period }).toString();
    return this.get(`/analytics/performance?${queryString}`);
  }

  // User management methods (Admin only)
  async getUsers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/users?${queryString}` : '/users';
    return this.get(endpoint);
  }

  async getUser(id) {
    return this.get(`/users/${id}`);
  }

  async createUser(userData) {
    return this.post('/users', userData);
  }

  async updateUser(id, userData) {
    return this.put(`/users/${id}`, userData);
  }

  async deleteUser(id) {
    return this.delete(`/users/${id}`);
  }

  async activateUser(id) {
    return this.put(`/users/${id}/activate`);
  }

  async deactivateUser(id) {
    return this.put(`/users/${id}/deactivate`);
  }

  async getUserStats() {
    return this.get('/users/stats');
  }

  async getUserActivity(id) {
    return this.get(`/users/${id}/activity`);
  }

  // File upload methods
  async uploadImage(imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(`${this.baseURL}/upload/image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }

    return data;
  }

  async uploadAvatar(avatarFile) {
    const formData = new FormData();
    formData.append('avatar', avatarFile);

    const response = await fetch(`${this.baseURL}/upload/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Avatar upload failed');
    }

    return data;
  }

  async uploadEventImage(imageFile, eventId, alt = '') {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('eventId', eventId);
    formData.append('alt', alt);

    const response = await fetch(`${this.baseURL}/upload/event-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Event image upload failed');
    }

    return data;
  }

  async deleteImage(publicId) {
    return this.delete(`/upload/${publicId}`);
  }

  // Health check
  async healthCheck() {
    return this.get('/health');
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;
