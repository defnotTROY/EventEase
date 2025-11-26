import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Tag, 
  Image, 
  Upload, 
  Sparkles,
  Save,
  Eye,
  X,
  Loader2,
  CheckCircle,
  ArrowLeft
} from 'lucide-react';
import { auth } from '../lib/supabase';
import { eventsService } from '../services/eventsService';
import { storageService } from '../services/storageService';
import { statusService } from '../services/statusService';
import LocationSearch from '../components/LocationSearch';

const EventEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    timeHour: '09',
    timeMinute: '00',
    timePeriod: 'AM',
    location: '',
    maxParticipants: '',
    category: '',
    tags: [],
    image: null,
    isVirtual: false,
    virtualLink: '',
    requirements: '',
    contactEmail: '',
    contactPhone: ''
  });

  const [aiSuggestions, setAiSuggestions] = useState([
    'Consider adding networking breaks for better engagement',
    'Based on similar events, 2-4 PM has highest attendance',
    'Include interactive elements like Q&A sessions',
    'Central locations see 25% higher registration rates'
  ]);

  const [currentStep, setCurrentStep] = useState(1);
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);

  const categories = [
    'Academic Conference',
    'Tech Summit',
    'Community Event',
    'Workshop',
    'Seminar',
    'Networking',
    'Cultural Event',
    'Sports Event'
  ];

  // Load event data
  useEffect(() => {
    const loadEventData = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { user } = await auth.getCurrentUser();
        if (!user) {
          navigate('/login');
          return;
        }
        setUser(user);

        // Load event data
        const { data: event, error } = await eventsService.getEventById(id);
        if (error) throw error;

        if (!event) {
          setError('Event not found');
          return;
        }

        // Check if user owns this event
        if (event.user_id !== user.id) {
          setError('You do not have permission to edit this event');
          return;
        }

        // Parse time into hour/minute/period
        let timeHour = '09';
        let timeMinute = '00';
        let timePeriod = 'AM';
        
        if (event.time) {
          // Handle formats like "09:00 AM", "14:00", "2:30 PM"
          const timeStr = event.time.trim();
          const ampmMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          const militaryMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
          
          if (ampmMatch) {
            timeHour = ampmMatch[1].padStart(2, '0');
            timeMinute = ampmMatch[2];
            timePeriod = ampmMatch[3].toUpperCase();
          } else if (militaryMatch) {
            let hour = parseInt(militaryMatch[1], 10);
            timeMinute = militaryMatch[2];
            if (hour === 0) {
              timeHour = '12';
              timePeriod = 'AM';
            } else if (hour < 12) {
              timeHour = hour.toString().padStart(2, '0');
              timePeriod = 'AM';
            } else if (hour === 12) {
              timeHour = '12';
              timePeriod = 'PM';
            } else {
              timeHour = (hour - 12).toString().padStart(2, '0');
              timePeriod = 'PM';
            }
          }
        }

        // Populate form with existing data
        setFormData({
          title: event.title || '',
          description: event.description || '',
          date: event.date || '',
          timeHour,
          timeMinute,
          timePeriod,
          location: event.location || '',
          maxParticipants: event.max_participants || '',
          category: event.category || '',
          tags: event.tags || [],
          image: event.image_url ? event.image_url : null,
          isVirtual: event.is_virtual || false,
          virtualLink: event.virtual_link || '',
          requirements: event.requirements || '',
          contactEmail: event.contact_email || '',
          contactPhone: event.contact_phone || ''
        });

        if (event.image_url) {
          setImagePreview(event.image_url);
        }

      } catch (error) {
        console.error('Error loading event:', error);
        setError(error.message || 'Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadEventData();
    }
  }, [id, navigate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTagAdd = (tag) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const handleTagRemove = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setImageUploading(true);
    try {
      const imageUrl = await storageService.uploadEventImage(file, user.id);
      setFormData(prev => ({ ...prev, image: imageUrl }));
      setImagePreview(imageUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Failed to upload image');
    } finally {
      setImageUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Validate required fields
      if (!formData.title || !formData.date) {
        setError('Title and date are required');
        return;
      }

      // Convert AM/PM time to 24-hour format for database storage
      let hour24 = parseInt(formData.timeHour, 10);
      if (formData.timePeriod === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (formData.timePeriod === 'AM' && hour24 === 12) {
        hour24 = 0;
      }
      const formattedTime = `${hour24.toString().padStart(2, '0')}:${formData.timeMinute}`;

      // Prepare event data
      const eventData = {
        title: formData.title,
        description: formData.description,
        date: formData.date,
        time: formattedTime,
        location: formData.location,
        max_participants: parseInt(formData.maxParticipants) || null,
        category: formData.category,
        tags: formData.tags,
        image_url: formData.image,
        is_virtual: formData.isVirtual,
        virtual_link: formData.virtualLink,
        requirements: formData.requirements,
        contact_email: formData.contactEmail,
        contact_phone: formData.contactPhone
      };

      // Update event
      const { error } = await eventsService.updateEvent(id, eventData);
      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        navigate('/events');
      }, 1500);

    } catch (error) {
      console.error('Error updating event:', error);
      setError(error.message || 'Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary-600" />
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/events')}
            className="btn-primary"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Event Updated!</h2>
          <p className="text-gray-600">Redirecting to events page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
              <button
                onClick={() => navigate('/events')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">Edit Event</h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">Update your event details</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 pl-11 sm:pl-0">
              {/* Mobile: Icon-only Preview button */}
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className={`sm:hidden p-2.5 rounded-lg font-medium transition-colors ${
                  previewMode 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                title={previewMode ? 'Edit Mode' : 'Preview'}
              >
                <Eye size={18} />
              </button>
              
              {/* Desktop: Full Preview button */}
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className={`hidden sm:flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  previewMode 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Eye size={16} className="mr-2" />
                {previewMode ? 'Edit Mode' : 'Preview'}
              </button>
              
              {/* Mobile: Icon-only Save button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="sm:hidden btn-primary p-2.5 flex items-center justify-center"
                title="Save Changes"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
              </button>
              
              {/* Desktop: Full Save button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="hidden sm:flex btn-primary items-center"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                  <Save size={16} className="mr-2" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <X className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Basic Information */}
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter event title"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Describe your event..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline mr-1" size={16} />
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="inline mr-1" size={16} />
                  Time
                </label>
                <div className="flex flex-wrap sm:flex-nowrap gap-2">
                  <select
                    name="timeHour"
                    value={formData.timeHour}
                    onChange={handleInputChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent flex-1 min-w-[60px] sm:w-20 sm:flex-initial"
                  >
                    {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(hour => (
                      <option key={hour} value={hour}>{hour}</option>
                    ))}
                  </select>
                  <span className="flex items-center text-gray-500 font-medium">:</span>
                  <select
                    name="timeMinute"
                    value={formData.timeMinute}
                    onChange={handleInputChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent flex-1 min-w-[60px] sm:w-20 sm:flex-initial"
                  >
                    {['00', '15', '30', '45'].map(minute => (
                      <option key={minute} value={minute}>{minute}</option>
                    ))}
                  </select>
                  <select
                    name="timePeriod"
                    value={formData.timePeriod}
                    onChange={handleInputChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent flex-1 min-w-[60px] sm:w-20 sm:flex-initial"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="inline mr-1" size={16} />
                  Location <span className="text-xs text-gray-500 font-normal">(Philippines only)</span>
                </label>
                <LocationSearch
                  value={formData.location}
                  onChange={(location) => setFormData({ ...formData, location })}
                  placeholder="Search for specific venues, buildings, or addresses..."
                />
                <p className="mt-2 text-xs text-gray-500">
                  Start typing to search for specific venues, buildings, or addresses (e.g., "SM Megamall", "Ayala Center", "123 Rizal Avenue").
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="inline mr-1" size={16} />
                  Max Participants
                </label>
                <input
                  type="number"
                  name="maxParticipants"
                  value={formData.maxParticipants}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Maximum attendees"
                />
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Additional Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Email
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="contact@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Requirements
                </label>
                <textarea
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Any special requirements or prerequisites..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventEdit;
