import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  Activity,
  Filter,
  Eye,
  Sparkles,
  Loader2
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService';
import { discoverabilityService } from '../services/discoverabilityService';
import AIScheduler from '../components/AIScheduler';
import AIFeedbackAnalysis from '../components/AIFeedbackAnalysis';
import { auth } from '../lib/supabase';
import { canAccessAnalytics } from '../services/roleService';

const Analytics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  
  // Real data state
  const [overviewStats, setOverviewStats] = useState([]);
  const [events, setEvents] = useState([]);
  const [engagementData, setEngagementData] = useState([]);
  const [categoryPerformance, setCategoryPerformance] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [periodOptions, setPeriodOptions] = useState([]);
  const [discoverabilityScore, setDiscoverabilityScore] = useState(null);
  const [loadingDiscoverability, setLoadingDiscoverability] = useState(false);

  const iconMap = useMemo(() => ({
    Calendar,
    Users,
    TrendingUp,
    Activity
  }), []);

  // Reload discoverability when event changes
  useEffect(() => {
    const loadDiscoverabilityScore = async (eventId) => {
      if (eventId === 'all') {
        setDiscoverabilityScore(null);
        return;
      }

      setLoadingDiscoverability(true);
      try {
        const result = await discoverabilityService.calculateDiscoverabilityScore(eventId);
        setDiscoverabilityScore(result);
      } catch (error) {
        console.error('Error loading discoverability score:', error);
        setDiscoverabilityScore(null);
      } finally {
        setLoadingDiscoverability(false);
      }
    };

    if (selectedEvent !== 'all') {
      loadDiscoverabilityScore(selectedEvent);
    } else {
      setDiscoverabilityScore(null);
    }
  }, [selectedEvent]);

  const getChangeDisplay = (change, suffix = '%') => {
    if (change === null || change === undefined) {
      return {
        label: '—',
        className: 'text-gray-400'
      };
    }

    const numericChange = Number(change);
    if (Number.isNaN(numericChange)) {
      return {
        label: '—',
        className: 'text-gray-400'
      };
    }

    const sign = numericChange > 0 ? '+' : numericChange < 0 ? '' : '';
    const className = numericChange > 0
      ? 'text-green-600'
      : numericChange < 0
        ? 'text-red-600'
        : 'text-gray-500';

    return {
      label: `${sign}${numericChange}${suffix}`,
      className
    };
  };

  // Load user and analytics data
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { user } = await auth.getCurrentUser();
        setUser(user);
        
        if (!user) {
          setError('Please log in to view analytics');
          return;
        }

        // Check if user can access analytics
        if (!canAccessAnalytics(user)) {
          setError('You need to be an Event Organizer to access analytics');
          setLoading(false);
          return;
        }

        if (user) {
          await loadAnalyticsData();
        }
      } catch (error) {
        console.error('Error getting user:', error);
        setError('Failed to load user data');
      }
    };

    getCurrentUser();
  }, [selectedPeriod]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all data in parallel
      const [
        stats,
        eventsList,
        trendData,
        categoryData,
        insights,
        periodsList
      ] = await Promise.all([
        analyticsService.getOverviewStats(),
        analyticsService.getEventsList(),
        analyticsService.getEngagementTrend(selectedPeriod),
        analyticsService.getCategoryPerformance(),
        analyticsService.getAIInsights(),
        analyticsService.getAvailablePeriods()
      ]);

      // Format overview stats
      setOverviewStats(stats.cards || []);
      setEvents(eventsList);
      setEngagementData(trendData);
      setCategoryPerformance(categoryData);
      setAiInsights(insights);
      setPeriodOptions(periodsList);

      if (periodsList.length > 0 && !periodsList.some(period => period.id === selectedPeriod)) {
        setSelectedPeriod(periodsList[0].id);
      }

    } catch (error) {
      console.error('Error loading analytics data:', error);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'High': return 'text-red-600 bg-red-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">Analytics</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 break-words">AI-powered insights and performance metrics for your events</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button 
            className="btn-secondary flex items-center text-sm sm:text-base"
            onClick={loadAnalyticsData}
            disabled={loading}
          >
            <Filter size={18} className="mr-2 flex-shrink-0" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-primary-600" size={32} />
          <span className="ml-3 text-gray-600">Loading analytics data...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button 
            onClick={loadAnalyticsData}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Content - only show when not loading and no error */}
      {!loading && !error && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="lg:w-64">
                <label className="block text-sm font-medium text-gray-700 mb-2">Event</label>
                <select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {events.map(event => (
                    <option key={event.id} value={event.id}>{event.name}</option>
                  ))}
                </select>
              </div>
              <div className="lg:w-64">
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
              {periodOptions.map(period => (
                    <option key={period.id} value={period.id}>{period.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {overviewStats.map((stat) => (
          <div key={stat.id} className="card">
                <div className="flex items-center justify-between">
                  <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className={`text-sm ${getChangeDisplay(stat.changeValue, stat.changeUnit || '%').className}`}>
                  {getChangeDisplay(stat.changeValue, stat.changeUnit || '%').label}
                </p>
                  </div>
              <div className={`p-3 rounded-full ${stat.iconBackgroundClass}`}>
                {(() => {
                  const IconComponent = iconMap[stat.icon] || TrendingUp;
                  return <IconComponent className={stat.iconColorClass} size={24} />;
                })()}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Engagement Trend */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Engagement Trend</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Engagement Rate</span>
                </div>
              </div>
              {engagementData.length > 0 ? (
                <div className="h-64 flex items-end justify-between space-x-2">
                  {engagementData.map((data, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-gray-200 rounded-t-lg relative">
                        <div
                          className="bg-primary-500 rounded-t-lg transition-all duration-500"
                          style={{ height: `${Math.max(data.engagement, 10)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 mt-2">{data.period}</span>
                      <span className="text-xs font-medium text-gray-700">{data.engagement}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No engagement data available for the selected period
                </div>
              )}
            </div>

            {/* Category Performance */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Category Performance</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Participants</span>
                </div>
              </div>
              {categoryPerformance.length > 0 ? (
                <div className="space-y-4">
                  {categoryPerformance.map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-900">{category.category}</span>
                          <span className="text-gray-600">{category.participants} participants</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max((category.participants / Math.max(...categoryPerformance.map(c => c.participants), 1)) * 100, 5)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No category data available
                </div>
              )}
            </div>
          </div>

          {/* Discoverability Score */}
          {selectedEvent !== 'all' && (
            <div className="card">
              <div className="flex items-center mb-6">
                <Eye className="text-primary-600 mr-3" size={24} />
                <h3 className="text-lg font-semibold text-gray-900">Event Discoverability Score</h3>
              </div>
              {loadingDiscoverability ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary-600 mb-2" />
                  <p className="text-gray-600">Calculating discoverability score...</p>
                </div>
              ) : discoverabilityScore ? (
                <div className="space-y-6">
                  {/* Score Display */}
                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full border-4 ${discoverabilityService.getScoreBorderColor(discoverabilityScore.score)} ${discoverabilityService.getScoreBgColor(discoverabilityScore.score)} mb-4`}>
                      <div className="text-center">
                        <div className={`text-4xl font-bold ${discoverabilityService.getScoreColor(discoverabilityScore.score)}`}>
                          {discoverabilityScore.score}%
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Current Score</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {discoverabilityScore.score >= 80 
                        ? 'Excellent! Your event is highly discoverable.' 
                        : discoverabilityScore.score >= 60 
                        ? 'Good discoverability, but there\'s room for improvement.'
                        : 'Your event needs optimization to improve discoverability.'}
                    </p>
                  </div>

                  {/* Suggestions */}
                  {discoverabilityScore.suggestions && discoverabilityScore.suggestions.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900">Suggestions to Improve:</h4>
                      {discoverabilityScore.suggestions.map((suggestion, index) => (
                        <div 
                          key={index} 
                          className={`p-4 rounded-lg border-l-4 ${
                            suggestion.priority === 'high' 
                              ? 'bg-yellow-50 border-yellow-500' 
                              : suggestion.priority === 'medium'
                              ? 'bg-blue-50 border-blue-500'
                              : 'bg-gray-50 border-gray-400'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 mb-1">
                                {suggestion.message}
                              </p>
                              {suggestion.impact && (
                                <p className="text-sm text-gray-600">
                                  Impact: {suggestion.impact}
                                </p>
                              )}
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              suggestion.priority === 'high' 
                                ? 'bg-yellow-200 text-yellow-800' 
                                : suggestion.priority === 'medium'
                                ? 'bg-blue-200 text-blue-800'
                                : 'bg-gray-200 text-gray-800'
                            }`}>
                              {suggestion.priority === 'high' ? 'High' : suggestion.priority === 'medium' ? 'Medium' : 'Low'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Score Breakdown */}
                  {discoverabilityScore.breakdown && Object.keys(discoverabilityScore.breakdown).length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Score Breakdown:</h4>
                      <div className="space-y-2">
                        {Object.entries(discoverabilityScore.breakdown).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}:</span>
                            <span className="font-medium text-gray-900">
                              {value.score || 0}/{value.max || 0} points
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Unable to calculate discoverability score for this event.
                </div>
              )}
            </div>
          )}

          {/* AI-Powered Features */}
          <div className="space-y-6">
            {/* AI Scheduler */}
            {selectedEvent !== 'all' && (
              <AIScheduler eventId={selectedEvent} />
            )}
            
            {/* AI Feedback Analysis */}
            {selectedEvent !== 'all' && (
              <AIFeedbackAnalysis eventId={selectedEvent} />
            )}
          </div>

          {/* AI Insights */}
          <div className="card">
            <div className="flex items-center mb-6">
              <Sparkles className="text-primary-600 mr-3" size={24} />
              <h3 className="text-lg font-semibold text-gray-900">AI-Powered Insights</h3>
            </div>
            {aiInsights.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {aiInsights.map((insight, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getImpactColor(insight.impact)}`}>
                        {insight.impact} Impact
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                    <div className="bg-blue-50 p-3 rounded-lg mb-3">
                      <p className="text-sm text-blue-800">
                        <strong>Recommendation:</strong> {insight.recommendation}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">AI Confidence</span>
                      <span className="font-medium text-gray-900">{insight.confidence}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No insights available yet. Create more events to generate AI-powered insights!
              </div>
            )}
          </div>

        </>
      )}
    </div>
  );
};

export default Analytics;
