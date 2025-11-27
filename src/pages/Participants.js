import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Users, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Loader2
} from 'lucide-react';
import { eventsService } from '../services/eventsService';
import { auth } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { canManageParticipants } from '../services/roleService';

const Participants = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [participants, setParticipants] = useState([]);
  const [events, setEvents] = useState([]);
  const [statuses, setStatuses] = useState(['all', 'registered', 'attended', 'cancelled']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { user, error: authError } = await auth.getCurrentUser();
        if (authError || !user) {
          navigate('/login');
          return;
        }
        setUser(user);

        // Check if user can manage participants
        if (!canManageParticipants(user)) {
          setError('You need to be an Event Organizer to manage participants');
          setLoading(false);
          return;
        }

        // Load events for filter dropdown
        const { data: eventsData, error: eventsError } = await eventsService.getAllEvents();
        if (eventsError) throw eventsError;
        
        const eventsList = [
          { id: 'all', name: 'All Events' },
          ...eventsData.map(event => ({ id: event.id, name: event.title }))
        ];
        setEvents(eventsList);

        // Load available statuses
        const { data: statusList, error: statusError } = await eventsService.getParticipantStatuses();
        if (!statusError && statusList) {
          setStatuses(statusList);
        }

        // Load participants data
        await loadParticipants();

      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);


  // Load participants from database
  const loadParticipants = async () => {
    try {
      // Get all events first
      const { data: eventsData, error: eventsError } = await eventsService.getAllEvents();
      if (eventsError) {
        throw eventsError;
      }

      if (!eventsData || eventsData.length === 0) {
        setParticipants([]);
        return;
      }

      const participantMap = new Map(); // To avoid duplicates

      // For each event, get its participants
      for (const event of eventsData) {
        const { data: participantDetails, error: detailsError } = await eventsService.getEventParticipantsDetails(event.id);
        
        if (detailsError) {
          continue;
        }

        // Add participants to our list (avoiding duplicates)
        if (participantDetails && participantDetails.length > 0) {
          participantDetails.forEach((participant) => {
            // Validate required fields
            if (!participant.first_name || !participant.last_name) {
              return; // Skip this participant
            }
            
            const key = `${participant.user_id}-${participant.event_id}`;
            if (!participantMap.has(key)) {
              const participantObj = {
                id: participant.id,
                user_id: participant.user_id,
                first_name: participant.first_name,
                last_name: participant.last_name,
                email: participant.email || 'No email',
                phone: participant.phone || 'No phone',
                event_id: participant.event_id,
                event_title: event.title,
                registration_date: participant.created_at || participant.updated_at || new Date().toISOString(),
                status: participant.status || 'registered' // Use actual status from database
              };
              
              participantMap.set(key, participantObj);
            }
          });
        }
      }

      const participantsList = Array.from(participantMap.values());
      setParticipants(participantsList);
    } catch (error) {
      setError('Failed to load participants. Please try again.');
    }
  };

  const filteredParticipants = (participants || []).filter(participant => {
    const fullName = `${participant.first_name || ''} ${participant.last_name || ''}`.toLowerCase();
    const email = participant.email || '';
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) ||
                         email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEvent = selectedEvent === 'all' || participant.event_id === selectedEvent;
    const matchesStatus = selectedStatus === 'all' || participant.status === selectedStatus;
    
    return matchesSearch && matchesEvent && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'attended': return 'bg-green-100 text-green-800';
      case 'registered': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'active': return 'bg-green-100 text-green-800'; // Legacy support
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Participants</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage and engage with event participants</p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary-600" />
            <p className="text-gray-600">Loading participants...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Participants</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && (
        <>
      {/* Participant Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
        <div className="card text-center p-4 sm:p-6">
          <div className="p-2 sm:p-3 bg-blue-100 rounded-full w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-4 flex items-center justify-center">
            <Users className="text-blue-600" size={24} />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">{participants?.length || 0}</h3>
          <p className="text-xs sm:text-sm text-gray-600">Total</p>
        </div>

        <div className="card text-center p-4 sm:p-6">
          <div className="p-2 sm:p-3 bg-green-100 rounded-full w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-4 flex items-center justify-center">
            <Users className="text-green-600" size={24} />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
            {(participants || []).filter(p => p.status === 'attended' || p.status === 'active').length}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600">Attended</p>
        </div>

        <div className="card text-center p-4 sm:p-6">
          <div className="p-2 sm:p-3 bg-blue-100 rounded-full w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-4 flex items-center justify-center">
            <Users className="text-blue-600" size={24} />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
            {(participants || []).filter(p => p.status === 'registered').length}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600">Registered</p>
        </div>

        <div className="card text-center p-4 sm:p-6">
          <div className="p-2 sm:p-3 bg-purple-100 rounded-full w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-4 flex items-center justify-center">
            <Calendar className="text-purple-600" size={24} />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
            {(participants || []).filter(p => p.events?.length > 1).length}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600">Multi-Event</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Search */}
          <div className="w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Event Filter */}
            <div className="flex-1 sm:flex-initial sm:w-44 lg:w-48">
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {events.map(event => (
                  <option key={event.id} value={event.id}>{event.name}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex-1 sm:flex-initial sm:w-44 lg:w-48">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Participants List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Events</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredParticipants.map((participant) => (
                <tr key={participant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full mr-4 bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-semibold text-sm">
                          {participant.first_name.charAt(0)}{participant.last_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {participant.first_name} {participant.last_name}
                        </div>
                        <div className="text-sm text-gray-500">ID: {participant.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{participant.email}</div>
                    <div className="text-sm text-gray-500">{participant.phone || 'No phone'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        {participant.event_title}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{new Date(participant.registration_date).toLocaleDateString()}</div>
                    <div className="text-gray-500">Registered</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(participant.status)}`}>
                      {participant.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {(filteredParticipants?.length || 0) === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Users size={64} className="mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No participants found</h3>
          <p className="text-gray-500 mb-6">Try adjusting your search or filter criteria</p>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default Participants;

