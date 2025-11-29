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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 break-words">My Schedule</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
            {isOrganizer 
              ? 'Events you are managing' 
              : 'Events you are registered for'}
          </p>
        </div>
        <Link
          to="/events"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap self-start sm:self-auto"
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
        <div className="space-y-4 sm:space-y-6">
          {scheduleDates.map((date) => {
            const events = groupedSchedule[date];
            const formattedDate = scheduleService.formatDate(date);

            return (
              <div key={date} className="border-b border-gray-200 last:border-b-0 pb-4 sm:pb-6 last:pb-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 break-words">
                  {formattedDate}
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  {events.map((event) => (
                    <Link
                      key={event.id}
                      to={`/events/${event.id}`}
                      className="block p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-all group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm sm:text-base text-gray-900 group-hover:text-primary-600 transition-colors mb-2 break-words">
                            {event.title}
                          </h4>
                          
                          <div className="space-y-2">
                            {event.time && (
                              <div className="flex items-center text-xs sm:text-sm text-gray-600">
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-gray-400 flex-shrink-0" />
                                <span className="break-words">
                                  {(() => {
                                    const startTime = scheduleService.formatTime(event.time);
                                    const endTime = event.end_time ? scheduleService.formatTime(event.end_time) : null;
                                    return endTime ? `${startTime} - ${endTime}` : startTime;
                                  })()}
                                </span>
                              </div>
                            )}
                            
                            {event.location && (
                              <div className="flex items-start text-xs sm:text-sm text-gray-600">
                                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
                                <span className="break-words">
                                  {event.is_virtual ? (
                                    <span className="flex items-center flex-wrap">
                                      <span className="mr-2">Virtual Event</span>
                                      {event.virtual_link && (
                                        <ExternalLink className="h-3 w-3" />
                                      )}
                                    </span>
                                  ) : (
                                    event.location
                                  )}
                                </span>
                              </div>
                            )}

                            {event.category && (
                              <div className="flex items-center">
                                <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded break-words">
                                  {event.category}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex sm:flex-col sm:items-end sm:text-right gap-2 sm:gap-0 flex-shrink-0">
                          {isOrganizer && event.participant_count !== null && (
                            <div className="flex items-center text-xs sm:text-sm text-gray-600 sm:mb-2">
                              <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-gray-400 flex-shrink-0" />
                              <span>{event.participant_count}</span>
                              {event.max_participants && (
                                <span className="text-gray-400">/{event.max_participants}</span>
                              )}
                            </div>
                          )}
                          
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
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

