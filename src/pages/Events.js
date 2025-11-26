import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  Users, 
  Eye, 
  Edit, 
  Trash2,
  MoreVertical,
  QrCode,
  MessageSquare,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { auth } from '../lib/supabase';
import { eventsService } from '../services/eventsService';
import { statusService } from '../services/statusService';
import { useToast } from '../contexts/ToastContext';

const Events = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [participantCounts, setParticipantCounts] = useState({});
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Check if user can edit/delete an event
  const canManageEvent = (event) => {
    if (!user) return false;
    const isOrganizerOrAdmin = userRole === 'Organizer' || userRole === 'organizer' || 
                                userRole === 'Administrator' || userRole === 'admin';
    const isEventOwner = event.user_id === user.id;
    return isOrganizerOrAdmin || isEventOwner;
  };

  const statusOptions = useMemo(() => [
    { value: 'all', label: 'All Status' },
    ...statusService.getStatusOptions().map((option) => ({
      value: option.value,
      label: option.label || option.value.charAt(0).toUpperCase() + option.value.slice(1)
    }))
  ], []);

  const categoryOptions = useMemo(() => {
    const uniqueCategories = new Set();
    events.forEach((event) => {
      if (event?.category) {
        uniqueCategories.add(event.category);
      }
    });

    return ['all', ...Array.from(uniqueCategories).sort((a, b) => a.localeCompare(b))];
  }, [events]);

  const ensureSelectionInOptions = useCallback(() => {
    if (selectedCategory !== 'all' && !categoryOptions.includes(selectedCategory)) {
      setSelectedCategory('all');
    }

    if (selectedStatus !== 'all' && !statusOptions.some((option) => option.value === selectedStatus)) {
      setSelectedStatus('all');
    }
  }, [categoryOptions, selectedCategory, selectedStatus, statusOptions]);

  useEffect(() => {
    ensureSelectionInOptions();
  }, [ensureSelectionInOptions]);

  const getEventImageUrl = useCallback((event, size = 400) => {
    if (event?.image_url) {
      return event.image_url;
    }

    const seed = encodeURIComponent(event?.title || event?.id || 'event');
    return `https://source.boringavatars.com/marble/${size}/${seed}?colors=0D9488,14B8A6,2DD4BF,5EEAD4,99F6E4`;
  }, []);

  // Auto-update all event statuses
  const handleAutoUpdateStatuses = async () => {
    try {
      const { data, error } = await statusService.autoUpdateAllStatuses(user.id);
      if (error) throw error;
      
      // Reload events
      await loadEvents();
      
      if (data.updated > 0) {
        toast.success(`Successfully updated ${data.updated} event status${data.updated === 1 ? '' : 'es'} automatically.`);
      } else {
        toast.info('All event statuses are already up to date.');
      }
    } catch (error) {
      console.error('Error auto-updating event statuses:', error);
      toast.error('Unable to update event statuses at this time. Please try again later.');
    }
  };


  // Get current user and load events
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { user } = await auth.getCurrentUser();
        setUser(user);
        setUserRole(user?.user_metadata?.role || null);
        if (user) {
          await loadEvents();
        }
      } catch (error) {
        console.error('Error getting user:', error);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    getCurrentUser();
  }, []);

  // Load events from Supabase
  const loadEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await eventsService.getAllEvents();
      
      if (error) throw error;
      
      setEvents(data || []);
      
      // Load participant counts for each event
      if (data && data.length > 0) {
        const counts = {};
        for (const event of data) {
          const { data: count, error } = await eventsService.getEventParticipants(event.id);
          if (error) {
            console.error('Error loading participants for event', event.id, ':', error);
          }
          counts[event.id] = count || 0;
        }
        setParticipantCounts(counts);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle event deletion
  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;
    
    try {
      const { error } = await eventsService.deleteEvent(eventId);
      if (error) throw error;
      
      // Reload events
      await loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Unable to delete the event at this time. Please try again later.');
    }
  };





  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return 'TBD';
    return timeString;
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || statusService.calculateEventStatus(event) === selectedStatus || event.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusColor = (status) => {
    return statusService.getStatusColor(status);
  };

  const getParticipantPercentage = (current, max) => {
    if (!max) return 0;
    const percentage = Math.round((current / max) * 100);
    return Number.isFinite(percentage) ? Math.min(Math.max(percentage, 0), 100) : 0;
  };

  useEffect(() => {
    if (viewMode !== 'list') return;

    if (filteredEvents.length === 0) {
      setSelectedEvent(null);
      return;
    }

    setSelectedEvent((previous) => {
      if (previous && filteredEvents.some((event) => event.id === previous.id)) {
        return previous;
      }
      return filteredEvents[0];
    });
  }, [viewMode, filteredEvents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary-600" />
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <Calendar size={64} className="mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Events</h3>
        <p className="text-gray-500 mb-6">{error}</p>
        <button 
          onClick={() => loadEvents()}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">Events</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage and monitor all your events in one place</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Search - Full width on all screens */}
          <div className="w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Category Filter */}
            <div className="flex-1 sm:flex-initial sm:w-44 lg:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {categoryOptions.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
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
                {statusOptions.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden self-start">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-sm font-medium ${
                  viewMode === 'grid' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm font-medium ${
                  viewMode === 'list' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredEvents.map((event) => (
            <div 
              key={event.id} 
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg hover:border-primary-200 transition-all duration-200 cursor-pointer group"
              onClick={() => navigate(`/events/${event.id}`)}
            >
              {/* Event Image */}
              <div className="relative h-40 sm:h-48 bg-gray-200">
                <img
                  src={getEventImageUrl(event, 480)}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                  <span className={`inline-flex px-2 py-1 text-[10px] sm:text-xs font-semibold rounded-full ${getStatusColor(statusService.calculateEventStatus(event))}`}>
                    {statusService.calculateEventStatus(event)}
                  </span>
                </div>
              </div>

              {/* Event Content */}
              <div className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                  {event.title}
                </h3>
                <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">{event.description}</p>
                
                <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                  <div className="flex items-center text-xs sm:text-sm text-gray-500">
                    <Calendar size={14} className="mr-2 flex-shrink-0" />
                    <span className="truncate">{formatDate(event.date)} • {formatTime(event.time)}</span>
                  </div>
                  <div className="flex items-center text-xs sm:text-sm text-gray-500">
                    <MapPin size={14} className="mr-2 flex-shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="flex items-center text-xs sm:text-sm text-gray-500">
                    <Users size={14} className="mr-2 flex-shrink-0" />
                    <span>{participantCounts[event.id] || 0}/{event.max_participants || '∞'} participants</span>
                  </div>
                </div>

                {/* Registration Progress */}
                {event.max_participants && (
                  <div className="mb-3 sm:mb-4">
                    <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">
                      <span className="font-medium">Registration</span>
                      <span className="font-semibold">{getParticipantPercentage(participantCounts[event.id] || 0, event.max_participants)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                      <div 
                        className="bg-primary-600 h-2 sm:h-3 rounded-full transition-all duration-500"
                        style={{ width: `${getParticipantPercentage(participantCounts[event.id] || 0, event.max_participants)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 mt-1">
                      <span>{participantCounts[event.id] || 0} registered</span>
                      <span>{event.max_participants} max</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div 
                  className="flex items-center justify-start gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button 
                    onClick={() => navigate(`/events/${event.id}`)}
                    className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="View Event"
                  >
                    <Eye size={16} />
                  </button>
                  {canManageEvent(event) && (
                    <>
                      <button 
                        onClick={() => navigate(`/events/${event.id}/edit`)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Event"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Event"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            <div className="w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-gray-200">
              <div className="max-h-[70vh] lg:max-h-[560px] overflow-y-auto">
                {filteredEvents.map((event) => {
                  const isSelected = selectedEvent?.id === event.id;

                  return (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={`px-5 py-4 cursor-pointer transition-colors flex flex-col gap-3 border-l-4 ${
                        isSelected ? 'bg-primary-50 border-primary-500' : 'border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <img
                          src={getEventImageUrl(event, 160)}
                          alt={event.title}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="space-y-1 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-base font-semibold text-gray-900 line-clamp-2">
                              {event.title}
                            </h3>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(statusService.calculateEventStatus(event))}`}>
                              {statusService.calculateEventStatus(event)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {event.description}
                          </p>
                          <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <Calendar size={14} />
                              {formatDate(event.date)} • {formatTime(event.time)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={14} />
                              {event.location}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Users size={14} />
                              <span className="font-medium">
                                {participantCounts[event.id] || 0}/{event.max_participants || '∞'}
                              </span>
                              {event.max_participants && (
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${getParticipantPercentage(participantCounts[event.id] || 0, event.max_participants)}%` }}
                                  ></div>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/events/${event.id}`);
                              }}
                              className="hidden sm:inline-flex items-center text-primary-600 hover:text-primary-800 text-sm font-semibold"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="lg:hidden border-t border-primary-100 pt-3 mt-2 space-y-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MessageSquare size={16} className="text-primary-500" />
                            <span>Tap actions below to manage this event</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/events/${event.id}`);
                              }}
                              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                            >
                              <Eye size={16} />
                              View
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/events/${event.id}/edit`);
                              }}
                              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                            >
                              <Edit size={16} />
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEvent(event.id);
                              }}
                              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredEvents.length === 0 && (
                  <div className="px-6 py-10 text-center text-gray-500">
                    No events match your filters right now.
                  </div>
                )}
              </div>
            </div>

            <div className="hidden lg:block lg:w-1/2">
              {selectedEvent ? (
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                  <div className="relative h-44 sm:h-56 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={getEventImageUrl(selectedEvent, 640)}
                      alt={selectedEvent.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                      <span className={`inline-flex px-2 sm:px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(statusService.calculateEventStatus(selectedEvent))}`}>
                        {statusService.calculateEventStatus(selectedEvent)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{selectedEvent.title}</h2>
                    <p className="text-sm sm:text-base text-gray-600 mt-2 leading-relaxed break-words">{selectedEvent.description}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="flex items-start gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <Calendar size={18} className="text-primary-600 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs uppercase text-gray-500">Schedule</p>
                        <p className="text-xs sm:text-sm font-semibold text-gray-800">
                          {formatDate(selectedEvent.date)}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600">{formatTime(selectedEvent.time)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <MapPin size={18} className="text-primary-600 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs uppercase text-gray-500">Location</p>
                        <p className="text-xs sm:text-sm font-semibold text-gray-800 break-words">{selectedEvent.location}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <Users size={18} className="text-primary-600 mt-0.5 flex-shrink-0" />
                      <div className="w-full min-w-0">
                        <p className="text-[10px] sm:text-xs uppercase text-gray-500">Participants</p>
                        <p className="text-xs sm:text-sm font-semibold text-gray-800">
                          {participantCounts[selectedEvent.id] || 0}/{selectedEvent.max_participants || '∞'}
                        </p>
                        {selectedEvent.max_participants && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${getParticipantPercentage(participantCounts[selectedEvent.id] || 0, selectedEvent.max_participants)}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <QrCode size={18} className="text-primary-600 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs uppercase text-gray-500">Status</p>
                        <p className="text-xs sm:text-sm text-gray-600 break-words">{statusService.getAutomationInfo().description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    <button
                      onClick={() => navigate(`/events/${selectedEvent.id}`)}
                      className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                    >
                      <Eye size={16} />
                      <span>View Details</span>
                    </button>
                    {canManageEvent(selectedEvent) && (
                      <>
                        <button
                          onClick={() => navigate(`/events/${selectedEvent.id}/edit`)}
                          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                        >
                          <Edit size={16} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(selectedEvent.id)}
                          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                        >
                          <Trash2 size={16} />
                          <span>Delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 sm:p-10 text-center text-gray-500">
                  <p className="text-sm sm:text-base">Select an event from the list to preview its full details here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Calendar size={64} className="mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-500 mb-6">Try adjusting your search or filter criteria</p>
        </div>
      )}
      
    </div>
  );
};

export default Events;