import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  Calendar, 
  Users, 
  Coffee, 
  Utensils, 
  Mic, 
  Network,
  Loader2,
  AlertCircle,
  CheckCircle,
  Settings
} from 'lucide-react';
import { aiService } from '../services/aiService';
import { insightsEngineService } from '../services/insightsEngineService';
import { eventsService } from '../services/eventsService';

const AIScheduler = ({ eventId, eventDetails }) => {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [eventInfo, setEventInfo] = useState(eventDetails || null);
  const [eventInfoError, setEventInfoError] = useState(null);
  const [eventLoading, setEventLoading] = useState(false);
  const [constraints, setConstraints] = useState({
    startTime: '09:00',
    endTime: '17:00',
    duration: 8,
    breakDuration: 15,
    lunchBreak: 60,
    sessionLength: 45
  });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setEventInfo(eventDetails || null);
  }, [eventDetails]);

  useEffect(() => {
    if (!eventId || eventDetails) return;

    let isMounted = true;
    const loadEvent = async () => {
      try {
        setEventLoading(true);
        setEventInfoError(null);
        const { data, error } = await eventsService.getEvent(eventId);
        if (!isMounted) return;
        if (error) {
          setEventInfoError(error.message || 'Unable to load event details');
        } else {
          setEventInfo(data);
        }
      } catch (fetchError) {
        if (!isMounted) return;
        setEventInfoError(fetchError.message || 'Unable to load event details');
      } finally {
        if (isMounted) {
          setEventLoading(false);
        }
      }
    };

    loadEvent();

    return () => {
      isMounted = false;
    };
  }, [eventId, eventDetails]);

  const missingFields = useMemo(() => {
    if (!eventInfo) return ['event details'];

    const fields = [];
    if (!eventInfo.date) fields.push('event date');
    if (!eventInfo.time) fields.push('start time');
    if (!eventInfo.location && !eventInfo.is_virtual) fields.push('location');
    return fields;
  }, [eventInfo]);

  const isEventReady = eventInfo && missingFields.length === 0;

  const generateSchedule = async () => {
    try {
      if (!isEventReady) {
        setError(`Please add ${missingFields.join(', ')} before generating a schedule.`);
        return;
      }

      setLoading(true);
      setError(null);

      // Try AI service first, fall back to rule-based engine
      let data;
      try {
        if (aiService.isConfigured()) {
          data = await aiService.generateOptimalSchedule(eventId, constraints);
        } else {
          throw new Error('AI not configured, using rule-based engine');
        }
      } catch (aiError) {
        console.log('Using rule-based scheduler:', aiError.message);
        data = await insightsEngineService.generateOptimalSchedule(eventId, constraints);
      }
      
      setSchedule(data);
    } catch (error) {
      console.error('Error generating schedule:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'registration': return <Users className="text-blue-600" size={16} />;
      case 'welcome': return <Mic className="text-green-600" size={16} />;
      case 'session': return <Calendar className="text-purple-600" size={16} />;
      case 'break': return <Coffee className="text-orange-600" size={16} />;
      case 'lunch': return <Utensils className="text-red-600" size={16} />;
      case 'networking': return <Network className="text-indigo-600" size={16} />;
      case 'closing': return <CheckCircle className="text-green-600" size={16} />;
      default: return <Clock className="text-gray-600" size={16} />;
    }
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  const calculateEndTime = (startTime, duration) => {
    const [hours, mins] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + duration;
    const endHours = Math.floor(totalMinutes / 60);
    const endMins = totalMinutes % 60;
    return `${endHours}:${endMins.toString().padStart(2, '0')}`;
  };

  // Note: We now use rule-based engine as fallback, so no need to block

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Clock className="text-primary-600 mr-3" size={24} />
          <h3 className="text-lg font-semibold text-gray-900">AI Event Scheduler</h3>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="btn-secondary text-sm"
          >
            <Settings size={16} className="mr-2" />
            Settings
          </button>
          <button
            onClick={generateSchedule}
            disabled={loading || !isEventReady}
            className="btn-primary text-sm"
          >
            {loading ? (
              <Loader2 className="animate-spin mr-2" size={16} />
            ) : (
              <Clock className="mr-2" size={16} />
            )}
            Generate Schedule
          </button>
        </div>
      </div>

      {eventLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="animate-spin text-primary-600 mr-3" size={20} />
          <span className="text-gray-600">Loading event details...</span>
        </div>
      )}

      {eventInfoError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="text-red-600 mr-2" size={20} />
            <div>
              <p className="text-red-800 font-medium">Unable to load event</p>
              <p className="text-red-700 text-sm">{eventInfoError}</p>
            </div>
          </div>
        </div>
      )}

      {eventInfo && !eventLoading && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-sm text-gray-600">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <span className="font-semibold text-gray-900">{eventInfo.title}</span>
              {formatDateDisplay(eventInfo.date) && (
                <span className="ml-2 text-gray-500">
                  • {formatDateDisplay(eventInfo.date)} {eventInfo.time ? `at ${eventInfo.time}` : ''}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="inline-flex items-center px-2 py-1 bg-primary-50 text-primary-700 rounded-full">
                {eventInfo.category || 'Uncategorized'}
              </span>
              <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                {eventInfo.location || (eventInfo.is_virtual ? 'Virtual event' : 'Location required')}
              </span>
              {eventInfo.max_participants && (
                <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                  Capacity: {eventInfo.max_participants}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-gray-900 mb-4">Schedule Constraints</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={constraints.startTime}
                onChange={(e) => setConstraints({...constraints, startTime: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={constraints.endTime}
                onChange={(e) => setConstraints({...constraints, endTime: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Break Duration (min)</label>
              <input
                type="number"
                value={constraints.breakDuration}
                onChange={(e) => setConstraints({...constraints, breakDuration: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lunch Break (min)</label>
              <input
                type="number"
                value={constraints.lunchBreak}
                onChange={(e) => setConstraints({...constraints, lunchBreak: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Session Length (min)</label>
              <input
                type="number"
                value={constraints.sessionLength}
                onChange={(e) => setConstraints({...constraints, sessionLength: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-primary-600 mr-3" size={24} />
          <span className="text-gray-600">Generating optimal schedule...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="text-red-600 mr-2" size={20} />
            <div>
              <p className="text-red-800 font-medium">Error Generating Schedule</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {schedule && !loading && (
        <>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-green-900">Schedule Generated Successfully</h4>
                <p className="text-green-800 text-sm mt-1">
                  Total Duration: {schedule.totalDuration} minutes ({formatTime(schedule.totalDuration)})
                </p>
              </div>
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>

          <div className="space-y-3">
            {schedule.schedule?.map((item, index) => (
              <div key={index} className="flex items-center p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex-shrink-0 mr-4">
                  {getActivityIcon(item.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900">{item.activity}</h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span>{item.time}</span>
                      <span>-</span>
                      <span>{calculateEndTime(item.time, item.duration)}</span>
                      <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                        {item.duration}min
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          {schedule.recommendations && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">AI Recommendations</h4>
              <p className="text-blue-800 text-sm">{schedule.recommendations}</p>
            </div>
          )}

          <div className="mt-6 flex space-x-3">
            <button className="btn-primary">
              <Calendar className="mr-2" size={16} />
              Save Schedule
            </button>
            <button className="btn-secondary">
              <Users className="mr-2" size={16} />
              Share with Team
            </button>
            <button className="btn-secondary">
              <Clock className="mr-2" size={16} />
              Export to Calendar
            </button>
          </div>
        </>
      )}

      {!schedule && !loading && !eventLoading && (
        <div className="text-center py-8 text-gray-500">
          {isEventReady ? (
            <>
              <Clock className="mx-auto mb-3 text-gray-400" size={32} />
              <p>
                Ready to generate a schedule for{' '}
                <span className="font-medium text-gray-700">
                  {eventInfo?.title || 'this event'}
                </span>
                . We’ll balance sessions, breaks, and networking using your constraints.
              </p>
              <p className="text-sm mt-2">
                Configure time blocks in Settings, then click “Generate Schedule”.
              </p>
            </>
          ) : (
            <>
              <AlertCircle className="mx-auto mb-3 text-yellow-500" size={32} />
              <p className="font-medium text-gray-700">
                Add {missingFields.join(', ')} to enable AI scheduling.
              </p>
              <p className="text-sm mt-2">
                Once your event details are complete, the scheduler can create an optimized agenda automatically.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AIScheduler;
