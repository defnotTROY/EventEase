import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Star, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  AlertCircle,
  Lightbulb,
  Target
} from 'lucide-react';
import { aiService } from '../services/aiService';
import { insightsEngineService } from '../services/insightsEngineService';
import { eventsService } from '../services/eventsService';

const AIFeedbackAnalysis = ({ eventId }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [eventInfo, setEventInfo] = useState(null);
  const [participantCount, setParticipantCount] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState(null);

  const analyzeFeedback = async () => {
    if (!participantCount || participantCount === 0) {
      setAnalysis(null);
      setMetrics(null);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Try AI service first, fall back to rule-based engine
      let data;
      try {
        if (aiService.isConfigured()) {
          data = await aiService.analyzeFeedback(eventId);
        } else {
          throw new Error('AI not configured, using rule-based engine');
        }
      } catch (aiError) {
        console.log('Using rule-based feedback analysis:', aiError.message);
        data = await insightsEngineService.analyzeFeedback(eventId);
      }
      
      setAnalysis(data);
      setMetrics(data.metrics || null);
    } catch (error) {
      console.error('Error analyzing feedback:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (score) => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getPerformanceText = (score) => {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    return 'Needs Improvement';
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'neutral': return 'text-yellow-600 bg-yellow-100';
      case 'negative': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  useEffect(() => {
    if (!eventId) return;

    let isMounted = true;
    const loadContext = async () => {
      try {
        setContextLoading(true);
        setContextError(null);
        const [{ data: eventData, error: eventError }, participantResult] = await Promise.all([
          eventsService.getEvent(eventId),
          eventsService.getEventParticipants(eventId)
        ]);

        if (!isMounted) return;

        if (eventError) throw eventError;
        if (participantResult.error) throw participantResult.error;

        setEventInfo(eventData);
        setParticipantCount(participantResult.data || 0);
      } catch (ctxError) {
        if (!isMounted) return;
        setContextError(ctxError.message || 'Failed to load event context');
        setParticipantCount(0);
      } finally {
        if (isMounted) setContextLoading(false);
      }
    };

    loadContext();
    return () => {
      isMounted = false;
    };
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    if (participantCount === null) return;
    if (participantCount === 0) {
      setAnalysis(null);
      setMetrics(null);
      return;
    }
    analyzeFeedback();
  }, [eventId, participantCount]);

  // Note: We now use rule-based engine as fallback, so no need to block

  const hasFeedbackData = metrics && metrics.totalParticipants > 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <BarChart3 className="text-primary-600 mr-3" size={24} />
          <h3 className="text-lg font-semibold text-gray-900">AI Feedback Analysis</h3>
        </div>
        <button
          onClick={analyzeFeedback}
          disabled={loading}
          className="btn-secondary text-sm"
        >
          {loading ? (
            <Loader2 className="animate-spin mr-2" size={16} />
          ) : (
            <BarChart3 className="mr-2" size={16} />
          )}
          Refresh Analysis
        </button>
      </div>

      {contextLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-primary-600 mr-3" size={24} />
          <span className="text-gray-600">Loading event data...</span>
        </div>
      )}

      {contextError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="text-red-600 mr-2" size={20} />
            <div>
              <p className="text-red-800 font-medium">Unable to load event data</p>
              <p className="text-red-700 text-sm">{contextError}</p>
            </div>
          </div>
        </div>
      )}

      {eventInfo && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-sm text-gray-600">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="font-semibold text-gray-900">{eventInfo.title}</div>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="inline-flex items-center px-2 py-1 bg-primary-50 text-primary-700 rounded-full">
                Participants: {participantCount ?? '—'}
              </span>
              {eventInfo.max_participants && (
                <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                  Capacity: {eventInfo.max_participants}
                </span>
              )}
              {metrics && (
                <>
                  <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded-full">
                    Attendance: {metrics.attendanceRate}%
                  </span>
                  {metrics.registrationRate >= 0 && (
                    <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                      Filled: {metrics.registrationRate}%
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-primary-600 mr-3" size={24} />
          <span className="text-gray-600">Analyzing event feedback...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="text-red-600 mr-2" size={20} />
            <div>
              <p className="text-red-800 font-medium">Error Analyzing Feedback</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {analysis && !loading && hasFeedbackData && (
        <>
          {/* Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">Performance Score</h4>
                <Star className="text-yellow-500" size={20} />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{analysis.performanceScore}/10</div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPerformanceColor(analysis.performanceScore)}`}>
                {getPerformanceText(analysis.performanceScore)}
              </span>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">Sentiment</h4>
                <TrendingUp className="text-green-500" size={20} />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2 capitalize">{analysis.sentiment}</div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSentimentColor(analysis.sentiment)}`}>
                {analysis.sentiment} Feedback
              </span>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">Engagement</h4>
                <Users className="text-blue-500" size={20} />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {metrics.attendanceRate}% attendance
              </div>
              <span className="px-2 py-1 text-xs font-medium rounded-full text-blue-600 bg-blue-100">
                {metrics.registrationRate}% of capacity reached
              </span>
            </div>
          </div>

          {/* Strengths and Improvements */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <CheckCircle className="text-green-600 mr-2" size={20} />
                <h4 className="font-medium text-green-900">Strengths</h4>
              </div>
              <ul className="space-y-2">
                {analysis.strengths?.map((strength, index) => (
                  <li key={index} className="flex items-start text-sm text-green-800">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <AlertTriangle className="text-orange-600 mr-2" size={20} />
                <h4 className="font-medium text-orange-900">Areas for Improvement</h4>
              </div>
              <ul className="space-y-2">
                {analysis.improvements?.map((improvement, index) => (
                  <li key={index} className="flex items-start text-sm text-orange-800">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center mb-3">
                <Lightbulb className="text-blue-600 mr-2" size={20} />
                <h4 className="font-medium text-blue-900">AI Recommendations</h4>
              </div>
              <div className="space-y-3">
                {analysis.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-blue-600 text-xs font-medium">{index + 1}</span>
                    </div>
                    <p className="text-blue-800 text-sm">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Engagement Insights */}
          {analysis.engagementInsights && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <div className="flex items-center mb-3">
                <Target className="text-purple-600 mr-2" size={20} />
                <h4 className="font-medium text-purple-900">Engagement Insights</h4>
              </div>
              <p className="text-purple-800 text-sm">{analysis.engagementInsights}</p>
            </div>
          )}

          {/* Next Steps */}
          {analysis.nextSteps && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <TrendingUp className="text-gray-600 mr-2" size={20} />
                <h4 className="font-medium text-gray-900">Next Steps</h4>
              </div>
              <p className="text-gray-700 text-sm">{analysis.nextSteps}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex space-x-3">
            <button className="btn-primary">
              <BarChart3 className="mr-2" size={16} />
              Generate Report
            </button>
            <button className="btn-secondary">
              <Target className="mr-2" size={16} />
              Apply Recommendations
            </button>
            <button className="btn-secondary">
              <TrendingUp className="mr-2" size={16} />
              Track Improvements
            </button>
          </div>
        </>
      )}

      {(!analysis || !hasFeedbackData) && !loading && !contextLoading && (
        <div className="text-center py-8 text-gray-500">
          {participantCount === 0 ? (
            <>
              <AlertTriangle className="mx-auto mb-3 text-yellow-500" size={32} />
              <p className="font-medium text-gray-700">
                We need participant attendance data before running feedback analysis.
              </p>
              <p className="text-sm mt-2">
                Once attendees check in for this event, come back to generate AI insights.
              </p>
            </>
          ) : (
            <>
              <BarChart3 className="mx-auto mb-3 text-gray-400" size={32} />
              <p>
                Refresh the analysis after the event wraps up to review performance insights and recommendations.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AIFeedbackAnalysis;
