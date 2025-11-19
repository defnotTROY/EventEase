import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  Clock, 
  MapPin, 
  QrCode, 
  MessageSquare, 
  BarChart3,
  Plus,
  Eye,
  Edit,
  Trash2,
  LogIn
} from 'lucide-react';
import { auth } from '../lib/supabase';
import { dashboardService } from '../services/dashboardService';
import AIRecommendations from '../components/AIRecommendations';

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real data state
  const [stats, setStats] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [insights, setInsights] = useState([]);

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const { user } = await auth.getCurrentUser();
        setUser(user);
        
        // If no user, redirect to login
        if (!user) {
          navigate('/login');
          return;
        }

        // Load all dashboard data
        await loadData();
      } catch (error) {
        console.error('Error getting user:', error);
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();

    // Listen for auth state changes
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      
      if (!session?.user) {
        navigate('/login');
      } else {
        // Reload data when user changes
        loadData();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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

  const loadData = async () => {
    try {
      setError(null);

      // Load all data in parallel
      const [
        dashboardStats,
        upcomingEventsData,
        recentActivitiesData,
        allEventsData,
        insightsData
      ] = await Promise.all([
        dashboardService.getDashboardStats(),
        dashboardService.getUpcomingEvents(5),
        dashboardService.getRecentActivities(10),
        dashboardService.getAllEvents(),
        dashboardService.getDashboardInsights()
      ]);

      // Format stats for display
      const formattedStats = [
        { 
          name: 'Total Events', 
          value: dashboardStats.totalEvents.toString(), 
          change: getChangeDisplay(dashboardStats.eventGrowth), 
          icon: Calendar, 
          color: 'blue' 
        },
        { 
          name: 'Active Participants', 
          value: dashboardStats.totalParticipants.toLocaleString(), 
          change: getChangeDisplay(dashboardStats.participantGrowth), 
          icon: Users, 
          color: 'green' 
        },
        { 
          name: 'Engagement Rate', 
          value: `${dashboardStats.engagementRate}%`, 
          change: getChangeDisplay(dashboardStats.engagementChange, 'pp'), 
          icon: TrendingUp, 
          color: 'purple' 
        },
        { 
          name: 'Upcoming Events', 
          value: dashboardStats.upcomingEvents.toString(), 
          change: getChangeDisplay(dashboardStats.upcomingChange), 
          icon: Clock, 
          color: 'orange' 
        },
      ];

      setStats(formattedStats);
      setUpcomingEvents(upcomingEventsData);
      setRecentActivities(recentActivitiesData);
      setAllEvents(allEventsData);
      setInsights(insightsData);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back{user?.user_metadata?.first_name ? `, ${user.user_metadata.first_name}` : ''}! Here's what's happening with events around you.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate('/create-event')}
            className="btn-primary flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Create New Event
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button 
            onClick={loadData}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className={`text-sm ${stat.change.className}`}>{stat.change.label}</p>
              </div>
              <div className={`p-3 rounded-full bg-${stat.color}-100`}>
                <stat.icon className={`text-${stat.color}-600`} size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {['overview', 'events', 'insights'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <>
              {/* AI Recommendations */}
              <div className="mb-6">
                <AIRecommendations user={user} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Upcoming Events */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h3>
                {upcomingEvents.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingEvents.map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{event.title}</h4>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Calendar size={16} className="mr-1" />
                            {dashboardService.formatDate(event.date)} at {event.time}
                          </div>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <MapPin size={16} className="mr-1" />
                            {event.location}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{event.participants}</div>
                          <div className="text-xs text-gray-500">participants</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="mx-auto mb-3 text-gray-400" size={32} />
                    <p>No upcoming events</p>
                    <p className="text-sm">Create an event to get started!</p>
                  </div>
                )}
              </div>

              {/* Recent Activities */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
                {recentActivities.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{activity.action}</p>
                          <p className="text-xs text-gray-500">{activity.event} • {activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="mx-auto mb-3 text-gray-400" size={32} />
                    <p>No recent activities</p>
                    <p className="text-sm">Activities will appear here as you use the platform</p>
                  </div>
                )}
              </div>

              {/* Spacer for third column at xl */}
              <div className="hidden xl:block" />
              </div>
            </>
          )}

          {activeTab === 'events' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">All Events</h3>
                <div className="flex space-x-2">
                  <button className="btn-secondary">Filter</button>
                  <button className="btn-primary">Export</button>
                </div>
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">{error}</p>
                  <button 
                    onClick={loadData}
                    className="mt-2 text-red-600 hover:text-red-800 underline"
                  >
                    Try again
                  </button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participants</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allEvents.length > 0 ? (
                      allEvents.map((event) => (
                        <tr key={event.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{event.title}</div>
                            <div className="text-sm text-gray-500">{event.location}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {dashboardService.formatDate(event.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {event.participants}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              event.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                              event.status === 'ongoing' ? 'bg-green-100 text-green-800' :
                              event.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {event.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => navigate(`/events/${event.id}`)}
                                className="text-primary-600 hover:text-primary-900"
                              >
                                <Eye size={16} />
                              </button>
                              <button 
                                onClick={() => navigate(`/events/${event.id}/edit`)}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                <Edit size={16} />
                              </button>
                              <button className="text-red-600 hover:text-red-900">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                          No events found. <Link to="/create-event" className="text-primary-600 hover:text-primary-800">Create your first event</Link>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'insights' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Smart Insights</h3>
              {insights.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6">
                  {insights.map((insight, index) => (
                    <div key={index} className="card">
                      <div className="flex items-center mb-3">
                        <div className="p-2 bg-primary-100 rounded-lg mr-3">
                          {insight.icon === 'calendar' && <Calendar className="text-primary-600" size={20} />}
                          {insight.icon === 'trending-up' && <TrendingUp className="text-primary-600" size={20} />}
                          {insight.icon === 'clock' && <Clock className="text-primary-600" size={20} />}
                          {insight.icon === 'users' && <Users className="text-primary-600" size={20} />}
                        </div>
                        <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Recommendation:</strong> {insight.recommendation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="mx-auto mb-3 text-gray-400" size={32} />
                  <p>No insights available yet.</p>
                  <p className="text-sm">Create more events to generate insights!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6">
        <div className="card text-center hover:shadow-md transition-shadow cursor-pointer">
          <div className="p-4 bg-primary-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <QrCode className="text-primary-600" size={32} />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">QR Check-in</h3>
          <p className="text-sm text-gray-600">Generate QR codes for event attendance</p>
        </div>

        <div className="card text-center hover:shadow-md transition-shadow cursor-pointer">
          <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <MessageSquare className="text-green-600" size={32} />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Live Engagement</h3>
          <p className="text-sm text-gray-600">Create polls and Q&A sessions</p>
        </div>

        <div className="card text-center hover:shadow-md transition-shadow cursor-pointer">
          <div className="p-4 bg-purple-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <BarChart3 className="text-purple-600" size={32} />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Analytics Report</h3>
          <p className="text-sm text-gray-600">View detailed event performance metrics</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
