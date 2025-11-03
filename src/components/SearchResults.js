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

  if (!results || (results.events.length === 0 && results.participants.length === 0)) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No results found for "{searchQuery}"</p>
        <p className="text-sm mt-1">Try searching for events, participants, or locations</p>
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      {/* Events Results */}
      {results.events.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center mb-3">
            <Calendar className="h-4 w-4 text-blue-600 mr-2" />
            <h3 className="text-sm font-semibold text-gray-900">Events ({results.events.length})</h3>
          </div>
          <div className="space-y-2">
            {results.events.map((event) => (
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
      {results.participants.length > 0 && (
        <div className="p-4">
          <div className="flex items-center mb-3">
            <Users className="h-4 w-4 text-green-600 mr-2" />
            <h3 className="text-sm font-semibold text-gray-900">Participants ({results.participants.length})</h3>
          </div>
          <div className="space-y-2">
            {results.participants.map((participant) => (
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
      {(results.events.length > 0 || results.participants.length > 0) && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => {
              navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
              onClose();
            }}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View all {results.total} results
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
