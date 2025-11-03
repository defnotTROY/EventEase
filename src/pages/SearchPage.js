import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Calendar, Users, MapPin, Clock, Eye, Loader2 } from 'lucide-react';
import { auth } from '../lib/supabase';
import { searchService } from '../services/searchService';

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [user, setUser] = useState(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { user } = await auth.getCurrentUser();
        setUser(user);
        if (!user) {
          navigate('/login');
        }
      } catch (error) {
        console.error('Error getting user:', error);
        navigate('/login');
      }
    };

    getCurrentUser();
  }, [navigate]);

  // Perform search when component mounts or query changes
  useEffect(() => {
    if (searchQuery.trim() && user) {
      performSearch();
    }
  }, [searchQuery, user]);

  const performSearch = async () => {
    if (!searchQuery.trim() || !user) return;

    setIsSearching(true);
    try {
      const results = await searchService.globalSearch(user.id, searchQuery.trim());
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({ events: [], participants: [], total: 0, error: 'Search failed' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

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
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Search Results</h1>
          <p className="text-gray-600 mt-1">
            {searchQuery ? `Searching for "${searchQuery}"` : 'Enter a search term to find events and participants'}
          </p>
        </div>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search events, participants, or analytics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="btn-primary px-6"
            disabled={!searchQuery.trim()}
          >
            Search
          </button>
        </form>
      </div>

      {/* Loading State */}
      {isSearching && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Searching...</p>
          </div>
        </div>
      )}

      {/* Search Results */}
      {!isSearching && searchResults && (
        <>
          {/* Results Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              Found <span className="font-semibold">{searchResults.total}</span> results for "{searchQuery}"
              {searchResults.events.length > 0 && (
                <span> • <span className="font-semibold">{searchResults.events.length}</span> events</span>
              )}
              {searchResults.participants.length > 0 && (
                <span> • <span className="font-semibold">{searchResults.participants.length}</span> participants</span>
              )}
            </p>
          </div>

          {/* Events Results */}
          {searchResults.events.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Events ({searchResults.events.length})</h2>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {searchResults.events.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(event.id)}
                    className="p-6 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{event.title}</h3>
                        <p className="text-gray-600 mb-3 line-clamp-2">{event.description}</p>
                        <div className="flex items-center space-x-6 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(event.date)}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {event.location || 'Location TBD'}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {event.time || 'Time TBD'}
                          </div>
                        </div>
                      </div>
                      <Eye className="h-5 w-5 text-gray-400 ml-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Participants Results */}
          {searchResults.participants.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-green-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Participants ({searchResults.participants.length})</h2>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {searchResults.participants.map((participant) => (
                  <div
                    key={participant.id}
                    onClick={() => handleEventClick(participant.event_id)}
                    className="p-6 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 mb-1">
                          {participant.first_name} {participant.last_name}
                        </h3>
                        <p className="text-gray-600 mb-2">{participant.email}</p>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          {participant.events?.title || 'Event'}
                        </div>
                      </div>
                      <Eye className="h-5 w-5 text-gray-400 ml-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {searchResults.total === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Search size={64} className="mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-500 mb-6">
                Try searching with different keywords or check your spelling
              </p>
              <button
                onClick={() => navigate('/events')}
                className="btn-primary"
              >
                View All Events
              </button>
            </div>
          )}
        </>
      )}

      {/* Initial State */}
      {!searchQuery && !isSearching && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search size={64} className="mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Start Searching</h3>
          <p className="text-gray-500 mb-6">
            Enter a search term above to find events and participants
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
