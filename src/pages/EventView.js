import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Tag, 
  Image as ImageIcon,
  Edit,
  Trash2,
  Share2,
  QrCode,
  ArrowLeft,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Mail,
  Phone,
  Globe
} from 'lucide-react';
import { auth } from '../lib/supabase';
import { eventsService } from '../services/eventsService';
import { statusService } from '../services/statusService';
import { verificationService } from '../services/verificationService';
import { isOrganizer } from '../services/roleService';
import { useToast } from '../contexts/ToastContext';
import EventQRCodeGenerator from '../components/EventQRCodeGenerator';

const EventView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isVerified, setIsVerified] = useState(null);
  const [registrationData, setRegistrationData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [registering, setRegistering] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOrganizerUser, setIsOrganizerUser] = useState(false);

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
        
        // Check if user is admin
        const adminStatus = user.user_metadata?.role === 'Administrator' || user.user_metadata?.role === 'Admin';
        setIsAdmin(adminStatus);
        
        // Check if user is organizer
        setIsOrganizerUser(isOrganizer(user));

        // Load event data
        const { data: eventData, error } = await eventsService.getEventById(id);
        if (error) throw error;

        if (!eventData) {
          setError('Event not found');
          return;
        }

        setEvent(eventData);

        // Load participant count
        const { data: count } = await eventsService.getEventParticipants(id);
        console.log('Participant count loaded:', count);
        setParticipantCount(count);

        // Check if user is already registered
        const { data: registered } = await eventsService.isUserRegistered(id, user.id);
        setIsRegistered(registered);

        // Check verification status (skip for admins)
        if (!adminStatus) {
          const verified = await verificationService.isVerified(user.id);
          setIsVerified(verified);
        } else {
          setIsVerified(true); // Admins don't need verification
        }

        // Pre-populate registration form with user data
        setRegistrationData({
          firstName: user.user_metadata?.first_name || '',
          lastName: user.user_metadata?.last_name || '',
          email: user.email || '',
          phone: user.user_metadata?.phone || ''
        });

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

  const handleDeleteEvent = async () => {
    const confirmed = await toast.confirm('Are you sure you want to delete this event? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    try {
      const { error } = await eventsService.deleteEvent(id);
      if (error) throw error;
      
      navigate('/events');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Unable to delete the event at this time. Please try again later.');
    }
  };

  const handleShareEvent = async () => {
    const eventUrl = `${window.location.origin}/events/${id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: event.description,
          url: eventUrl
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(eventUrl);
        toast.success('Event link has been copied to your clipboard.');
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    }
  };

  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    
    if (!registrationData.firstName || !registrationData.lastName || !registrationData.email) {
        toast.warning('Please complete all required fields before submitting.');
      return;
    }

    // Double-check verification before submitting
    if (!isAdmin && isVerified === false) {
      setShowRegistrationForm(false);
      setShowVerificationModal(true);
      return;
    }

    try {
      setRegistering(true);
      
      const { error } = await eventsService.registerForEvent(id, {
        userId: user.id,
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        email: registrationData.email,
        phone: registrationData.phone
      });

      if (error) throw error;

      // Update participant count
      const { data: count } = await eventsService.getEventParticipants(id);
      setParticipantCount(count);
      
      // Mark as registered
      setIsRegistered(true);
      
      // Close form
      setShowRegistrationForm(false);
      
      toast.success('You have been successfully registered for this event!');
      
    } catch (error) {
      console.error('Error registering for event:', error);
      toast.error(error.message || 'Unable to complete registration at this time. Please try again later.');
    } finally {
      setRegistering(false);
    }
  };

  const handleRegisterClick = async () => {
    if (isAdmin) {
      toast.info('Administrators cannot register for events. As a platform administrator, you manage events rather than participate as an attendee.');
      return;
    }

    if (isOrganizerUser) {
      toast.info('Event organizers cannot register for events. As an organizer, you create and manage events rather than participate as an attendee.');
      return;
    }

    // Check verification status before opening registration form
    if (isVerified === false) {
      setShowVerificationModal(true);
      return;
    }

    // If verification status is unknown, check it
    if (isVerified === null && user) {
      const verified = await verificationService.isVerified(user.id);
      setIsVerified(verified);
      
      if (!verified) {
        setShowVerificationModal(true);
        return;
      }
    }

    setShowRegistrationForm(true);
  };

  const handleRegistrationInputChange = (e) => {
    const { name, value } = e.target;
    setRegistrationData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'ongoing': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'upcoming': return <Calendar className="w-4 h-4" />;
      case 'ongoing': return <CheckCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <X className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
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

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Event Not Found</h2>
          <p className="text-gray-600 mb-4">The event you're looking for doesn't exist.</p>
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

  const isOwner = user && event.user_id === user.id;
  const currentStatus = statusService.calculateEventStatus(event);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/events')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
                <div className="flex items-center space-x-4 mt-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentStatus)}`}>
                    {getStatusIcon(currentStatus)}
                    <span className="ml-1 capitalize">{currentStatus}</span>
                  </span>
                  {event.category && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                      <Tag className="w-4 h-4 mr-1" />
                      {event.category}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowQRCode(!showQRCode)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center"
              >
                <QrCode size={16} className="mr-2" />
                QR Code
              </button>
              
              <button
                onClick={handleShareEvent}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center"
              >
                <Share2 size={16} className="mr-2" />
                Share
              </button>
              
              {isOwner && (
                <>
                  <button
                    onClick={() => navigate(`/events/${event.id}/edit`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Edit size={16} className="mr-2" />
                    Edit
                  </button>
                  
                  <button
                    onClick={handleDeleteEvent}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center"
                  >
                    <Trash2 size={16} className="mr-2" />
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* QR Code Modal */}
        {showQRCode && event && (
          <EventQRCodeGenerator
            eventId={event.id}
            eventTitle={event.title}
            onClose={() => setShowQRCode(false)}
          />
        )}

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
                  You need to verify your identity before you can register for events. This helps ensure a safe and secure experience for all participants.
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

        {/* Registration Form Modal */}
        {showRegistrationForm && !isAdmin && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] px-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowRegistrationForm(false);
              }
            }}
          >
            <div 
              className="bg-white rounded-lg p-6 max-w-md w-full relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Register for Event</h3>
                <button
                  onClick={() => setShowRegistrationForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleRegistrationSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={registrationData.firstName}
                      onChange={handleRegistrationInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={registrationData.lastName}
                      onChange={handleRegistrationInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={registrationData.email}
                    onChange={handleRegistrationInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={registrationData.phone}
                    onChange={handleRegistrationInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowRegistrationForm(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={registering}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
                  >
                    {registering ? (
                      <>
                        <Loader2 size={16} className="animate-spin mr-2" />
                        Registering...
                      </>
                    ) : (
                      'Register'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Image */}
            {event.image_url && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <img
                  src={event.image_url}
                  alt={event.title}
                  className="w-full h-64 object-cover"
                />
              </div>
            )}

            {/* Event Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Details</h2>
              
              {event.description && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Date</p>
                    <p className="text-gray-600">{new Date(event.date).toLocaleDateString()}</p>
                  </div>
                </div>
                
                {event.time && (
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Time</p>
                      <p className="text-gray-600">{event.time}</p>
                    </div>
                  </div>
                )}
                
                {event.location && (
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Location</p>
                      <p className="text-gray-600">{event.location}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Participants</p>
                    <p className="text-gray-600">
                      {participantCount} {event.max_participants ? `of ${event.max_participants}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              {event.requirements && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Requirements</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{event.requirements}</p>
                </div>
              )}
            </div>

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
                    >
                      <Tag className="w-4 h-4 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Information */}
            {(event.contact_email || event.contact_phone) && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="space-y-3">
                  {event.contact_email && (
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <a
                        href={`mailto:${event.contact_email}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {event.contact_email}
                      </a>
                    </div>
                  )}
                  {event.contact_phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <a
                        href={`tel:${event.contact_phone}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {event.contact_phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Virtual Event */}
            {event.is_virtual && event.virtual_link && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Virtual Event</h3>
                <div className="flex items-center space-x-3">
                  <Globe className="w-5 h-5 text-gray-400" />
                  <a
                    href={event.virtual_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Join Virtual Event
                  </a>
                </div>
              </div>
            )}

            {/* Registration */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Registered</span>
                  <span className="font-medium">{participantCount}</span>
                </div>
                {event.max_participants && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Capacity</span>
                    <span className="font-medium">{event.max_participants}</span>
                  </div>
                )}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: event.max_participants
                        ? `${Math.min((participantCount / event.max_participants) * 100, 100)}%`
                        : '0%'
                    }}
                  ></div>
                </div>
              </div>
              
              {(isAdmin || isOrganizerUser) ? (
                <div className="w-full mt-4 px-4 py-2 rounded-lg font-medium bg-gray-400 text-white cursor-not-allowed flex items-center justify-center">
                  <UserPlus size={16} className="mr-2" />
                  {isAdmin ? 'Admins Cannot Register' : 'Organizers Cannot Register'}
                </div>
              ) : (
                <button 
                  onClick={handleRegisterClick}
                  disabled={isRegistered || (event.max_participants && participantCount >= event.max_participants)}
                  className={`w-full mt-4 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center ${
                    isRegistered 
                      ? 'bg-green-600 text-white cursor-not-allowed' 
                      : (event.max_participants && participantCount >= event.max_participants)
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  <UserPlus size={16} className="mr-2" />
                  {isRegistered 
                    ? 'Already Registered' 
                    : (event.max_participants && participantCount >= event.max_participants)
                    ? 'Event Full'
                    : 'Register for Event'
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventView;
