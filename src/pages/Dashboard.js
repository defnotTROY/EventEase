import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  Clock, 
  BarChart3,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { auth } from '../lib/supabase';
import { dashboardService } from '../services/dashboardService';
import { scheduleService } from '../services/scheduleService';
import AIRecommendations from '../components/AIRecommendations';
import UserSchedule from '../components/UserSchedule';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real data state
  const [stats, setStats] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [insights, setInsights] = useState([]);
  const [scheduleData, setScheduleData] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Handle scroll to section when hash is present
  useEffect(() => {
    if (location.hash === '#my-schedule' && !isLoading) {
      // Small delay to ensure content is rendered
      setTimeout(() => {
        const element = document.getElementById('my-schedule');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [location.hash, isLoading]);

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const { user: currentUser } = await auth.getCurrentUser();
        setUser(currentUser);
        
        // If no user, redirect to login
        if (!currentUser) {
          navigate('/login');
          return;
        }

        // Load all dashboard data - pass user directly since state isn't updated yet
        await loadData(currentUser);
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
        // Reload data when user changes - pass user directly
        loadData(session.user);
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

  const loadData = async (currentUser = null) => {
    try {
      setError(null);
      setDataLoading(true);

      // Use passed user or fall back to state
      const activeUser = currentUser || user;
      
      if (!activeUser) {
        console.error('No user available for loading data');
        return;
      }

      // Get user role for stats and schedule
      const userRole = activeUser.user_metadata?.role || 'user';
      
      console.log('Loading dashboard data for user:', activeUser.id, 'role:', userRole);

      // Load all data in parallel
      const [
        dashboardStats,
        allEventsData,
        insightsData,
        scheduleDataResult
      ] = await Promise.all([
        dashboardService.getDashboardStats(activeUser.id, userRole),
        dashboardService.getAllEvents(userRole),
        dashboardService.getDashboardInsights(activeUser.id, userRole),
        scheduleService.getUserSchedule(activeUser.id, userRole)
      ]);
      
      console.log('Schedule data loaded:', scheduleDataResult);

      // Format stats for display based on user role
      const isOrganizer = userRole === 'Organizer' || userRole === 'organizer';
      const isAdmin = userRole === 'Administrator' || userRole === 'Admin';
      
      let formattedStats;
      
      if (isOrganizer || isAdmin) {
        // Stats for organizers/admins - events they created
        formattedStats = [
          { 
            name: 'My Events', 
            value: dashboardStats.totalEvents.toString(), 
            change: getChangeDisplay(dashboardStats.eventGrowth), 
            icon: Calendar, 
            color: 'blue' 
          },
          { 
            name: 'Total Registrations', 
            value: dashboardStats.totalParticipants.toLocaleString(), 
            change: getChangeDisplay(dashboardStats.participantGrowth), 
            icon: Users, 
            color: 'green' 
          },
          { 
            name: 'Attendance Rate', 
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
      } else {
        // Stats for regular users - events they're registered for
        formattedStats = [
          { 
            name: 'Registered Events', 
            value: dashboardStats.registeredEvents.toString(), 
            change: getChangeDisplay(null), 
            icon: Calendar, 
            color: 'blue' 
          },
          { 
            name: 'Events Attended', 
            value: dashboardStats.attendedEvents.toString(), 
            change: getChangeDisplay(null), 
            icon: Users, 
            color: 'green' 
          },
          { 
            name: 'Upcoming Events', 
            value: dashboardStats.upcomingRegistrations.toString(), 
            change: getChangeDisplay(null), 
            icon: Clock, 
            color: 'orange' 
          },
        ];
      }

      setStats(formattedStats);
      setAllEvents(allEventsData);
      setInsights(insightsData);
      setScheduleData(scheduleDataResult);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setDataLoading(false);
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return <LoadingSpinner fullScreen size="lg" text="Loading dashboard..." />;
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

              {/* User Schedule */}
              <div id="my-schedule">
                <UserSchedule scheduleData={scheduleData} user={user} />
              </div>
            </>
          )}

          {activeTab === 'events' && (() => {
            const userRole = user?.user_metadata?.role || 'user';
            const isOrganizerOrAdmin = userRole === 'Organizer' || userRole === 'organizer' || userRole === 'Administrator' || userRole === 'Admin';
            
            return (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {isOrganizerOrAdmin ? 'My Created Events' : 'My Registered Events'}
                  </h3>
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {isOrganizerOrAdmin ? 'Participants' : 'Attendees'}
                        </th>
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
                                  title="View Event"
                                >
                                  <Eye size={16} />
                                </button>
                                {isOrganizerOrAdmin && (
                                  <>
                                    <button 
                                      onClick={() => navigate(`/events/${event.id}/edit`)}
                                      className="text-gray-600 hover:text-gray-900"
                                      title="Edit Event"
                                    >
                                      <Edit size={16} />
                                    </button>
                                    <button 
                                      className="text-red-600 hover:text-red-900"
                                      title="Delete Event"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                            {isOrganizerOrAdmin 
                              ? 'No events found. Create your first event to get started!'
                              : 'No registered events. Browse events to find one to register for!'
                            }
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

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

    </div>
  );
};

export default Dashboard;
