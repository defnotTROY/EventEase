import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  MapPin, 
  BarChart3, 
  PieChart, 
  Activity,
  Download,
  Filter,
  Eye,
  Sparkles,
  Loader2
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService';
import AIRecommendations from '../components/AIRecommendations';
import AIScheduler from '../components/AIScheduler';
import AIFeedbackAnalysis from '../components/AIFeedbackAnalysis';
import { auth } from '../lib/supabase';

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
  const [demographics, setDemographics] = useState(null);

  const periods = [
    { id: '7d', name: 'Last 7 days' },
    { id: '30d', name: 'Last 30 days' },
    { id: '90d', name: 'Last 90 days' },
    { id: '1y', name: 'Last year' },
  ];

  // Load user and analytics data
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { user } = await auth.getCurrentUser();
        setUser(user);
        if (user) {
          await loadAnalyticsData();
        }
      } catch (error) {
        console.error('Error getting user:', error);
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
        demoData
      ] = await Promise.all([
        analyticsService.getOverviewStats(),
        analyticsService.getEventsList(),
        analyticsService.getEngagementTrend(selectedPeriod),
        analyticsService.getCategoryPerformance(),
        analyticsService.getAIInsights(),
        analyticsService.getParticipantDemographics()
      ]);

      // Format overview stats
      const formattedStats = [
        { 
          name: 'Total Events', 
          value: stats.totalEvents.toString(), 
          change: stats.eventGrowth > 0 ? `+${stats.eventGrowth}%` : '0%', 
          icon: Calendar, 
          color: 'blue' 
        },
        { 
          name: 'Total Participants', 
          value: stats.totalParticipants.toLocaleString(), 
          change: '+0%', // Could calculate this with historical data
          icon: Users, 
          color: 'green' 
        },
        { 
          name: 'Engagement Rate', 
          value: `${stats.engagementRate}%`, 
          change: '+0%', // Could calculate this with historical data
          icon: TrendingUp, 
          color: 'purple' 
        },
        { 
          name: 'Attended Events', 
          value: stats.totalAttended.toString(), 
          change: '+0%', // Could calculate this with historical data
          icon: Activity, 
          color: 'orange' 
        },
      ];

      setOverviewStats(formattedStats);
      setEvents(eventsList);
      setEngagementData(trendData);
      setCategoryPerformance(categoryData);
      setAiInsights(insights);
      setDemographics(demoData);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">AI-powered insights and performance metrics for your events</p>
        </div>
        <div className="flex space-x-3">
          <button 
            className="btn-secondary flex items-center"
            onClick={loadAnalyticsData}
            disabled={loading}
          >
            <Filter size={20} className="mr-2" />
            Refresh
          </button>
          <button className="btn-primary flex items-center">
            <Download size={20} className="mr-2" />
            Export Report
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
                  {periods.map(period => (
                    <option key={period.id} value={period.id}>{period.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {overviewStats.map((stat) => (
              <div key={stat.name} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-green-600">{stat.change}</p>
                  </div>
                  <div className={`p-3 rounded-full bg-${stat.color}-100`}>
                    <stat.icon className={`text-${stat.color}-600`} size={24} />
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

          {/* AI-Powered Features */}
          <div className="space-y-6">
            {/* AI Recommendations */}
            <AIRecommendations user={user} />
            
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

          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Participant Demographics */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Participant Demographics</h3>
              {demographics ? (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <div className="text-2xl font-bold text-primary-600">{demographics.totalParticipants}</div>
                    <div className="text-sm text-gray-600">Total Participants</div>
                  </div>
                  {demographics.demographics.map((demo, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Age {demo.ageGroup}</span>
                        <span className="text-sm font-medium text-gray-900">{demo.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            index === 0 ? 'bg-blue-500' : 
                            index === 1 ? 'bg-green-500' : 'bg-purple-500'
                          }`} 
                          style={{ width: `${demo.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No demographic data available
                </div>
              )}
            </div>

            {/* Registration Sources */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Sources</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Direct Website</span>
                  <span className="text-sm font-medium text-gray-900">45%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-primary-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Social Media</span>
                  <span className="text-sm font-medium text-gray-900">28%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '28%' }}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Email Marketing</span>
                  <span className="text-sm font-medium text-gray-900">27%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: '27%' }}></div>
                </div>
              </div>
            </div>

            {/* Event Satisfaction */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Satisfaction</h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600 mb-2">4.7/5</div>
                <div className="flex justify-center mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <div key={star} className="w-5 h-5 bg-yellow-400 rounded-full mx-1"></div>
                  ))}
                </div>
                <p className="text-sm text-gray-600">Based on participant feedback</p>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Excellent (5)</span>
                  <span className="font-medium text-gray-900">65%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Good (4)</span>
                  <span className="font-medium text-gray-900">25%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Average (3)</span>
                  <span className="font-medium text-gray-900">8%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Below Average</span>
                  <span className="font-medium text-gray-900">2%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors">
                <BarChart3 className="text-primary-600 mb-2" size={24} />
                <span className="text-sm font-medium text-gray-900">Generate Report</span>
              </button>
              <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors">
                <Download className="text-primary-600 mb-2" size={24} />
                <span className="text-sm font-medium text-gray-900">Export Data</span>
              </button>
              <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors">
                <Eye className="text-primary-600 mb-2" size={24} />
                <span className="text-sm font-medium text-gray-900">View Details</span>
              </button>
              <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors">
                <Sparkles className="text-primary-600 mb-2" size={24} />
                <span className="text-sm font-medium text-gray-900">AI Insights</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
