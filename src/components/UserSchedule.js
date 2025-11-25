import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { scheduleService } from '../services/scheduleService';
import { auth } from '../lib/supabase';
import LoadingSpinner from './LoadingSpinner';

const UserSchedule = ({ scheduleData: propScheduleData = null, user: propUser = null }) => {
  const [schedule, setSchedule] = useState(propScheduleData || []);
  const [loading, setLoading] = useState(!propScheduleData);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(propUser);
  const [userRole, setUserRole] = useState(null);

  // Group schedule by date (memoized for performance)
  const groupedSchedule = useMemo(() => {
    return scheduleService.groupScheduleByDate(schedule);
  }, [schedule]);

  useEffect(() => {
    // If schedule data is provided as prop, use it and skip loading
    if (propScheduleData) {
      setSchedule(propScheduleData);
      setLoading(false);
      if (propUser) {
        setUser(propUser);
        setUserRole(propUser.user_metadata?.role || 'user');
      }
      return;
    }

    // Otherwise, load schedule data
    const loadSchedule = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current user
        const { user: currentUser } = await auth.getCurrentUser();
        if (!currentUser) {
          setError('User not authenticated');
          return;
        }

        setUser(currentUser);
        
        // Determine user role
        const role = currentUser.user_metadata?.role || 'user';
        setUserRole(role);

        // Fetch schedule based on role
        const scheduleData = await scheduleService.getUserSchedule(currentUser.id, role);
        setSchedule(scheduleData);

      } catch (err) {
        console.error('Error loading schedule:', err);
        setError('Unable to load schedule. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, [propScheduleData, propUser]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <LoadingSpinner size="md" text="Loading schedule..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center text-red-600">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const scheduleDates = Object.keys(groupedSchedule).sort((a, b) => {
    return new Date(a) - new Date(b);
  });

  const isOrganizer = userRole === 'organizer' || userRole === 'Organizer' || 
                      userRole === 'admin' || userRole === 'Administrator' || 
                      userRole === 'Admin';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Schedule</h2>
          <p className="text-sm text-gray-600 mt-1">
            {isOrganizer 
              ? 'Events you are managing' 
              : 'Events you are registered for'}
          </p>
        </div>
        <Link
          to="/events"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View All
        </Link>
      </div>

      {scheduleDates.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium mb-2">No upcoming events</p>
          <p className="text-sm text-gray-500">
            {isOrganizer
              ? 'Create your first event to see it here'
              : 'Register for events to see them in your schedule'}
          </p>
          <Link
            to={isOrganizer ? '/create-event' : '/events'}
            className="inline-block mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            {isOrganizer ? 'Create Event' : 'Browse Events'}
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {scheduleDates.map((date) => {
            const events = groupedSchedule[date];
            const formattedDate = scheduleService.formatDate(date);

            return (
              <div key={date} className="border-b border-gray-200 last:border-b-0 pb-6 last:pb-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {formattedDate}
                </h3>
                <div className="space-y-4">
                  {events.map((event) => (
                    <Link
                      key={event.id}
                      to={`/events/${event.id}`}
                      className="block p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors mb-2">
                            {event.title}
                          </h4>
                          
                          <div className="space-y-2">
                            {event.time && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                                {scheduleService.formatTime(event.time)}
                              </div>
                            )}
                            
                            {event.location && (
                              <div className="flex items-center text-sm text-gray-600">
                                <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                                {event.is_virtual ? (
                                  <span className="flex items-center">
                                    <span className="mr-2">Virtual Event</span>
                                    {event.virtual_link && (
                                      <ExternalLink className="h-3 w-3" />
                                    )}
                                  </span>
                                ) : (
                                  event.location
                                )}
                              </div>
                            )}

                            {event.category && (
                              <div className="flex items-center">
                                <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                                  {event.category}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="ml-4 text-right">
                          {isOrganizer && event.participant_count !== null && (
                            <div className="flex items-center text-sm text-gray-600 mb-2">
                              <Users className="h-4 w-4 mr-1 text-gray-400" />
                              <span>{event.participant_count}</span>
                              {event.max_participants && (
                                <span className="text-gray-400">/{event.max_participants}</span>
                              )}
                            </div>
                          )}
                          
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            event.status === 'upcoming' 
                              ? 'bg-blue-100 text-blue-800'
                              : event.status === 'ongoing'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {event.status}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserSchedule;

