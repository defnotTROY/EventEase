import React, { useState } from 'react';
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

const AIScheduler = ({ eventId, eventDetails }) => {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [constraints, setConstraints] = useState({
    startTime: '09:00',
    endTime: '17:00',
    duration: 8,
    breakDuration: 15,
    lunchBreak: 60,
    sessionLength: 45
  });
  const [showSettings, setShowSettings] = useState(false);

  const generateSchedule = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!aiService.isConfigured()) {
        throw new Error('AI service not configured. Please add your OpenAI API key.');
      }

      const data = await aiService.generateOptimalSchedule(eventId, constraints);
      setSchedule(data);
    } catch (error) {
      console.error('Error generating schedule:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
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

  if (!aiService.isConfigured()) {
    return (
      <div className="card">
        <div className="flex items-center mb-4">
          <Clock className="text-primary-600 mr-3" size={24} />
          <h3 className="text-lg font-semibold text-gray-900">AI Event Scheduler</h3>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="text-yellow-600 mr-2" size={20} />
            <div>
              <p className="text-yellow-800 font-medium">AI Service Not Configured</p>
              <p className="text-yellow-700 text-sm mt-1">
                Add your OpenAI API key to enable AI-powered scheduling.
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
            disabled={loading}
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

      {!schedule && !loading && (
        <div className="text-center py-8 text-gray-500">
          <Clock className="mx-auto mb-3 text-gray-400" size={32} />
          <p>Click "Generate Schedule" to create an AI-optimized timeline for your event.</p>
          <p className="text-sm">The AI will consider best practices, participant engagement, and your constraints.</p>
        </div>
      )}
    </div>
  );
};

export default AIScheduler;
