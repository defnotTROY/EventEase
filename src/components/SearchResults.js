import React from 'react';
import { Calendar, Users, MapPin, Clock, Eye, Search, Bookmark, FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SearchResults = ({ results, onClose, searchQuery }) => {
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleEventClick = (eventId) => {
    navigate(`/events/${eventId}`);
    onClose();
  };

  const handleParticipantClick = (eventId) => {
    navigate(`/events/${eventId}`);
    onClose();
  };

  const events = results?.events || [];
  const registeredEvents = results?.registeredEvents || [];
  const myEvents = results?.myEvents || [];
  const participants = results?.participants || [];
  const suggestions = results?.suggestions || {};
  const errorMessage = results?.error;
  const isOrganizerOrAdmin = results?.isOrganizerOrAdmin || false;
  const hasResults = events.length > 0 || participants.length > 0 || registeredEvents.length > 0 || myEvents.length > 0;

  const handleQuickLinkClick = (href) => {
    navigate(href);
    onClose();
  };

  const getSuggestionSubtitle = () => {
    if (suggestions.popularCategories?.length) {
      const categories = suggestions.popularCategories.slice(0, 3).map(({ category }) => `"${category}"`);
      return `Try searching for ${categories.join(', ')}`;
    }
    return 'Try refining your keywords or check spelling';
  };

  if (!hasResults) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p className="font-medium text-gray-700">
          {errorMessage ? 'Search temporarily unavailable' : `No results found for "${searchQuery}"`}
        </p>
        <p className="text-sm mt-2 text-gray-500">
          {errorMessage ? errorMessage : getSuggestionSubtitle()}
        </p>

        {suggestions.popularCategories?.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2">
              Popular Categories
            </h4>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.popularCategories.map(({ category, count }) => (
                <span
                  key={category}
                  className="inline-flex items-center px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium"
                >
                  {category}
                  <span className="ml-1 text-[10px] text-primary-500">({count})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {suggestions.upcomingEvents?.length > 0 && (
          <div className="mt-6 text-left">
            <h4 className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2">
              Upcoming Events
            </h4>
            <div className="space-y-2">
              {suggestions.upcomingEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => handleEventClick(event.id)}
                  className="w-full text-left p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{event.title}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(event.date)} • {event.location || 'Location TBD'}
                      </p>
                    </div>
                    <Eye className="h-4 w-4 text-gray-400 ml-3" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {suggestions.quickLinks?.length > 0 && (
          <div className="mt-6">
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.quickLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleQuickLinkClick(link.href)}
                  className="px-3 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 rounded-full transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Check if event is in the past
  const isEventPast = (event) => {
    if (!event.date) return false;
    const eventDate = new Date(event.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate < today;
  };

  // Render event card
  const renderEventCard = (event, showBadge = null) => {
    const isPast = isEventPast(event);
    
    return (
      <div
        key={event.id}
        onClick={() => handleEventClick(event.id)}
        className={`p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100 transition-colors ${isPast ? 'opacity-75' : ''}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-medium text-gray-900 line-clamp-1">{event.title}</h4>
              {showBadge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  showBadge === 'registered' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                }`}>
                  {showBadge === 'registered' ? 'Registered' : 'My Event'}
                </span>
              )}
              {isPast && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">
                  Past
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1 line-clamp-1">{event.description}</p>
            <div className="flex items-center mt-2 space-x-3 text-xs text-gray-500">
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {formatDate(event.date)}
              </div>
              <div className="flex items-center">
                <MapPin className="h-3 w-3 mr-1" />
                <span className="line-clamp-1">{event.location || 'Location TBD'}</span>
              </div>
            </div>
          </div>
          <Eye className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />
        </div>
      </div>
    );
  };

  return (
    <div className="max-h-96 overflow-y-auto">
      {/* My Registered Events (for regular users) */}
      {registeredEvents.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center mb-3">
            <Bookmark className="h-4 w-4 text-green-600 mr-2" />
            <h3 className="text-sm font-semibold text-gray-900">My Registrations ({registeredEvents.length})</h3>
          </div>
          <div className="space-y-2">
            {registeredEvents.slice(0, 3).map((event) => renderEventCard(event, 'registered'))}
          </div>
        </div>
      )}

      {/* My Created Events (for organizers/admins) */}
      {myEvents.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center mb-3">
            <FolderOpen className="h-4 w-4 text-purple-600 mr-2" />
            <h3 className="text-sm font-semibold text-gray-900">My Events ({myEvents.length})</h3>
          </div>
          <div className="space-y-2">
            {myEvents.slice(0, 3).map((event) => renderEventCard(event, 'created'))}
          </div>
        </div>
      )}

      {/* Discover Events */}
      {events.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center mb-3">
            <Search className="h-4 w-4 text-blue-600 mr-2" />
            <h3 className="text-sm font-semibold text-gray-900">
              {isOrganizerOrAdmin ? 'All Events' : 'Discover Events'} ({events.length})
            </h3>
          </div>
          <div className="space-y-2">
            {events.slice(0, 5).map((event) => renderEventCard(event))}
          </div>
        </div>
      )}

      {/* Participants Results (for organizers/admins only) */}
      {participants.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center mb-3">
            <Users className="h-4 w-4 text-orange-600 mr-2" />
            <h3 className="text-sm font-semibold text-gray-900">Participants ({participants.length})</h3>
          </div>
          <div className="space-y-2">
            {participants.slice(0, 3).map((participant) => (
              <div
                key={participant.id}
                onClick={() => handleParticipantClick(participant.event_id)}
                className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">
                      {participant.first_name} {participant.last_name}
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">{participant.email}</p>
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {participant.events?.title || 'Event'}
                      </div>
                    </div>
                  </div>
                  <Eye className="h-4 w-4 text-gray-400 ml-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View All Results */}
      {hasResults && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => {
              navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
              onClose();
            }}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View all {results?.total || 0} results
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
