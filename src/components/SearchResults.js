import React from 'react';
import { Calendar, Users, MapPin, Clock, Eye } from 'lucide-react';
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
  const participants = results?.participants || [];
  const suggestions = results?.suggestions || {};
  const errorMessage = results?.error;
  const hasResults = events.length > 0 || participants.length > 0;

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

  return (
    <div className="max-h-96 overflow-y-auto">
      {/* Events Results */}
      {events.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center mb-3">
            <Calendar className="h-4 w-4 text-blue-600 mr-2" />
            <h3 className="text-sm font-semibold text-gray-900">Events ({events.length})</h3>
          </div>
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                onClick={() => handleEventClick(event.id)}
                className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 line-clamp-1">{event.title}</h4>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{event.description}</p>
                    <div className="flex items-center mt-2 space-x-3 text-xs text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(event.date)}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {event.location || 'Location TBD'}
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

      {/* Participants Results */}
      {participants.length > 0 && (
        <div className="p-4">
          <div className="flex items-center mb-3">
            <Users className="h-4 w-4 text-green-600 mr-2" />
            <h3 className="text-sm font-semibold text-gray-900">Participants ({participants.length})</h3>
          </div>
          <div className="space-y-2">
            {participants.map((participant) => (
              <div
                key={participant.id}
                onClick={() => handleParticipantClick(participant.event_id)}
                className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100"
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
      {(events.length > 0 || participants.length > 0) && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => {
              navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
              onClose();
            }}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View all {results?.total ?? events.length + participants.length} results
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
