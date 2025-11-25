import { supabase } from '../lib/supabase';

/**
 * Discoverability Score Service
 * Calculates how discoverable an event is and provides suggestions for improvement
 */
class DiscoverabilityService {
  /**
   * Calculate discoverability score for an event
   * @param {Object} event - Event object
   * @returns {Promise<{score: number, suggestions: Array, breakdown: Object}>}
   */
  async calculateDiscoverabilityScore(eventId) {
    try {
      // Get event details
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        return {
          score: 0,
          suggestions: [],
          breakdown: {}
        };
      }

      let score = 0;
      const maxScore = 100;
      const suggestions = [];
      const breakdown = {};

      // 1. Tags (0-25 points)
      // More tags = better discoverability
      const tagCount = event.tags ? (Array.isArray(event.tags) ? event.tags.length : 1) : 0;
      const tagScore = Math.min(tagCount * 5, 25); // 5 points per tag, max 25
      score += tagScore;
      breakdown.tags = { score: tagScore, max: 25, current: tagCount };
      
      if (tagCount < 5) {
        const needed = 5 - tagCount;
        suggestions.push({
          type: 'tags',
          priority: 'high',
          message: `Add ${needed} more tag${needed > 1 ? 's' : ''} to reach 15% more people`,
          impact: '15% more discoverability'
        });
      }

      // 2. Image Quality (0-20 points)
      // High resolution image = better click-through
      const hasImage = !!event.image_url;
      let imageScore = 0;
      if (hasImage) {
        // Check if image URL suggests high quality (contains high-res indicators)
        const imageUrl = event.image_url || '';
        const isHighRes = imageUrl.includes('high') || 
                         imageUrl.includes('hd') || 
                         imageUrl.includes('large') ||
                         imageUrl.match(/\d{3,4}x\d{3,4}/); // Dimensions in URL
        
        if (isHighRes) {
          imageScore = 20;
        } else {
          imageScore = 10; // Has image but might not be high res
          suggestions.push({
            type: 'image',
            priority: 'high',
            message: 'Add a high resolution image to improve click-through rate',
            impact: '20% better engagement'
          });
        }
      } else {
        suggestions.push({
          type: 'image',
          priority: 'high',
          message: 'Add an event image to improve discoverability',
          impact: '30% more views'
        });
      }
      score += imageScore;
      breakdown.image = { score: imageScore, max: 20, hasImage };

      // 3. Description Quality (0-15 points)
      // Longer, detailed descriptions rank better
      const descLength = event.description ? event.description.length : 0;
      let descScore = 0;
      if (descLength >= 500) {
        descScore = 15;
      } else if (descLength >= 300) {
        descScore = 10;
      } else if (descLength >= 150) {
        descScore = 5;
      } else {
        suggestions.push({
          type: 'description',
          priority: 'medium',
          message: 'Add more details to your event description (aim for 300+ characters)',
          impact: '10% better search ranking'
        });
      }
      score += descScore;
      breakdown.description = { score: descScore, max: 15, length: descLength };

      // 4. Category Selection (0-10 points)
      // Having a category is essential
      const hasCategory = !!event.category;
      const categoryScore = hasCategory ? 10 : 0;
      score += categoryScore;
      breakdown.category = { score: categoryScore, max: 10, hasCategory };
      
      if (!hasCategory) {
        suggestions.push({
          type: 'category',
          priority: 'high',
          message: 'Select a category to help people find your event',
          impact: 'Essential for discovery'
        });
      }

      // 5. Location Details (0-10 points)
      // Detailed location helps with local discovery
      const location = event.location || '';
      let locationScore = 0;
      if (location.length > 50) {
        locationScore = 10; // Detailed address
      } else if (location.length > 20) {
        locationScore = 5; // Basic location
      } else if (location.length > 0) {
        locationScore = 2;
      } else {
        suggestions.push({
          type: 'location',
          priority: 'medium',
          message: 'Add a detailed location address',
          impact: 'Better local search results'
        });
      }
      score += locationScore;
      breakdown.location = { score: locationScore, max: 10, length: location.length };

      // 6. Contact Information (0-10 points)
      // Having contact info builds trust
      const hasContactEmail = !!event.contact_email;
      const hasContactPhone = !!event.contact_phone;
      const contactScore = (hasContactEmail ? 5 : 0) + (hasContactPhone ? 5 : 0);
      score += contactScore;
      breakdown.contact = { score: contactScore, max: 10, hasEmail: hasContactEmail, hasPhone: hasContactPhone };
      
      if (!hasContactEmail && !hasContactPhone) {
        suggestions.push({
          type: 'contact',
          priority: 'low',
          message: 'Add contact information to build trust with potential attendees',
          impact: 'Better conversion rate'
        });
      }

      // 7. Event Status (0-10 points)
      // Upcoming events are more discoverable
      const statusScore = event.status === 'upcoming' ? 10 : 
                         event.status === 'ongoing' ? 5 : 0;
      score += statusScore;
      breakdown.status = { score: statusScore, max: 10, status: event.status };

      // Sort suggestions by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      return {
        score: Math.round(score),
        maxScore,
        suggestions,
        breakdown
      };
    } catch (error) {
      console.error('Error calculating discoverability score:', error);
      return {
        score: 0,
        suggestions: [],
        breakdown: {},
        error: error.message
      };
    }
  }

  /**
   * Get score color based on percentage
   * @param {number} score - Score out of 100
   * @returns {string} Color class
   */
  getScoreColor(score) {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  }

  /**
   * Get score background color
   * @param {number} score - Score out of 100
   * @returns {string} Background color class
   */
  getScoreBgColor(score) {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    if (score >= 40) return 'bg-orange-100';
    return 'bg-red-100';
  }

  /**
   * Get score border color
   * @param {number} score - Score out of 100
   * @returns {string} Border color class
   */
  getScoreBorderColor(score) {
    if (score >= 80) return 'border-green-500';
    if (score >= 60) return 'border-yellow-500';
    if (score >= 40) return 'border-orange-500';
    return 'border-red-500';
  }
}

export const discoverabilityService = new DiscoverabilityService();

