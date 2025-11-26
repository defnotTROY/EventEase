import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  User, 
  Bell, 
  Shield, 
  Save, 
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  Download,
  FileDown
} from 'lucide-react';
import { auth } from '../lib/supabase';
import { notificationService } from '../services/notificationService';
import { pushNotificationService } from '../services/pushNotificationService';
import { verificationService } from '../services/verificationService';
import { userDataExportService } from '../services/userDataExportService';
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
  const [downloadingData, setDownloadingData] = useState(false);

  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    organization: '',
    role: 'Regular User',
    language: 'English',
    // New profile fields
    dateOfBirth: '',
    age: '',
    gender: '',
    bio: '',
    address: '',
    city: '',
    country: '',
    website: '',
    linkedin: '',
    twitter: '',
    instagram: '',
    interests: ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    pushNotifications: true,
    eventReminders: true,
    participantUpdates: true,
    systemAlerts: false,
    marketingEmails: false
  });

  const [smartNotificationPreferences, setSmartNotificationPreferences] = useState({
    max_daily_notifications: 5,
    priority_level: 'all',
    quiet_hours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  });



  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'verification', name: 'Verification', icon: ShieldCheck },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield }
  ];

  const languages = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean', 'Arabic'];

  const countries = [
    'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia', 'Austria', 'Bangladesh', 'Belgium', 
    'Brazil', 'Canada', 'Chile', 'China', 'Colombia', 'Croatia', 'Czech Republic', 'Denmark', 'Egypt', 
    'Finland', 'France', 'Germany', 'Greece', 'Hong Kong', 'Hungary', 'India', 'Indonesia', 'Ireland', 
    'Israel', 'Italy', 'Japan', 'Kenya', 'Malaysia', 'Mexico', 'Netherlands', 'New Zealand', 'Nigeria', 
    'Norway', 'Pakistan', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Romania', 'Russia', 'Saudi Arabia', 
    'Singapore', 'South Africa', 'South Korea', 'Spain', 'Sweden', 'Switzerland', 'Taiwan', 'Thailand', 
    'Turkey', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Vietnam', 'Other'
  ];

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
          role: user.user_metadata?.role || 'Regular User',
          language: user.user_metadata?.language || 'English',
          // New profile fields
          dateOfBirth: user.user_metadata?.date_of_birth || '',
          age: user.user_metadata?.age || '',
          gender: user.user_metadata?.gender || '',
          bio: user.user_metadata?.bio || '',
          address: user.user_metadata?.address || '',
          city: user.user_metadata?.city || '',
          country: user.user_metadata?.country || '',
          website: user.user_metadata?.website || '',
          linkedin: user.user_metadata?.linkedin || '',
          twitter: user.user_metadata?.twitter || '',
          instagram: user.user_metadata?.instagram || '',
          interests: user.user_metadata?.interests || ''
        }));

        // Load notification preferences
        const { data: prefs } = await notificationService.getPreferences(user.id);
        if (prefs) {
          // Merge with defaults to handle missing fields
          setSmartNotificationPreferences(prev => ({
            ...prev,
            max_daily_notifications: prefs.max_daily_notifications ?? prev.max_daily_notifications,
            priority_level: prefs.priority_level ?? prev.priority_level,
            quiet_hours: {
              enabled: prefs.quiet_hours?.enabled ?? prev.quiet_hours.enabled,
              start: prefs.quiet_hours?.start ?? prev.quiet_hours.start,
              end: prefs.quiet_hours?.end ?? prev.quiet_hours.end
            }
          }));
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
        language: profileData.language,
        notification_settings: notificationSettings,
        // New profile fields
        date_of_birth: profileData.dateOfBirth,
        age: profileData.age,
        gender: profileData.gender,
        bio: profileData.bio,
        address: profileData.address,
        city: profileData.city,
        country: profileData.country,
        website: profileData.website,
        linkedin: profileData.linkedin,
        twitter: profileData.twitter,
        instagram: profileData.instagram,
        interests: profileData.interests
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

            {/* Additional Profile Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={profileData.dateOfBirth || ''}
                  onChange={(e) => handleInputChange('profile', 'dateOfBirth', e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={profileData.age || ''}
                  onChange={(e) => handleInputChange('profile', 'age', e.target.value)}
                  className="input-field"
                  placeholder="Your age"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  value={profileData.gender || ''}
                  onChange={(e) => handleInputChange('profile', 'gender', e.target.value)}
                  className="input-field"
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                value={profileData.bio || ''}
                onChange={(e) => handleInputChange('profile', 'bio', e.target.value)}
                className="input-field"
                rows={3}
                placeholder="Tell us a little about yourself..."
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {(profileData.bio || '').length}/500 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <input
                type="text"
                value={profileData.address || ''}
                onChange={(e) => handleInputChange('profile', 'address', e.target.value)}
                className="input-field"
                placeholder="Street address, city, state/province"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={profileData.city || ''}
                  onChange={(e) => handleInputChange('profile', 'city', e.target.value)}
                  className="input-field"
                  placeholder="Your city"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <select
                  value={profileData.country || ''}
                  onChange={(e) => handleInputChange('profile', 'country', e.target.value)}
                  className="input-field"
                >
                  <option value="">Select a country</option>
                  {countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Social Links */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Social Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={profileData.website || ''}
                    onChange={(e) => handleInputChange('profile', 'website', e.target.value)}
                    className="input-field"
                    placeholder="https://yourwebsite.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LinkedIn
                  </label>
                  <input
                    type="url"
                    value={profileData.linkedin || ''}
                    onChange={(e) => handleInputChange('profile', 'linkedin', e.target.value)}
                    className="input-field"
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Twitter / X
                  </label>
                  <input
                    type="text"
                    value={profileData.twitter || ''}
                    onChange={(e) => handleInputChange('profile', 'twitter', e.target.value)}
                    className="input-field"
                    placeholder="@username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instagram
                  </label>
                  <input
                    type="text"
                    value={profileData.instagram || ''}
                    onChange={(e) => handleInputChange('profile', 'instagram', e.target.value)}
                    className="input-field"
                    placeholder="@username"
                  />
                </div>
              </div>
            </div>

            {/* Event Preferences */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Event Preferences</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interests
                </label>
                <input
                  type="text"
                  value={profileData.interests || ''}
                  onChange={(e) => handleInputChange('profile', 'interests', e.target.value)}
                  className="input-field"
                  placeholder="e.g., Technology, Music, Sports, Business"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separate multiple interests with commas
                </p>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Profile Information</h4>
              <p className="text-sm text-blue-800">
                Your profile information helps us personalize your experience and provide better event recommendations.
                This information may be visible to event organizers when you register for events.
              </p>
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
            {/* In-App Notifications */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
              <p className="text-sm text-gray-600">Control which notifications you receive in the app.</p>
              
              {/* Push Notifications */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Push Notifications</h4>
                  <p className="text-sm text-gray-500">Receive push notifications in your browser</p>
                  {!pushNotificationSupported && (
                    <p className="text-xs text-red-600 mt-1">Push notifications are not supported in this browser</p>
                  )}
                  {pushNotificationSupported && !pushNotificationEnabled && notificationSettings.pushNotifications && (
                    <p className="text-xs text-yellow-600 mt-1">Click to enable push notifications</p>
                  )}
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.pushNotifications}
                    onChange={async (e) => {
                      const newValue = e.target.checked;
                      handleInputChange('notifications', 'pushNotifications', newValue);
                      
                      if (newValue && pushNotificationSupported) {
                        try {
                          await pushNotificationService.subscribe(user.id);
                          setPushNotificationEnabled(true);
                          success('Push notifications have been enabled successfully.');
                        } catch (error) {
                          console.error('Error enabling push notifications:', error);
                          handleInputChange('notifications', 'pushNotifications', false);
                          showError('Unable to enable push notifications. Please check your browser settings.');
                        }
                      } else if (!newValue && pushNotificationEnabled) {
                        try {
                          await pushNotificationService.unsubscribe(user.id);
                          setPushNotificationEnabled(false);
                        } catch (error) {
                          console.error('Error disabling push notifications:', error);
                        }
                      }
                    }}
                    disabled={!pushNotificationSupported}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 ${!pushNotificationSupported ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                </label>
              </div>

              {/* Event Reminders */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Event Reminders</h4>
                  <p className="text-sm text-gray-500">Get reminded about upcoming events you've registered for</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.eventReminders}
                    onChange={(e) => handleInputChange('notifications', 'eventReminders', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {/* Event Updates */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Event Updates</h4>
                  <p className="text-sm text-gray-500">Notifications when events you're registered for are updated</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.participantUpdates}
                    onChange={(e) => handleInputChange('notifications', 'participantUpdates', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {/* System Alerts */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">System Alerts</h4>
                  <p className="text-sm text-gray-500">Important system notifications and tips</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.systemAlerts}
                    onChange={(e) => handleInputChange('notifications', 'systemAlerts', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>

            {/* Notification Limits */}
            <div className="space-y-4 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900">Notification Controls</h3>
              
              {/* Max Daily Notifications */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Daily Notifications: {smartNotificationPreferences.max_daily_notifications}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={smartNotificationPreferences.max_daily_notifications}
                  onChange={(e) => setSmartNotificationPreferences(prev => ({ ...prev, max_daily_notifications: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">Limit how many notifications you receive per day</p>
              </div>

              {/* Priority Level */}
              <div className="p-4 border border-gray-200 rounded-lg">
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
                <p className="text-xs text-gray-500 mt-1">Filter notifications by importance</p>
              </div>
            </div>

            {/* Quiet Hours */}
            <div className="space-y-4 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900">Quiet Hours</h3>
              
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Enable Quiet Hours</h4>
                  <p className="text-sm text-gray-500">No notifications during specified hours</p>
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

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">How Notifications Work</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Event Reminders:</strong> You'll be notified before events you've registered for</li>
                <li>• <strong>Event Updates:</strong> Get notified when organizers change event details</li>
                <li>• <strong>System Alerts:</strong> Important tips and platform updates</li>
              </ul>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            {/* Password Change - Functional */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
              <p className="text-sm text-gray-600">Update your password to keep your account secure.</p>
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
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
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
                    placeholder="Enter new password (min. 6 characters)"
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
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                
                {passwordError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
                    {passwordError}
                  </div>
                )}
                
                <button
                  onClick={handlePasswordChange}
                  disabled={!passwordData.newPassword || !passwordData.confirmPassword}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Update Password
                </button>
              </div>
            </div>

            {/* Account Information */}
            <div className="space-y-4 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900">Account Information</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Email</span>
                  <span className="text-sm font-medium text-gray-900">{user?.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Account Created</span>
                  <span className="text-sm font-medium text-gray-900">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last Sign In</span>
                  <span className="text-sm font-medium text-gray-900">
                    {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Role</span>
                  <span className="text-sm font-medium text-gray-900">
                    {user?.user_metadata?.role || 'Regular User'}
                  </span>
                </div>
              </div>
            </div>

            {/* Download My Data */}
            <div className="space-y-4 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900">Download My Data</h3>
              <p className="text-sm text-gray-600">
                Download a copy of all your personal data stored in EventEase. This includes your profile information, 
                registered events, verification status, and any events you've created.
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-primary-100 rounded-lg">
                    <FileDown className="text-primary-600" size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">Your Data Export Includes:</h4>
                    <ul className="text-sm text-gray-600 mt-2 space-y-1">
                      <li>• Profile information (name, email, phone, etc.)</li>
                      <li>• Account details (created date, last sign in)</li>
                      <li>• All events you've registered for</li>
                      <li>• Verification status and history</li>
                      {(user?.user_metadata?.role === 'Organizer' || 
                        user?.user_metadata?.role === 'Administrator' || 
                        user?.user_metadata?.role === 'Admin') && (
                        <>
                          <li>• Events you've created</li>
                          <li>• Participant lists for your events</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    setDownloadingData(true);
                    try {
                      await userDataExportService.downloadUserDataPDF(user.id, user);
                      success('Your data has been downloaded successfully!');
                    } catch (error) {
                      console.error('Error downloading data:', error);
                      showError('Failed to download your data. Please try again.');
                    } finally {
                      setDownloadingData(false);
                    }
                  }}
                  disabled={downloadingData}
                  className="mt-4 btn-primary w-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {downloadingData ? (
                    <>
                      <Loader2 size={20} className="mr-2 animate-spin" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download size={20} className="mr-2" />
                      Download My Data (PDF)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Security Tips */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Security Tips</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Use a strong, unique password with at least 8 characters</li>
                <li>Include uppercase, lowercase, numbers, and special characters</li>
                <li>Never share your password with anyone</li>
                <li>Sign out when using shared or public computers</li>
              </ul>
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
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-0">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">Settings</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1 break-words">Manage your account preferences and system configuration</p>
            </div>
            <button 
              onClick={handleSave} 
              disabled={saving || loading}
              className="btn-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap self-start sm:self-auto"
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex overflow-x-auto scrollbar-hide px-4 sm:px-6">
                <div className="flex space-x-4 sm:space-x-8 min-w-max">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        navigate(`/settings?tab=${tab.id}`, { replace: true });
                      }}
                      className={`py-4 px-1 border-b-2 font-medium text-sm capitalize flex items-center whitespace-nowrap transition-colors ${
                        activeTab === tab.id
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <tab.icon size={18} className="mr-2 flex-shrink-0" />
                      <span>{tab.name}</span>
                    </button>
                  ))}
                </div>
              </nav>
            </div>

            <div className="p-4 sm:p-6">
              {renderTabContent()}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Settings;
