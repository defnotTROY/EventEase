/**
 * Check-in Service
 * Handles participant check-in via Python backend to avoid JSON coercion issues
 */

const PYTHON_API_BASE_URL = process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:8000/api/v1';

export const checkInService = {
  /**
   * Check in a participant using QR code data
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID from QR code
   * @param {string} email - Email from QR code
   * @returns {Promise<Object>} Check-in result
   */
  async checkInParticipant(eventId, userId, email) {
    try {
      const response = await fetch(`${PYTHON_API_BASE_URL}/participants/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: eventId,
          user_id: userId,
          email: email
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          data: null,
          error: {
            message: data.detail || `HTTP error! status: ${response.status}`
          }
        };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error checking in participant:', error);
      return {
        data: null,
        error: {
          message: error.message || 'Failed to check in participant'
        }
      };
    }
  }
};

