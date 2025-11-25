import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  User, 
  Bell, 
  Shield, 
  Globe, 
  Database, 
  Sparkles, 
  Save, 
  Eye,
  EyeOff,
  Check,
  X,
  Loader2
} from 'lucide-react';
import { auth } from '../lib/supabase';
import { notificationService } from '../services/notificationService';
import { pushNotificationService } from '../services/pushNotificationService';
import { verificationService } from '../services/verificationService';
import { useToast } from '../contexts/ToastContext';
import UserQRCode from '../components/UserQRCode';
import { Upload, FileText, CheckCircle, XCircle, Clock, AlertCircle, ShieldCheck } from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();
  const { success, error: showError, warning, info } = useToast();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pushNotificationEnabled, setPushNotificationEnabled] = useState(false);
  const [pushNotificationSupported, setPushNotificationSupported] = useState(false);
  const [verification, setVerification] = useState(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationFile, setVerificationFile] = useState(null);
  const [verificationFilePreview, setVerificationFilePreview] = useState(null);
  const [verificationFormData, setVerificationFormData] = useState({
    verificationType: 'identity',
    documentType: 'id_card'
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');

  const [profileData, setProfileData] = useState({
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@eventease.com',
    phone: '+1 (555) 123-4567',
    organization: 'EventEase Inc.',
    role: 'Event Organizer',
    timezone: 'UTC-5',
    language: 'English'
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    eventReminders: true,
    participantUpdates: true,
    systemAlerts: false,
    marketingEmails: false
  });

  const [smartNotificationPreferences, setSmartNotificationPreferences] = useState({
    frequency: 'real-time',
    categories: {
      music: true,
      sports: true,
      food: true,
      tech: true,
      arts: true,
      business: true,
      education: true,
      other: true
    },
    quiet_hours: {
      enabled: true,
      start: '22:00',
      end: '08:00'
    },
    priority_level: 'all',
    location_based: true,
    max_daily_notifications: 3,
    timely_suggestions: true,
    price_alerts: true,
    last_chance_reminders: true,
    nearby_alerts: true
  });

  const [aiSettings, setAiSettings] = useState({
    aiInsights: true,
    smartRecommendations: true,
    automatedScheduling: true,
    predictiveAnalytics: true,
    sentimentAnalysis: true,
    autoTagging: false
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordExpiry: 90,
    loginNotifications: true,
    suspiciousActivityAlerts: true
  });

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'verification', name: 'Verification', icon: ShieldCheck },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'ai', name: 'AI Settings', icon: Sparkles },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'integrations', name: 'Integrations', icon: Globe },
    { id: 'data', name: 'Data & Privacy', icon: Database }
  ];

  const timezones = [
    'UTC-12', 'UTC-11', 'UTC-10', 'UTC-9', 'UTC-8', 'UTC-7', 'UTC-6', 'UTC-5',
    'UTC-4', 'UTC-3', 'UTC-2', 'UTC-1', 'UTC+0', 'UTC+1', 'UTC+2', 'UTC+3',
    'UTC+4', 'UTC+5', 'UTC+6', 'UTC+7', 'UTC+8', 'UTC+9', 'UTC+10', 'UTC+11', 'UTC+12'
  ];

  const languages = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean', 'Arabic'];

  // Sync activeTab with URL param
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && tabs.some(tab => tab.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Load user data on component mount
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { user, error } = await auth.getCurrentUser();
        if (error || !user) {
          navigate('/login');
          return;
        }
        
        setUser(user);
        
        // Check if user is admin
        const adminStatus = user.user_metadata?.role === 'Administrator' || user.user_metadata?.role === 'Admin';
        setIsAdmin(adminStatus);
        
        // Load user profile data
        setProfileData(prev => ({
          ...prev,
          firstName: user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || '',
          lastName: user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ')[1] || '',
          email: user.email || '',
          phone: user.user_metadata?.phone || '',
          organization: user.user_metadata?.organization || '',
          role: user.user_metadata?.role || 'Event Organizer',
          timezone: user.user_metadata?.timezone || 'UTC-5',
          language: user.user_metadata?.language || 'English'
        }));

        // Load notification preferences
        const { data: prefs } = await notificationService.getPreferences(user.id);
        if (prefs) {
          setSmartNotificationPreferences(prefs);
        }

        // Check push notification support and status
        setPushNotificationSupported(pushNotificationService.isSupported);
        const isSubscribed = await pushNotificationService.isSubscribed(user.id);
        setPushNotificationEnabled(isSubscribed);

        // Load verification status
        const { data: verificationData } = await verificationService.getVerification(user.id);
        setVerification(verificationData);
        
      } catch (error) {
        console.error('Error loading user:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    getCurrentUser();
  }, [navigate]);

  const handleInputChange = (section, field, value) => {
    if (section === 'profile') {
      setProfileData(prev => ({ ...prev, [field]: value }));
    } else if (section === 'notifications') {
      setNotificationSettings(prev => ({ ...prev, [field]: value }));
    } else if (section === 'ai') {
      setAiSettings(prev => ({ ...prev, [field]: value }));
    } else if (section === 'security') {
      setSecuritySettings(prev => ({ ...prev, [field]: value }));
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    
    try {
      const { error } = await auth.updateUser({
        password: passwordData.newPassword
      });
      
      if (error) throw error;
      
      // Send custom password change notification
      await sendPasswordChangeNotification();
      
      success('Your password has been changed successfully. You will receive an email confirmation shortly.');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError(error.message || 'Failed to change password');
    }
  };

  const sendPasswordChangeNotification = async () => {
    try {
      // This would typically call your backend API to send email
      // For now, we'll just log it - you can implement email service later
      console.log('Password change notification would be sent to:', user?.email);
      
      // TODO: Implement actual email sending service
      // Example: await emailService.sendPasswordChangeNotification(user.email);
      
    } catch (error) {
      console.error('Error sending password change notification:', error);
      // Don't throw error here - password change was successful
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Save notification preferences
      await notificationService.updatePreferences(user.id, smartNotificationPreferences);

      // Prepare update data (email is not included - cannot be changed)
      const updateData = {
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        phone: profileData.phone,
        organization: profileData.organization,
        timezone: profileData.timezone,
        language: profileData.language,
        notification_settings: notificationSettings,
        ai_settings: aiSettings,
        security_settings: securitySettings
      };

      // Only allow role changes for admin users
      if (isAdmin) {
        updateData.role = profileData.role;
      }

      // Update user metadata in Supabase
      const { error } = await auth.updateUser({
        data: updateData
      });

      if (error) throw error;
      
      console.log('Settings saved successfully');
      success('Your settings have been saved successfully.');
      
    } catch (error) {
      console.error('Error saving settings:', error);
      showError('Unable to save settings at this time. Please try again later.');
    } finally {
      setSaving(false);
    }
  };

  const renderVerificationContent = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Verification</h2>
        <p className="text-gray-600">
          Upload verification documents for ethical event registration
        </p>
      </div>

      {/* Verification Status Badge */}
      {verification && (
        <div className={`p-4 rounded-lg border ${
          verification.status === 'approved' 
            ? 'bg-green-50 border-green-200' 
            : verification.status === 'rejected'
            ? 'bg-red-50 border-red-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center space-x-3">
            {verification.status === 'approved' ? (
              <CheckCircle className="text-green-600" size={24} />
            ) : verification.status === 'rejected' ? (
              <XCircle className="text-red-600" size={24} />
            ) : (
              <Clock className="text-yellow-600" size={24} />
            )}
            <div className="flex-1">
              <h4 className={`font-semibold ${
                verification.status === 'approved' 
                  ? 'text-green-900' 
                  : verification.status === 'rejected'
                  ? 'text-red-900'
                  : 'text-yellow-900'
              }`}>
                Verification Status: {verification.status === 'approved' ? 'Verified' : verification.status === 'rejected' ? 'Rejected' : verification.status === 'pending' ? 'Pending Review' : 'Under Review'}
              </h4>
              <p className={`text-sm mt-1 ${
                verification.status === 'approved' 
                  ? 'text-green-800' 
                  : verification.status === 'rejected'
                  ? 'text-red-800'
                  : 'text-yellow-800'
              }`}>
                {verification.status === 'approved' 
                  ? 'Your profile is verified. You can register for events that require verification.'
                  : verification.status === 'rejected'
                  ? 'Your verification was rejected. Please resubmit with correct documents.'
                  : 'Your verification is being reviewed by an administrator.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {verification && verification.status === 'approved' ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="text-green-600 mt-0.5" size={20} />
            <div className="flex-1">
              <h4 className="font-medium text-green-900 mb-1">Verification Approved</h4>
              <p className="text-sm text-green-800">
                Your profile has been verified. You can now register for events that require verification.
              </p>
              {verification.reviewed_at && (
                <p className="text-xs text-green-700 mt-2">
                  Approved on {new Date(verification.reviewed_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : verification && verification.status === 'rejected' ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-3">
            <XCircle className="text-red-600 mt-0.5" size={20} />
            <div className="flex-1">
              <h4 className="font-medium text-red-900 mb-1">Verification Rejected</h4>
              {verification.rejection_reason && (
                <p className="text-sm text-red-800 mb-2">
                  <strong>Reason:</strong> {verification.rejection_reason}
                </p>
              )}
              <p className="text-sm text-red-800">
                Please review the feedback and resubmit your verification documents.
              </p>
            </div>
          </div>
        </div>
      ) : verification && (verification.status === 'pending' || verification.status === 'under_review') ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-3">
            <Clock className="text-yellow-600 mt-0.5" size={20} />
            <div className="flex-1">
              <h4 className="font-medium text-yellow-900 mb-1">
                {verification.status === 'pending' ? 'Pending Review' : 'Under Review'}
              </h4>
              <p className="text-sm text-yellow-800">
                Your verification document is being reviewed by an administrator. You will be notified once the review is complete.
              </p>
              <p className="text-xs text-yellow-700 mt-2">
                Submitted on {new Date(verification.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {(!verification || ['rejected', 'pending'].includes(verification?.status)) && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Why Verification?</h4>
            <p className="text-sm text-blue-800 mb-2">
              We require profile verification to ensure ethical event registration and protect event organizers from fraudulent registrations.
            </p>
            <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
              <li>Prevents duplicate or fake registrations</li>
              <li>Ensures accurate participant data</li>
              <li>Protects event organizers</li>
              <li>Maintains platform integrity</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Type *
              </label>
              <select
                value={verificationFormData.verificationType}
                onChange={(e) => setVerificationFormData(prev => ({ ...prev, verificationType: e.target.value }))}
                className="input-field"
              >
                <option value="identity">Identity Verification</option>
                <option value="organization">Organization Certificate</option>
                <option value="student">Student ID</option>
                <option value="professional">Professional License</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type *
              </label>
              <select
                value={verificationFormData.documentType}
                onChange={(e) => setVerificationFormData(prev => ({ ...prev, documentType: e.target.value }))}
                className="input-field"
              >
                <option value="id_card">ID Card</option>
                <option value="passport">Passport</option>
                <option value="driver_license">Driver's License</option>
                <option value="student_id">Student ID</option>
                <option value="organization_certificate">Organization Certificate</option>
                <option value="professional_license">Professional License</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verification Document *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {verificationFilePreview ? (
                <div className="space-y-4">
                  {verificationFilePreview.type?.startsWith('image/') ? (
                    <img
                      src={verificationFilePreview.url}
                      alt="Document preview"
                      className="mx-auto max-h-48 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="flex items-center justify-center">
                      <FileText className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-sm text-gray-700">{verificationFile.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setVerificationFile(null);
                        setVerificationFilePreview(null);
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <div className="mt-4">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setVerificationFile(file);
                          if (file.type.startsWith('image/')) {
                            setVerificationFilePreview({
                              url: URL.createObjectURL(file),
                              type: file.type
                            });
                          } else {
                            setVerificationFilePreview({
                              url: null,
                              type: file.type
                            });
                          }
                        }
                      }}
                      className="hidden"
                      id="verification-upload"
                      disabled={verificationLoading}
                    />
                    <label
                      htmlFor="verification-upload"
                      className={`cursor-pointer px-4 py-2 rounded-lg ${
                        verificationLoading
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-primary-600 text-white hover:bg-primary-700'
                      }`}
                    >
                      {verificationLoading ? (
                        <div className="flex items-center">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </div>
                      ) : (
                        'Choose File'
                      )}
                    </label>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    PDF, JPG, PNG, GIF, DOC, DOCX up to 10MB
                  </p>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              if (!verificationFile) {
                warning('Please select a file to upload for verification.');
                return;
              }

              setVerificationLoading(true);
              try {
                const { data, error } = await verificationService.uploadVerification(
                  user.id,
                  verificationFile,
                  verificationFormData
                );

                if (error) throw error;

                setVerification(data);
                setVerificationFile(null);
                setVerificationFilePreview(null);
                success('Your verification document has been uploaded successfully. It will be reviewed by an administrator, typically within 24 hours.');
              } catch (error) {
                console.error('Error uploading verification:', error);
                showError(error.message || 'Unable to upload verification document at this time. Please ensure the file is valid and try again.');
              } finally {
                setVerificationLoading(false);
              }
            }}
            disabled={verificationLoading || !verificationFile}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verificationLoading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </div>
            ) : (
              verification ? 'Resubmit Verification' : 'Submit Verification'
            )}
          </button>

          {verification && verification.status === 'rejected' && (
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm('Are you sure you want to delete your current verification? You can upload a new one after deletion.')) {
                  return;
                }

                try {
                  const { error } = await verificationService.deleteVerification(verification.id, user.id);
                  if (error) throw error;
                  setVerification(null);
                  success('Verification deleted successfully. You can upload a new one.');
                } catch (error) {
                  console.error('Error deleting verification:', error);
                  showError('Failed to delete verification. Please try again.');
                }
              }}
              className="btn-secondary w-full"
            >
              Delete Current Verification
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'verification':
        return renderVerificationContent();
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={profileData.firstName}
                  onChange={(e) => handleInputChange('profile', 'firstName', e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={profileData.lastName}
                  onChange={(e) => handleInputChange('profile', 'lastName', e.target.value)}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                  <span className="text-xs text-gray-500 ml-2 font-normal">(Cannot be changed)</span>
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  readOnly
                  disabled
                  className="input-field bg-gray-100 cursor-not-allowed"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => handleInputChange('profile', 'phone', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization
                </label>
                <input
                  type="text"
                  value={profileData.organization}
                  onChange={(e) => handleInputChange('profile', 'organization', e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                  {!isAdmin && (
                    <span className="text-xs text-gray-500 ml-2">(Only administrators can change roles)</span>
                  )}
                </label>
                <input
                  type="text"
                  value={profileData.role}
                  onChange={(e) => handleInputChange('profile', 'role', e.target.value)}
                  className={`input-field ${!isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  disabled={!isAdmin}
                  readOnly={!isAdmin}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  value={profileData.timezone}
                  onChange={(e) => handleInputChange('profile', 'timezone', e.target.value)}
                  className="input-field"
                >
                  {timezones.map(timezone => (
                    <option key={timezone} value={timezone}>{timezone}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <select
                  value={profileData.language}
                  onChange={(e) => handleInputChange('profile', 'language', e.target.value)}
                  className="input-field"
                >
                  {languages.map(language => (
                    <option key={language} value={language}>{language}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Profile Information</h4>
              <p className="text-sm text-blue-800">
                Your profile information helps us personalize your experience and provide better support.
                This information is visible to event participants and organizers.
              </p>
            </div>

            {/* Verification Status Badge */}
            {verification && (
              <div className={`p-4 rounded-lg border ${
                verification.status === 'approved' 
                  ? 'bg-green-50 border-green-200' 
                  : verification.status === 'rejected'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-center space-x-3">
                  {verification.status === 'approved' ? (
                    <CheckCircle className="text-green-600" size={24} />
                  ) : verification.status === 'rejected' ? (
                    <XCircle className="text-red-600" size={24} />
                  ) : (
                    <Clock className="text-yellow-600" size={24} />
                  )}
                  <div className="flex-1">
                    <h4 className={`font-semibold ${
                      verification.status === 'approved' 
                        ? 'text-green-900' 
                        : verification.status === 'rejected'
                        ? 'text-red-900'
                        : 'text-yellow-900'
                    }`}>
                      Verification Status: {verification.status === 'approved' ? 'Verified' : verification.status === 'rejected' ? 'Rejected' : verification.status === 'pending' ? 'Pending Review' : 'Under Review'}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      verification.status === 'approved' 
                        ? 'text-green-800' 
                        : verification.status === 'rejected'
                        ? 'text-red-800'
                        : 'text-yellow-800'
                    }`}>
                      {verification.status === 'approved' 
                        ? 'Your profile is verified. You can register for events that require verification.'
                        : verification.status === 'rejected'
                        ? 'Your verification was rejected. Please resubmit with correct documents.'
                        : 'Your verification is being reviewed by an administrator.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Profile Verification Section */}
            <div className="mt-8 border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Profile Verification</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Upload verification documents for ethical event registration
                  </p>
                </div>
                {verification && verification.status === 'approved' && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle size={20} />
                    <span className="font-medium">Verified</span>
                  </div>
                )}
                {verification && verification.status === 'rejected' && (
                  <div className="flex items-center space-x-2 text-red-600">
                    <XCircle size={20} />
                    <span className="font-medium">Rejected</span>
                  </div>
                )}
                {verification && verification.status === 'pending' && (
                  <div className="flex items-center space-x-2 text-yellow-600">
                    <Clock size={20} />
                    <span className="font-medium">Pending Review</span>
                  </div>
                )}
                {verification && verification.status === 'under_review' && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <AlertCircle size={20} />
                    <span className="font-medium">Under Review</span>
                  </div>
                )}
              </div>

              {verification && verification.status === 'approved' ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="text-green-600 mt-0.5" size={20} />
                    <div className="flex-1">
                      <h4 className="font-medium text-green-900 mb-1">Verification Approved</h4>
                      <p className="text-sm text-green-800">
                        Your profile has been verified. You can now register for events that require verification.
                      </p>
                      {verification.reviewed_at && (
                        <p className="text-xs text-green-700 mt-2">
                          Approved on {new Date(verification.reviewed_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : verification && verification.status === 'rejected' ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <XCircle className="text-red-600 mt-0.5" size={20} />
                    <div className="flex-1">
                      <h4 className="font-medium text-red-900 mb-1">Verification Rejected</h4>
                      {verification.rejection_reason && (
                        <p className="text-sm text-red-800 mb-2">
                          <strong>Reason:</strong> {verification.rejection_reason}
                        </p>
                      )}
                      <p className="text-sm text-red-800">
                        Please review the feedback and resubmit your verification documents.
                      </p>
                    </div>
                  </div>
                </div>
              ) : verification && (verification.status === 'pending' || verification.status === 'under_review') ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <Clock className="text-yellow-600 mt-0.5" size={20} />
                    <div className="flex-1">
                      <h4 className="font-medium text-yellow-900 mb-1">
                        {verification.status === 'pending' ? 'Pending Review' : 'Under Review'}
                      </h4>
                      <p className="text-sm text-yellow-800">
                        Your verification document is being reviewed by an administrator. You will be notified once the review is complete.
                      </p>
                      <p className="text-xs text-yellow-700 mt-2">
                        Submitted on {new Date(verification.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {(!verification || ['rejected', 'pending'].includes(verification?.status)) && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Why Verification?</h4>
                    <p className="text-sm text-blue-800 mb-2">
                      We require profile verification to ensure ethical event registration and protect event organizers from fraudulent registrations.
                    </p>
                    <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                      <li>Prevents duplicate or fake registrations</li>
                      <li>Ensures accurate participant data</li>
                      <li>Protects event organizers</li>
                      <li>Maintains platform integrity</li>
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Verification Type *
                      </label>
                      <select
                        value={verificationFormData.verificationType}
                        onChange={(e) => setVerificationFormData(prev => ({ ...prev, verificationType: e.target.value }))}
                        className="input-field"
                      >
                        <option value="identity">Identity Verification</option>
                        <option value="organization">Organization Certificate</option>
                        <option value="student">Student ID</option>
                        <option value="professional">Professional License</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Document Type *
                      </label>
                      <select
                        value={verificationFormData.documentType}
                        onChange={(e) => setVerificationFormData(prev => ({ ...prev, documentType: e.target.value }))}
                        className="input-field"
                      >
                        <option value="id_card">ID Card</option>
                        <option value="passport">Passport</option>
                        <option value="driver_license">Driver's License</option>
                        <option value="student_id">Student ID</option>
                        <option value="organization_certificate">Organization Certificate</option>
                        <option value="professional_license">Professional License</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Verification Document *
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      {verificationFilePreview ? (
                        <div className="space-y-4">
                          {verificationFilePreview.type?.startsWith('image/') ? (
                            <img
                              src={verificationFilePreview.url}
                              alt="Document preview"
                              className="mx-auto max-h-48 object-contain rounded-lg"
                            />
                          ) : (
                            <div className="flex items-center justify-center">
                              <FileText className="h-16 w-16 text-gray-400" />
                            </div>
                          )}
                          <div className="flex items-center justify-center space-x-2">
                            <span className="text-sm text-gray-700">{verificationFile.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setVerificationFile(null);
                                setVerificationFilePreview(null);
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                          <div className="mt-4">
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  setVerificationFile(file);
                                  if (file.type.startsWith('image/')) {
                                    setVerificationFilePreview({
                                      url: URL.createObjectURL(file),
                                      type: file.type
                                    });
                                  } else {
                                    setVerificationFilePreview({
                                      url: null,
                                      type: file.type
                                    });
                                  }
                                }
                              }}
                              className="hidden"
                              id="verification-upload"
                              disabled={verificationLoading}
                            />
                            <label
                              htmlFor="verification-upload"
                              className={`cursor-pointer px-4 py-2 rounded-lg ${
                                verificationLoading
                                  ? 'bg-gray-400 text-white cursor-not-allowed'
                                  : 'bg-primary-600 text-white hover:bg-primary-700'
                              }`}
                            >
                              {verificationLoading ? (
                                <div className="flex items-center">
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Uploading...
                                </div>
                              ) : (
                                'Choose File'
                              )}
                            </label>
                          </div>
                          <p className="mt-2 text-sm text-gray-500">
                            PDF, JPG, PNG, GIF, DOC, DOCX up to 10MB
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!verificationFile) {
                        warning('Please select a file to upload for verification.');
                        return;
                      }

                      setVerificationLoading(true);
                      try {
                        const { data, error } = await verificationService.uploadVerification(
                          user.id,
                          verificationFile,
                          verificationFormData
                        );

                        if (error) throw error;

                        setVerification(data);
                        setVerificationFile(null);
                        setVerificationFilePreview(null);
                        success('Your verification document has been uploaded successfully. It will be reviewed by an administrator, typically within 24 hours.');
                      } catch (error) {
                        console.error('Error uploading verification:', error);
                        showError(error.message || 'Unable to upload verification document at this time. Please ensure the file is valid and try again.');
                      } finally {
                        setVerificationLoading(false);
                      }
                    }}
                    disabled={verificationLoading || !verificationFile}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {verificationLoading ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </div>
                    ) : (
                      verification ? 'Resubmit Verification' : 'Submit Verification'
                    )}
                  </button>

                  {verification && verification.status === 'rejected' && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm('Are you sure you want to delete your current verification? This action cannot be undone. You can upload a new verification document after deletion.')) {
                          return;
                        }

                        try {
                          const { error } = await verificationService.deleteVerification(verification.id, user.id);
                          if (error) throw error;
                          setVerification(null);
                          success('Your verification has been deleted successfully. You can now upload a new verification document.');
                        } catch (error) {
                          console.error('Error deleting verification:', error);
                          showError('Unable to delete verification at this time. Please try again later.');
                        }
                      }}
                      className="btn-secondary w-full"
                    >
                      Delete Current Verification
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* QR Code Section */}
            <div className="mt-8">
              <UserQRCode />
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            {/* Basic Email Notifications */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Email Notifications</h3>
              {Object.entries(notificationSettings).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {key === 'emailNotifications' && 'Receive notifications via email'}
                      {key === 'pushNotifications' && 'Receive push notifications in the app'}
                      {key === 'eventReminders' && 'Get reminded about upcoming events'}
                      {key === 'participantUpdates' && 'Notifications about participant changes'}
                      {key === 'systemAlerts' && 'Important system and security alerts'}
                      {key === 'marketingEmails' && 'Receive promotional and marketing content'}
                    </p>
                    {key === 'pushNotifications' && !pushNotificationSupported && (
                      <p className="text-xs text-red-600 mt-1">Push notifications are not supported in this browser</p>
                    )}
                    {key === 'pushNotifications' && pushNotificationSupported && !pushNotificationEnabled && value && (
                      <p className="text-xs text-yellow-600 mt-1">Click to enable push notifications</p>
                    )}
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={async (e) => {
                        const newValue = e.target.checked;
                        handleInputChange('notifications', key, newValue);
                        
                        // Handle push notification subscription
                        if (key === 'pushNotifications' && newValue && pushNotificationSupported) {
                          try {
                            await pushNotificationService.subscribe(user.id);
                            setPushNotificationEnabled(true);
                            success('Push notifications have been enabled successfully.');
                          } catch (error) {
                            console.error('Error enabling push notifications:', error);
                            handleInputChange('notifications', key, false);
                            showError('Unable to enable push notifications. Please check your browser settings and ensure notifications are allowed for this site.');
                          }
                        } else if (key === 'pushNotifications' && !newValue && pushNotificationEnabled) {
                          try {
                            await pushNotificationService.unsubscribe(user.id);
                            setPushNotificationEnabled(false);
                          } catch (error) {
                            console.error('Error disabling push notifications:', error);
                          }
                        }
                      }}
                      disabled={key === 'pushNotifications' && !pushNotificationSupported}
                      className="sr-only peer"
                    />
                    <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 ${key === 'pushNotifications' && !pushNotificationSupported ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                  </label>
                </div>
              ))}
            </div>

            {/* Smart Notification Preferences */}
            <div className="space-y-6 border-t border-gray-200 pt-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Smart Notifications</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Intelligent, contextual notifications based on your behavior and preferences. Max 2-3 per day to avoid spam.
                </p>
              </div>

              {/* Frequency Settings */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notification Frequency</label>
                  <select
                    value={smartNotificationPreferences.frequency}
                    onChange={(e) => setSmartNotificationPreferences(prev => ({ ...prev, frequency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="real-time">Real-time alerts</option>
                    <option value="daily-digest">Daily digest</option>
                    <option value="weekly-digest">Weekly digest</option>
                  </select>
                </div>

                {/* Max Daily Notifications */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Daily Notifications: {smartNotificationPreferences.max_daily_notifications}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={smartNotificationPreferences.max_daily_notifications}
                    onChange={(e) => setSmartNotificationPreferences(prev => ({ ...prev, max_daily_notifications: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">Recommended: 2-3 per day</p>
                </div>

                {/* Priority Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority Level</label>
                  <select
                    value={smartNotificationPreferences.priority_level}
                    onChange={(e) => setSmartNotificationPreferences(prev => ({ ...prev, priority_level: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">All notifications</option>
                    <option value="high-priority">High priority only</option>
                    <option value="urgent-only">Urgent only</option>
                  </select>
                </div>
              </div>

              {/* Notification Types */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Notification Types</h4>
                {[
                  { key: 'timely_suggestions', label: 'Timely Event Suggestions', desc: 'Concert by [artist you like] coming to your area next week' },
                  { key: 'price_alerts', label: 'Price Alerts', desc: 'Tickets dropped for events you viewed' },
                  { key: 'last_chance_reminders', label: 'Last-Chance Reminders', desc: 'Only 2 days left to register for relevant events' },
                  { key: 'nearby_alerts', label: 'Nearby Happening Alerts', desc: 'Real-time notifications when interesting events start near you' }
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{label}</h4>
                      <p className="text-sm text-gray-500">{desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={smartNotificationPreferences[key]}
                        onChange={(e) => setSmartNotificationPreferences(prev => ({ ...prev, [key]: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                ))}
              </div>

              {/* Category Preferences */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Event Categories</h4>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(smartNotificationPreferences.categories).map(([category, enabled]) => (
                    <div key={category} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <span className="text-sm font-medium text-gray-900 capitalize">{category}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => setSmartNotificationPreferences(prev => ({
                            ...prev,
                            categories: { ...prev.categories, [category]: e.target.checked }
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quiet Hours */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Quiet Hours</h4>
                    <p className="text-sm text-gray-500">No notifications during these hours</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smartNotificationPreferences.quiet_hours.enabled}
                      onChange={(e) => setSmartNotificationPreferences(prev => ({
                        ...prev,
                        quiet_hours: { ...prev.quiet_hours, enabled: e.target.checked }
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
                {smartNotificationPreferences.quiet_hours.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                      <input
                        type="time"
                        value={smartNotificationPreferences.quiet_hours.start}
                        onChange={(e) => setSmartNotificationPreferences(prev => ({
                          ...prev,
                          quiet_hours: { ...prev.quiet_hours, start: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                      <input
                        type="time"
                        value={smartNotificationPreferences.quiet_hours.end}
                        onChange={(e) => setSmartNotificationPreferences(prev => ({
                          ...prev,
                          quiet_hours: { ...prev.quiet_hours, end: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Location Based */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Location-Based Notifications</h4>
                  <p className="text-sm text-gray-500">Get alerts for events near your location</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smartNotificationPreferences.location_based}
                    onChange={(e) => setSmartNotificationPreferences(prev => ({ ...prev, location_based: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">Notification Preferences</h4>
              <p className="text-sm text-yellow-800">
                You can customize how and when you receive notifications. Critical system alerts cannot be disabled.
                Smart notifications are limited to 2-3 per day to avoid spam.
              </p>
            </div>
          </div>
        );

      case 'ai':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
              <div className="flex items-center mb-4">
                <Sparkles className="text-purple-600 mr-3" size={24} />
                <h3 className="text-lg font-semibold text-purple-900">AI-Powered Features</h3>
              </div>
              <p className="text-purple-800 mb-4">
                EventEase uses artificial intelligence to provide smart insights, automated scheduling, and predictive analytics.
                Customize which AI features you want to enable for your events.
              </p>
            </div>

            <div className="space-y-4">
              {Object.entries(aiSettings).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {key === 'aiInsights' && 'AI-generated insights and recommendations'}
                      {key === 'smartRecommendations' && 'Smart event suggestions and optimizations'}
                      {key === 'automatedScheduling' && 'AI-powered scheduling and conflict resolution'}
                      {key === 'predictiveAnalytics' && 'Predictive insights for event success'}
                      {key === 'sentimentAnalysis' && 'Analyze participant feedback and sentiment'}
                      {key === 'autoTagging' && 'Automatic event categorization and tagging'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => handleInputChange('ai', key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">AI Learning</h4>
              <p className="text-sm text-blue-800">
                The AI system learns from your event data to provide better recommendations over time.
                Your data is anonymized and used only to improve the AI features.
              </p>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Password Change</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="input-field pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="input-field"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="input-field pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                
                {passwordError && (
                  <div className="text-red-600 text-sm">{passwordError}</div>
                )}
                
                <button
                  onClick={handlePasswordChange}
                  className="btn-secondary"
                >
                  Change Password
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Two-Factor Authentication</h3>
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Enable 2FA</h4>
                  <p className="text-sm text-gray-500">
                    Add an extra layer of security to your account with two-factor authentication
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={securitySettings.twoFactorAuth}
                    onChange={(e) => handleInputChange('security', 'twoFactorAuth', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Session Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Timeout (minutes)
                  </label>
                  <select
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => handleInputChange('security', 'sessionTimeout', parseInt(e.target.value))}
                    className="input-field"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                    <option value={480}>8 hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password Expiry (days)
                  </label>
                  <select
                    value={securitySettings.passwordExpiry}
                    onChange={(e) => handleInputChange('security', 'passwordExpiry', parseInt(e.target.value))}
                    className="input-field"
                  >
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                    <option value={180}>180 days</option>
                    <option value={365}>1 year</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Security Alerts</h3>
              <div className="space-y-3">
                {['loginNotifications', 'suspiciousActivityAlerts'].map((key) => (
                  <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900 capitalize">
                        {key === 'loginNotifications' ? 'Login Notifications' : 'Suspicious Activity Alerts'}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {key === 'loginNotifications' && 'Get notified of new login attempts'}
                        {key === 'suspiciousActivityAlerts' && 'Alerts for unusual account activity'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={securitySettings[key]}
                        onChange={(e) => handleInputChange('security', key, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-medium text-red-900 mb-2">Security Notice</h4>
              <p className="text-sm text-red-800">
                These security settings help protect your account and event data. We recommend enabling two-factor authentication for enhanced security.
              </p>
            </div>
          </div>
        );

      case 'integrations':
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <Globe className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Integrations</h3>
              <p className="text-gray-500 mb-6">
                Connect EventEase with your favorite tools and services
              </p>
              <button className="btn-primary">Coming Soon</button>
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <Database className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Data & Privacy</h3>
              <p className="text-gray-500 mb-6">
                Manage your data preferences and privacy settings
              </p>
              <button className="btn-primary">Coming Soon</button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary-600" />
            <p className="text-gray-600">Loading settings...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600 mt-1">Manage your account preferences and system configuration</p>
            </div>
            <button 
              onClick={handleSave} 
              disabled={saving || loading}
              className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 size={20} className="mr-2 animate-spin" />
              ) : (
                <Save size={20} className="mr-2" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Settings Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      navigate(`/settings?tab=${tab.id}`, { replace: true });
                    }}
                    className={`py-4 px-1 border-b-2 font-medium text-sm capitalize flex items-center ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon size={20} className="mr-2" />
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {renderTabContent()}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Settings;
