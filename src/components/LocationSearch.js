import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';

const LocationSearch = ({ value, onChange, placeholder = "Search for specific venues, buildings, or addresses in the Philippines...", required = false }) => {
  const [searchQuery, setSearchQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const searchRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Sync searchQuery with value prop when it changes externally
  useEffect(() => {
    if (value !== searchQuery && value !== selectedLocation?.displayName) {
      setSearchQuery(value || '');
      setSelectedLocation(null);
    }
  }, [value]);

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search for locations using Nominatim (OpenStreetMap) - free and supports country filtering
  const searchLocations = async (query) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      // Using Nominatim API with Philippines country restriction
      // Include various place types for more specific results
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query)}` +
        `&countrycodes=ph` + // Restrict to Philippines
        `&format=json` +
        `&addressdetails=1` +
        `&extratags=1` + // Get extra tags for better place identification
        `&namedetails=1` + // Get name details
        `&limit=8`, // Increased limit for more specific results
        {
          headers: {
            'User-Agent': 'EventEase/1.0' // Required by Nominatim
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const formattedSuggestions = data.map((place) => {
          const addr = place.address || {};
          
          // Build specific location name (venue, building, or landmark)
          const specificName = place.name || 
                             place.address?.name || 
                             place.address?.amenity ||
                             place.address?.building ||
                             place.address?.road ||
                             place.address?.house_number ||
                             '';
          
          // Build full address components
          const street = place.address?.road || '';
          const streetNumber = place.address?.house_number || '';
          const building = place.address?.building || '';
          const venue = place.address?.amenity || place.address?.tourism || place.address?.shop || '';
          
          // Build address line
          let addressLine = '';
          if (streetNumber && street) {
            addressLine = `${streetNumber} ${street}`;
          } else if (street) {
            addressLine = street;
          } else if (building) {
            addressLine = building;
          } else if (venue) {
            addressLine = venue;
          }
          
          // Build location display
          const city = addr.city || addr.town || addr.municipality || addr.village || '';
          const province = addr.state || addr.province || addr.region || '';
          const barangay = addr.suburb || addr.neighbourhood || addr.city_district || '';
          
          // Format display name for dropdown
          let displayName = specificName || addressLine || place.display_name;
          
          // Add context to make it more specific
          const contextParts = [];
          if (addressLine && addressLine !== displayName) contextParts.push(addressLine);
          if (barangay) contextParts.push(barangay);
          if (city) contextParts.push(city);
          if (province) contextParts.push(province);
          
          const context = contextParts.length > 0 ? contextParts.join(', ') : '';
          
          return {
            id: place.place_id,
            displayName: displayName, // Primary name
            fullDisplayName: context ? `${displayName}, ${context}` : displayName, // Full address for display
            address: place.address,
            addressLine: addressLine,
            specificName: specificName,
            venue: venue,
            building: building,
            street: street,
            streetNumber: streetNumber,
            city: city,
            province: province,
            barangay: barangay,
            latitude: parseFloat(place.lat),
            longitude: parseFloat(place.lon),
            postcode: addr.postcode || '',
            placeType: place.type || place.class || 'location'
          };
        });

        // Sort suggestions: prioritize venues, buildings, and specific places over general areas
        formattedSuggestions.sort((a, b) => {
          const aScore = (a.venue ? 3 : 0) + (a.building ? 2 : 0) + (a.addressLine ? 1 : 0);
          const bScore = (b.venue ? 3 : 0) + (b.building ? 2 : 0) + (b.addressLine ? 1 : 0);
          return bScore - aScore;
        });

        setSuggestions(formattedSuggestions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error searching locations:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search - only search if query is different from current value
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    // Don't search if this matches the selected location
    if (selectedLocation && searchQuery === selectedLocation.displayName) {
      return;
    }

    const timeoutId = setTimeout(() => {
      searchLocations(searchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setSelectedLocation(null);
    
    // If user clears the field, clear the selected location
    if (!query) {
      onChange('');
    }
  };

  const handleSelectLocation = (location) => {
    setSelectedLocation(location);
    // Use full display name for the input field
    const fullLocation = location.fullDisplayName || location.displayName;
    setSearchQuery(fullLocation);
    setShowSuggestions(false);
    
    // Pass the full location string for better context
    onChange(fullLocation);
  };

  const handleClear = () => {
    setSearchQuery('');
    setSelectedLocation(null);
    setSuggestions([]);
    onChange('');
    if (searchRef.current) {
      searchRef.current.focus();
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MapPin className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={searchRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          className={`w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            required && !value ? 'border-red-300' : ''
          }`}
          placeholder={placeholder}
          required={required}
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          </div>
        )}
        {!loading && searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((location) => (
            <button
              key={location.id}
              type="button"
              onClick={() => handleSelectLocation(location)}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {/* Primary location name - venue, building, or street */}
                  <div className="font-medium text-gray-900 truncate">
                    {location.specificName || location.addressLine || location.venue || location.building || location.displayName}
                  </div>
                  
                  {/* Address details */}
                  {location.addressLine && location.specificName && location.addressLine !== location.specificName && (
                    <div className="text-sm text-gray-600 truncate mt-0.5">
                      {location.addressLine}
                    </div>
                  )}
                  
                  {/* Location context - barangay, city, province */}
                  <div className="text-sm text-gray-500 truncate mt-0.5">
                    {[
                      location.barangay,
                      location.city,
                      location.province,
                      'Philippines'
                    ].filter(Boolean).join(', ')}
                  </div>
                  
                  {/* Place type indicator */}
                  {(location.venue || location.building) && (
                    <div className="text-xs text-blue-600 mt-1">
                      {location.venue || location.building || 'Specific location'}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showSuggestions && !loading && searchQuery.length >= 3 && suggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-sm text-gray-500">
          No locations found. Try a different search term.
        </div>
      )}
    </div>
  );
};

export default LocationSearch;
