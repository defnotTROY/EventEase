import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Calendar, 
  Users, 
  TrendingUp, 
  MapPin, 
  Clock,
  Star,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { aiService } from '../services/aiService';
import { auth } from '../lib/supabase';

const AIRecommendations = ({ user: propUser }) => {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(propUser);

  useEffect(() => {
    // Update local user state when prop changes
    setUser(propUser);
    
    // If we have a user, load recommendations
    if (propUser && propUser.id) {
      loadRecommendations();
    }
  }, [propUser]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!aiService.isConfigured()) {
        throw new Error('AI service not configured. Please add your OpenAI API key.');
      }

      // Debug logging
      console.log('User object:', user);
      console.log('User ID:', user?.id);

      if (!user || !user.id) {
        throw new Error('User not authenticated. Please log in to get personalized recommendations.');
      }

      const data = await aiService.getPersonalizedRecommendations(user.id);
      setRecommendations(data);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 8) return 'text-green-600 bg-green-100';
    if (confidence >= 6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceText = (confidence) => {
    if (confidence >= 8) return 'High';
    if (confidence >= 6) return 'Medium';
    return 'Low';
  };

  if (!aiService.isConfigured()) {
    return (
      <div className="card">
        <div className="flex items-center mb-4">
          <Sparkles className="text-primary-600 mr-3" size={24} />
          <h3 className="text-lg font-semibold text-gray-900">AI Event Recommendations</h3>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="text-yellow-600 mr-2" size={20} />
            <div>
              <p className="text-yellow-800 font-medium">AI Service Not Configured</p>
              <p className="text-yellow-700 text-sm mt-1">
                Add your OpenAI API key to enable AI-powered recommendations.
              </p>
              <p className="text-yellow-700 text-sm">
                Add <code className="bg-yellow-100 px-1 rounded">REACT_APP_OPENAI_API_KEY</code> to your environment variables.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Sparkles className="text-primary-600 mr-3" size={24} />
          <h3 className="text-lg font-semibold text-gray-900">AI Event Recommendations</h3>
        </div>
        <button
          onClick={loadRecommendations}
          disabled={loading}
          className="btn-secondary text-sm"
        >
          {loading ? (
            <Loader2 className="animate-spin mr-2" size={16} />
          ) : (
            <Sparkles className="mr-2" size={16} />
          )}
          Refresh
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-primary-600 mr-3" size={24} />
          <span className="text-gray-600">Analyzing your preferences...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="text-red-600 mr-2" size={20} />
            <div>
              <p className="text-red-800 font-medium">Error Loading Recommendations</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {recommendations && !loading && (
        <>
          {recommendations.insights && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-blue-900 mb-2">AI Insights</h4>
              <p className="text-blue-800 text-sm">{recommendations.insights}</p>
            </div>
          )}

          <div className="space-y-4">
            {recommendations.recommendations?.map((rec, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">{rec.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{rec.reason}</p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center">
                        <Calendar size={14} className="mr-1" />
                        <span>Event</span>
                      </div>
                      <div className="flex items-center">
                        <Users size={14} className="mr-1" />
                        <span>Recommended</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConfidenceColor(rec.confidence)}`}>
                      {getConfidenceText(rec.confidence)} Confidence
                    </span>
                    <div className="flex items-center text-sm text-gray-600">
                      <Star className="mr-1" size={14} />
                      {rec.confidence}/10
                    </div>
                  </div>
                </div>

                {rec.matchFactors && rec.matchFactors.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">Why this matches your interests:</p>
                    <div className="flex flex-wrap gap-2">
                      {rec.matchFactors.map((factor, idx) => (
                        <span key={idx} className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex space-x-2">
                  <button className="btn-primary text-sm">
                    View Event
                  </button>
                  <button className="btn-secondary text-sm">
                    Register
                  </button>
                </div>
              </div>
            ))}
          </div>

          {recommendations.recommendations?.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Sparkles className="mx-auto mb-3 text-gray-400" size={32} />
              <p>No personalized recommendations available yet.</p>
              <p className="text-sm">Create and attend more events to get better recommendations!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AIRecommendations;
