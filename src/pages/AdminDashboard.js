import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  BarChart3, 
  Settings, 
  Shield, 
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { auth } from '../lib/supabase';
import { eventsService } from '../services/eventsService';
import { adminService } from '../services/adminService';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEvents: 0,
    totalParticipants: 0,
    activeEvents: 0,
    upcomingEvents: 0,
    completedEvents: 0,
    recentRegistrations: 0,
    systemHealth: 'healthy'
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const { user, error } = await auth.getCurrentUser();
        if (error || !user) {
          navigate('/login');
          return;
        }

        setUser(user);
        
        // Check if user is admin
        const adminStatus = user.user_metadata?.role === 'Administrator' || user.user_metadata?.role === 'Admin';
        setIsAdmin(adminStatus);
        
        if (!adminStatus) {
          navigate('/dashboard');
          return;
        }

        await loadDashboardData();
      } catch (error) {
        console.error('Error checking admin access:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [navigate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all events to calculate statistics
      const { data: events, error: eventsError } = await eventsService.getAllEvents();
      if (eventsError) throw eventsError;

      // Calculate statistics
      const totalEvents = events?.length || 0;
      const activeEvents = events?.filter(e => e.status === 'ongoing').length || 0;
      const upcomingEvents = events?.filter(e => e.status === 'upcoming').length || 0;
      const completedEvents = events?.filter(e => e.status === 'completed').length || 0;

      // Calculate total participants across all events
      let totalParticipants = 0;
      if (events && events.length > 0) {
        for (const event of events) {
          const { data: count } = await eventsService.getEventParticipants(event.id);
          totalParticipants += count || 0;
        }
      }

      // Fetch real data from admin service
      const [totalUsers, recentRegistrationsData, recentActivityData, systemHealthData, systemAlertsData] = await Promise.all([
        adminService.getTotalUsers(),
        adminService.getRecentRegistrations(10),
        adminService.getRecentActivity(10),
        adminService.getSystemHealth(),
        adminService.getSystemAlerts()
      ]);

      setStats({
        totalUsers,
        totalEvents,
        totalParticipants,
        activeEvents,
        upcomingEvents,
        completedEvents,
        recentRegistrations: recentRegistrationsData.length,
        systemHealth: systemHealthData.status
      });

      // Map activity data to include proper icons
      const activityWithIcons = recentActivityData.map(activity => {
        let IconComponent;
        switch (activity.icon) {
          case 'Users': IconComponent = Users; break;
          case 'Calendar': IconComponent = Calendar; break;
          case 'CheckCircle': IconComponent = CheckCircle; break;
          case 'Settings': IconComponent = Settings; break;
          default: IconComponent = Activity; break;
        }
        return {
          ...activity,
          icon: IconComponent
        };
      });

      setRecentActivity(activityWithIcons);
      setSystemAlerts(systemAlertsData);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'user_registration': return Users;
      case 'event_created': return Calendar;
      case 'participant_registered': return Users;
      case 'event_completed': return CheckCircle;
      case 'system_update': return Settings;
      default: return Activity;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Platform overview and management</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadDashboardData}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
              <div className="flex items-center text-sm text-gray-600">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  stats.systemHealth === 'healthy' ? 'bg-green-400' : 
                  stats.systemHealth === 'degraded' ? 'bg-yellow-400' : 
                  'bg-red-400'
                }`}></div>
                System {stats.systemHealth === 'healthy' ? 'Healthy' : 
                        stats.systemHealth === 'degraded' ? 'Degraded' : 
                        'Unhealthy'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-600">
              <Users className="h-4 w-4 mr-1" />
              <span>All platform users</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalEvents}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-1" />
              <span>All platform events</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Participants</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalParticipants}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-600">
              <Activity className="h-4 w-4 mr-1" />
              <span>Across all events</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recent Registrations</p>
                <p className="text-3xl font-bold text-gray-900">{stats.recentRegistrations}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-600">
              <Clock className="h-4 w-4 mr-1" />
              <span>Last 10 activities</span>
            </div>
          </div>
        </div>

        {/* Event Status Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Status Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-600">Upcoming</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{stats.upcomingEvents}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-600">Ongoing</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{stats.activeEvents}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-600">Completed</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{stats.completedEvents}</span>
              </div>
            </div>
          </div>

          {/* System Alerts */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Alerts</h3>
            <div className="space-y-3">
              {systemAlerts.length > 0 ? (
                systemAlerts.map((alert) => (
                  <div key={alert.id} className={`p-3 rounded-lg border ${getAlertColor(alert.severity)}`}>
                    <div className="flex items-start">
                      <AlertTriangle className="h-4 w-4 mt-0.5 mr-2" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alert.message}</p>
                        <p className="text-xs opacity-75">{alert.time}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No alerts</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/admin/users')}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Users className="h-4 w-4 mr-3" />
                Manage Users
              </button>
              <button
                onClick={() => navigate('/admin/events')}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Calendar className="h-4 w-4 mr-3" />
                Manage Events
              </button>
              <button
                onClick={() => navigate('/admin/analytics')}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <BarChart3 className="h-4 w-4 mr-3" />
                View Analytics
              </button>
              <button
                onClick={() => navigate('/admin/settings')}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Settings className="h-4 w-4 mr-3" />
                System Settings
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => {
                const IconComponent = activity.icon || getActivityIcon(activity.type);
                return (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <IconComponent className="h-4 w-4 text-gray-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
