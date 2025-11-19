/**
 * Recommendation Service
 * Calls Python backend AI service for personalized recommendations
 */

const PYTHON_API_BASE_URL = process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:8000/api/v1';

class RecommendationService {
  /**
   * Get personalized event recommendations using Python AI backend
   * @param {string} userId - User ID
   * @param {number} topN - Number of recommendations (default: 5)
   * @returns {Promise<Object>} Recommendations with insights
   */
  async getPersonalizedRecommendations(userId, topN = 5, userMetadata = null) {
    try {
      if (!userId) {
        throw new Error('User ID is required for personalized recommendations');
      }

      // Build URL with optional initial preferences for new users
      let url = `${PYTHON_API_BASE_URL}/analytics/recommendations/${userId}?top_n=${topN}`;
      
      if (userMetadata) {
        const categories = userMetadata.selected_categories || [];
        const tags = userMetadata.selected_tags || [];
        
        if (categories.length > 0) {
          url += `&initial_categories=${encodeURIComponent(categories.join(','))}`;
        }
        if (tags.length > 0) {
          url += `&initial_tags=${encodeURIComponent(tags.join(','))}`;
        }
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        return {
          recommendations: result.data.recommendations || [],
          insights: result.data.insights || 'No insights available',
          userProfile: result.data.user_profile || {}
        };
      }

      return {
        recommendations: [],
        insights: 'No recommendations available at this time.',
        userProfile: {}
      };
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      
      // Return empty result on error
      return {
        recommendations: [],
        insights: error.message || 'Unable to generate recommendations at this time.',
        userProfile: {}
      };
    }
  }

  /**
   * Check if the Python AI service is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      const response = await fetch(`${PYTHON_API_BASE_URL}/analytics/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.status === 'healthy';
      }

      return false;
    } catch (error) {
      console.error('AI service health check failed:', error);
      return false;
    }
  }
}

export const recommendationService = new RecommendationService();
