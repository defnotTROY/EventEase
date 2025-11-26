import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  AlertCircle
} from 'lucide-react';
import { auth } from '../lib/supabase';
import { eventsService } from '../services/eventsService';
import { storageService } from '../services/storageService';
import { statusService } from '../services/statusService';
import { canCreateEvents, isOrganizer } from '../services/roleService';
import { verificationService } from '../services/verificationService';
import { useToast } from '../contexts/ToastContext';
import LocationSearch from '../components/LocationSearch';

const EventCreation = () => {
  const navigate = useNavigate();
  const { error: showError } = useToast();
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [isVerified, setIsVerified] = useState(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

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

  // Get current user and check permissions
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { user } = await auth.getCurrentUser();
        setUser(user);
        
        if (!user) {
          navigate('/login');
          return;
        }

        // Check if user can create events
        if (!canCreateEvents(user)) {
          navigate('/events', { replace: true });
          showError('Only event organizers can create events. Please contact an administrator if you need organizer access.');
          return;
        }

        // Check verification status for organizers (admins don't need verification)
        const adminStatus = user.user_metadata?.role === 'Administrator' || user.user_metadata?.role === 'Admin';
        if (isOrganizer(user) && !adminStatus) {
          const verified = await verificationService.isVerified(user.id);
          setIsVerified(verified);
          
          if (!verified) {
            setShowVerificationModal(true);
          }
        } else {
          setIsVerified(true); // Admins don't need verification
        }
      } catch (error) {
        console.error('Error getting user:', error);
        navigate('/login');
      }
    };

    getCurrentUser();
  }, [navigate]);

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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setImageUploading(true);
    setError(null);

    try {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      // Store file for later upload
      setFormData(prev => ({
        ...prev,
        image: file
      }));

    } catch (error) {
      console.error('Error handling image upload:', error);
      setError('Failed to process image. Please try again.');
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to create an event');
      return;
    }

    // Check verification status for organizers
    const adminStatus = user.user_metadata?.role === 'Administrator' || user.user_metadata?.role === 'Admin';
    if (isOrganizer(user) && !adminStatus) {
      if (isVerified === false) {
        setShowVerificationModal(true);
        setError('Please verify your identity before creating events.');
        return;
      }
      
      // Double-check verification status
      if (isVerified === null) {
        const verified = await verificationService.isVerified(user.id);
        setIsVerified(verified);
        if (!verified) {
          setShowVerificationModal(true);
          setError('Please verify your identity before creating events.');
          return;
        }
      }
    }

    // Validate required fields
    if (!formData.title || !formData.description || !formData.date || !formData.location || !formData.category) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let imageUrl = null;

      // Upload image if provided
      if (formData.image) {
        const { data: uploadData, error: uploadError } = await storageService.uploadEventImage(
          formData.image, 
          user.id, 
          'temp' // We'll use temp since we don't have event ID yet
        );
        
        if (uploadError) throw uploadError;
        imageUrl = uploadData.publicUrl;
      }

      // Convert AM/PM time to 24-hour format for database storage
      let hour24 = parseInt(formData.timeHour, 10);
      if (formData.timePeriod === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (formData.timePeriod === 'AM' && hour24 === 12) {
        hour24 = 0;
      }
      const formattedTime = `${hour24.toString().padStart(2, '0')}:${formData.timeMinute}`;

      // Prepare event data for Supabase
      const eventData = {
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        date: formData.date,
        time: formattedTime,
        location: formData.location,
        max_participants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
        category: formData.category,
        status: 'upcoming', // Always start as upcoming, will be updated later
        is_virtual: formData.isVirtual,
        virtual_link: formData.virtualLink || null,
        requirements: formData.requirements || null,
        contact_email: formData.contactEmail || null,
        contact_phone: formData.contactPhone || null,
        tags: formData.tags.length > 0 ? formData.tags : null,
        image_url: imageUrl,
        event_type: 'free'
      };

      // Create event in Supabase
      const { data, error } = await eventsService.createEvent(eventData);
      
      if (error) throw error;
      
      // Show success state
      setSuccess(true);
      
      // Redirect to events page after 2 seconds
      setTimeout(() => {
        navigate('/events');
      }, 2000);
      
    } catch (error) {
      console.error('Error creating event:', error);
      setError(error.message || 'Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Basic Information', icon: Calendar },
    { number: 2, title: 'Event Details', icon: MapPin },
    { number: 3, title: 'Settings & Contact', icon: Users },
    { number: 4, title: 'Review & Publish', icon: Eye }
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Enter event title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="input-field"
                placeholder="Describe your event..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time *
                </label>
                <div className="flex gap-2">
                  <select
                    name="timeHour"
                    value={formData.timeHour}
                    onChange={handleInputChange}
                    className="input-field w-20"
                    required
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
                    className="input-field w-20"
                    required
                  >
                    {['00', '15', '30', '45'].map(minute => (
                      <option key={minute} value={minute}>{minute}</option>
                    ))}
                  </select>
                  <select
                    name="timePeriod"
                    value={formData.timePeriod}
                    onChange={handleInputChange}
                    className="input-field w-20"
                    required
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="input-field"
                required
              >
                <option value="">Select category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location * <span className="text-xs text-gray-500 font-normal">(Philippines only)</span>
              </label>
                              <LocationSearch
                  value={formData.location}
                  onChange={(location) => setFormData({ ...formData, location })}
                  placeholder="Search for specific venues, buildings, or addresses..."
                  required
                />
              <p className="mt-2 text-xs text-gray-500">
                Start typing to search for specific venues, buildings, or addresses (e.g., "SM Megamall", "Ayala Center", "123 Rizal Avenue").
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Participants
                </label>
                <input
                  type="number"
                  name="maxParticipants"
                  value={formData.maxParticipants}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Enter max participants"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleTagAdd(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="input-field"
                  placeholder="Press Enter to add tags"
                />
              </div>
            </div>

            {formData.tags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Added Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                    >
                      {tag}
                      <button
                        onClick={() => handleTagRemove(tag)}
                        className="ml-2 text-primary-600 hover:text-primary-800"
                      >
                        <X size={16} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Image
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {imagePreview ? (
                  <div className="space-y-4">
                    <img
                      src={imagePreview}
                      alt="Event preview"
                      className="mx-auto h-32 w-48 object-cover rounded-lg"
                    />
                    <div className="flex justify-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setFormData(prev => ({ ...prev, image: null }));
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove Image
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                        disabled={imageUploading}
                      />
                      <label
                        htmlFor="image-upload"
                        className={`cursor-pointer px-4 py-2 rounded-lg ${
                          imageUploading 
                            ? 'bg-gray-400 text-white cursor-not-allowed' 
                            : 'bg-primary-600 text-white hover:bg-primary-700'
                        }`}
                      >
                        {imageUploading ? (
                          <div className="flex items-center">
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </div>
                        ) : (
                          'Upload Image'
                        )}
                      </label>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      PNG, JPG, GIF up to 5MB
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                name="isVirtual"
                checked={formData.isVirtual}
                onChange={handleInputChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label className="text-sm font-medium text-gray-700">
                This is a virtual event
              </label>
            </div>

            {formData.isVirtual && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Virtual Meeting Link
                </label>
                <input
                  type="url"
                  name="virtualLink"
                  value={formData.virtualLink}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="https://meet.google.com/..."
                />
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Requirements
              </label>
              <textarea
                name="requirements"
                value={formData.requirements}
                onChange={handleInputChange}
                rows={3}
                className="input-field"
                placeholder="Any special requirements for participants..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Email *
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="contact@example.com"
                  required
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
                  className="input-field"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">AI-Powered Suggestions</h4>
              <ul className="space-y-2">
                {aiSuggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-blue-800">
                    <Sparkles size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Preview</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">{formData.title || 'Event Title'}</h4>
                  <p className="text-sm text-gray-600">{formData.description || 'Event description will appear here...'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Date:</span> {formData.date || 'Not set'}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Time:</span> {formData.timeHour}:{formData.timeMinute} {formData.timePeriod}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Location:</span> {formData.location || 'Not set'}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Category:</span> {formData.category || 'Not set'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="publish-now"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="publish-now" className="text-sm font-medium text-gray-700">
                Publish event immediately
              </label>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">Before Publishing</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Review all event details carefully</li>
                <li>• Ensure contact information is correct</li>
                <li>• Check that date and time are accurate</li>
                <li>• Verify location details</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Event</h1>
          <p className="text-gray-600 mt-1">Set up your event with AI-powered suggestions and smart features</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="btn-secondary flex items-center"
          >
            <Eye size={20} className="mr-2" />
            {previewMode ? 'Edit Mode' : 'Preview'}
          </button>
          <button 
            onClick={() => navigate('/events')}
            className="btn-secondary flex items-center"
          >
            <Save size={20} className="mr-2" />
            Cancel
          </button>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            Event Created Successfully!
          </h3>
          <p className="text-green-700 mb-4">
            Your event has been created and is now live. Redirecting you to the events page...
          </p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <X className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep >= step.number
                  ? 'border-primary-500 bg-primary-500 text-white'
                  : 'border-gray-300 text-gray-500'
              }`}>
                {currentStep > step.number ? (
                  <span className="text-sm font-medium">✓</span>
                ) : (
                  <step.icon size={20} />
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-4 ${
                  currentStep > step.number ? 'bg-primary-500' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {steps[currentStep - 1].title}
          </h2>
          <p className="text-gray-600 mt-1">
            Step {currentStep} of {steps.length}
          </p>
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit}>
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex space-x-3">
              {currentStep < steps.length ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="btn-primary"
                >
                  Next Step
                </button>
              ) : (
                <button 
                  type="submit" 
                  className="btn-primary flex items-center"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Event...
                    </>
                  ) : (
                    'Create Event'
                  )}
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Verification Required Modal */}
        {showVerificationModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] px-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowVerificationModal(false);
              }
            }}
          >
            <div
              className="bg-white rounded-lg p-6 max-w-md w-full relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <AlertCircle className="text-yellow-500 mr-3" size={24} />
                  <h3 className="text-lg font-semibold">Verification Required</h3>
                </div>
                <button
                  onClick={() => setShowVerificationModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  You need to verify your identity before you can create events. This helps ensure a safe and secure experience for all participants.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>What you need to do:</strong>
                  </p>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                    <li>Go to your Settings page</li>
                    <li>Navigate to the Verification section</li>
                    <li>Upload a valid ID document</li>
                    <li>Wait for admin approval (usually within 24 hours)</li>
                  </ul>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowVerificationModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowVerificationModal(false);
                    navigate('/settings?tab=verification');
                  }}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  Go to Verification
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCreation;
