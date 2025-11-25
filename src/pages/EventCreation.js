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
  Ticket,
  Plus,
  Trash2,
  Edit2,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { auth } from '../lib/supabase';
import { eventsService } from '../services/eventsService';
import { storageService } from '../services/storageService';
import { statusService } from '../services/statusService';
import { ticketService } from '../services/ticketService';
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
    time: '',
    location: '',
    maxParticipants: '',
    category: '',
    tags: [],
    image: null,
    isVirtual: false,
    virtualLink: '',
    requirements: '',
    contactEmail: '',
    contactPhone: '',
    eventType: 'free' // 'free' or 'paid'
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
  const [tickets, setTickets] = useState([]);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [ticketFormData, setTicketFormData] = useState({
    ticketType: 'General',
    name: '',
    description: '',
    price: '0',
    currency: 'USD',
    quantity: '',
    minPerOrder: '1',
    maxPerOrder: '',
    saleStartDate: '',
    saleEndDate: '',
    isActive: true,
    isVisible: true,
    sortOrder: '0'
  });
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
    if (!formData.title || !formData.description || !formData.date || !formData.time || !formData.location || !formData.category) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate paid events must have at least one ticket
    if (formData.eventType === 'paid' && tickets.length === 0) {
      setError('Paid events require at least one ticket type. Please add a ticket or change to a free event.');
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

      // Prepare event data for Supabase
      const eventData = {
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        date: formData.date,
        time: formData.time,
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
        event_type: formData.eventType || 'free' // Save event type (free/paid)
      };

      // Create event in Supabase
      const { data, error } = await eventsService.createEvent(eventData);
      
      if (error) throw error;
      
      // Create tickets if any
      if (tickets.length > 0 && data?.id) {
        for (const ticket of tickets) {
          await ticketService.createTicket(data.id, ticket);
        }
      }
      
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
    { number: 3, title: 'Tickets & Pricing', icon: Ticket },
    { number: 4, title: 'Settings & Contact', icon: Users },
    { number: 5, title: 'Review & Publish', icon: Eye }
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
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                />
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
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Tickets & Pricing</h3>
                <p className="text-sm text-gray-600 mt-1">Set up ticket types and prices for your event</p>
              </div>
            </div>

            {/* Event Type Selection (Free/Paid) */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Event Type *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, eventType: 'free' });
                    // Clear tickets if switching to free
                    if (formData.eventType === 'paid') {
                      setTickets([]);
                      setShowTicketForm(false);
                    }
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.eventType === 'free'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center mb-2">
                    <Ticket className={`h-8 w-8 ${formData.eventType === 'free' ? 'text-primary-600' : 'text-gray-400'}`} />
                  </div>
                  <h4 className={`font-semibold text-center ${formData.eventType === 'free' ? 'text-primary-900' : 'text-gray-700'}`}>
                    Free Event
                  </h4>
                  <p className="text-xs text-gray-600 text-center mt-1">No payment required</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, eventType: 'paid' });
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.eventType === 'paid'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center mb-2">
                    <DollarSign className={`h-8 w-8 ${formData.eventType === 'paid' ? 'text-primary-600' : 'text-gray-400'}`} />
                  </div>
                  <h4 className={`font-semibold text-center ${formData.eventType === 'paid' ? 'text-primary-900' : 'text-gray-700'}`}>
                    Paid Event
                  </h4>
                  <p className="text-xs text-gray-600 text-center mt-1">Requires ticket purchase</p>
                </button>
              </div>
            </div>

            {/* Ticket Management (only for paid events) */}
            {formData.eventType === 'paid' && (
              <>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">Add ticket types for your paid event</p>
              <button
                type="button"
                onClick={() => {
                  setEditingTicket(null);
                  setTicketFormData({
                    ticketType: 'General',
                    name: '',
                    description: '',
                    price: '0',
                    currency: 'USD',
                    quantity: '',
                    minPerOrder: '1',
                    maxPerOrder: '',
                    saleStartDate: '',
                    saleEndDate: '',
                    isActive: true,
                    isVisible: true,
                    sortOrder: tickets.length.toString()
                  });
                  setShowTicketForm(true);
                }}
                className="btn-primary flex items-center"
              >
                <Plus size={20} className="mr-2" />
                Add Ticket Type
              </button>
            </div>
              </>
            )}

            {showTicketForm && (
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4">
                  {editingTicket !== null ? 'Edit Ticket' : 'Add New Ticket'}
                </h4>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ticket Type *
                      </label>
                      <select
                        value={ticketFormData.ticketType}
                        onChange={(e) => setTicketFormData({ ...ticketFormData, ticketType: e.target.value })}
                        className="input-field"
                      >
                        <option value="General">General Admission</option>
                        <option value="VIP">VIP</option>
                        <option value="Early Bird">Early Bird</option>
                        <option value="Student">Student</option>
                        <option value="Senior">Senior</option>
                        <option value="Group">Group</option>
                        <option value="Premium">Premium</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Display Name *
                      </label>
                      <input
                        type="text"
                        value={ticketFormData.name}
                        onChange={(e) => setTicketFormData({ ...ticketFormData, name: e.target.value })}
                        className="input-field"
                        placeholder="e.g., General Admission"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={ticketFormData.description}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, description: e.target.value })}
                      rows={2}
                      className="input-field"
                      placeholder="What's included with this ticket..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price *
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={ticketFormData.price}
                          onChange={(e) => setTicketFormData({ ...ticketFormData, price: e.target.value })}
                          className="input-field pl-10"
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Currency
                      </label>
                      <select
                        value={ticketFormData.currency}
                        onChange={(e) => setTicketFormData({ ...ticketFormData, currency: e.target.value })}
                        className="input-field"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="PHP">PHP (₱)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity Available
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={ticketFormData.quantity}
                        onChange={(e) => setTicketFormData({ ...ticketFormData, quantity: e.target.value })}
                        className="input-field"
                        placeholder="Leave empty for unlimited"
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited tickets</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Min per Order
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={ticketFormData.minPerOrder}
                        onChange={(e) => setTicketFormData({ ...ticketFormData, minPerOrder: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max per Order
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={ticketFormData.maxPerOrder}
                        onChange={(e) => setTicketFormData({ ...ticketFormData, maxPerOrder: e.target.value })}
                        className="input-field"
                        placeholder="Leave empty for unlimited"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sale Start Date
                      </label>
                      <input
                        type="datetime-local"
                        value={ticketFormData.saleStartDate}
                        onChange={(e) => setTicketFormData({ ...ticketFormData, saleStartDate: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sale End Date
                      </label>
                      <input
                        type="datetime-local"
                        value={ticketFormData.saleEndDate}
                        onChange={(e) => setTicketFormData({ ...ticketFormData, saleEndDate: e.target.value })}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={ticketFormData.isActive}
                        onChange={(e) => setTicketFormData({ ...ticketFormData, isActive: e.target.checked })}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Active</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={ticketFormData.isVisible}
                        onChange={(e) => setTicketFormData({ ...ticketFormData, isVisible: e.target.checked })}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Visible to Public</span>
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTicketForm(false);
                        setEditingTicket(null);
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!ticketFormData.name || !ticketFormData.price) {
                          setError('Please fill in required fields (Name and Price)');
                          return;
                        }

                        if (editingTicket !== null) {
                          // Update existing ticket
                          const updatedTickets = [...tickets];
                          updatedTickets[editingTicket] = { ...ticketFormData };
                          setTickets(updatedTickets);
                        } else {
                          // Add new ticket
                          setTickets([...tickets, { ...ticketFormData }]);
                        }
                        
                        setShowTicketForm(false);
                        setEditingTicket(null);
                        setTicketFormData({
                          ticketType: 'General',
                          name: '',
                          description: '',
                          price: '0',
                          currency: 'USD',
                          quantity: '',
                          minPerOrder: '1',
                          maxPerOrder: '',
                          saleStartDate: '',
                          saleEndDate: '',
                          isActive: true,
                          isVisible: true,
                          sortOrder: tickets.length.toString()
                        });
                      }}
                      className="btn-primary"
                    >
                      {editingTicket !== null ? 'Update Ticket' : 'Add Ticket'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tickets.length > 0 ? (
              <div className="space-y-3">
                {tickets.map((ticket, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{ticket.name}</h4>
                          <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded">
                            {ticket.ticketType}
                          </span>
                        </div>
                        {ticket.description && (
                          <p className="text-sm text-gray-600 mb-2">{ticket.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="font-medium text-gray-900">
                            {ticket.currency === 'USD' ? '$' : ticket.currency === 'PHP' ? '₱' : ticket.currency === 'EUR' ? '€' : '£'}
                            {parseFloat(ticket.price).toFixed(2)}
                          </span>
                          {ticket.quantity && (
                            <span>Quantity: {ticket.quantity}</span>
                          )}
                          {!ticket.quantity && (
                            <span className="text-green-600">Unlimited</span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTicket(index);
                            setTicketFormData({ ...ticket });
                            setShowTicketForm(true);
                          }}
                          className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTickets(tickets.filter((_, i) => i !== index));
                          }}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <Ticket className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600 mb-2">No tickets added yet</p>
                <p className="text-sm text-gray-500">Click "Add Ticket Type" to create your first ticket</p>
              </div>
            )}

            {formData.eventType === 'paid' && tickets.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                <strong>Note:</strong> You need to add at least one ticket type for paid events. Click "Add Ticket Type" above to get started.
              </div>
            )}
            
            {formData.eventType === 'free' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                <CheckCircle className="h-4 w-4 inline mr-2" />
                This is a free event. No tickets are required. Participants can register directly.
              </div>
            )}
          </div>
        );

      case 4:
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

      case 5:
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
                    <span className="font-medium text-gray-700">Time:</span> {formData.time || 'Not set'}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Location:</span> {formData.location || 'Not set'}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Category:</span> {formData.category || 'Not set'}
                  </div>
                </div>
                {tickets.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h5 className="font-medium text-gray-900 mb-2">Tickets ({tickets.length})</h5>
                    <div className="space-y-2">
                      {tickets.map((ticket, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="text-gray-700">{ticket.name}</span>
                          <span className="font-medium text-gray-900">
                            {ticket.currency === 'USD' ? '$' : ticket.currency === 'PHP' ? '₱' : ticket.currency === 'EUR' ? '€' : '£'}
                            {parseFloat(ticket.price).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
