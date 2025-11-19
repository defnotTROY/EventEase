import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Calendar, 
  Plus, 
  BarChart3, 
  Users, 
  Settings, 
  QrCode,
  FileText,
  X,
  Shield,
  UserCog,
  CalendarCheck,
  Loader2,
  AlertCircle,
  Download,
  Copy,
  Check
} from 'lucide-react';
import { appConfig, getAppVersion, getFooterText } from '../config/appConfig';
import { auth } from '../lib/supabase';
import { canCreateEvents, getUserRoleName } from '../services/roleService';
import { qrCodeService } from '../services/qrCodeService';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showUserQRModal, setShowUserQRModal] = useState(false);
  const [userQRData, setUserQRData] = useState(null);
  const [userQRLoading, setUserQRLoading] = useState(false);
  const [userQRError, setUserQRError] = useState(null);
  const [userQRCopied, setUserQRCopied] = useState(false);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { user } = await auth.getCurrentUser();
        setUser(user);
        if (user) {
          const adminStatus = user.user_metadata?.role === 'Administrator' || user.user_metadata?.role === 'Admin';
          setIsAdmin(adminStatus);
        }
      } catch (error) {
        console.error('Error getting user:', error);
      }
    };
    getCurrentUser();
  }, []);

  // Base navigation items (available to all)
  const baseNavigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Events', href: '/events', icon: Calendar },
  ];

  // Organizer-only navigation items
  const organizerNavigation = [
    { name: 'Create Event', href: '/create-event', icon: Plus, requires: 'organizer' },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, requires: 'organizer' },
    { name: 'Participants', href: '/participants', icon: Users, requires: 'organizer' },
  ];

  // Admin-only navigation items
  const adminNavigation = [
    { name: 'Admin Dashboard', href: '/admin', icon: Shield },
    { name: 'User Management', href: '/admin/users', icon: UserCog },
    { name: 'Event Management', href: '/admin/events', icon: CalendarCheck },
    { name: 'Verification Review', href: '/admin/verifications', icon: FileText },
    { name: 'QR Check-in', href: '/admin/qr-checkin', icon: QrCode },
  ];

  // Navigation with role-based filtering
  const navigation = user 
    ? [
        ...baseNavigation,
        ...organizerNavigation.filter(item => {
          if (item.requires === 'organizer') {
            return canCreateEvents(user);
          }
          return true;
        }),
        // Add admin navigation if user is admin (with separator)
        ...(isAdmin ? [{ name: '---', href: '#', icon: null, separator: true }, ...adminNavigation] : []),
        { name: 'Settings', href: '/settings', icon: Settings }
      ]
    : baseNavigation;

  const features = [
    { name: 'QR Check-in', icon: QrCode, description: 'Show your personal check-in code', action: 'qr' },
  ];

  const handleOpenUserQR = async () => {
    if (!user) {
      return;
    }

    setShowUserQRModal(true);
    if (!userQRData) {
      await generateUserQRCode();
    }
  };

  const generateUserQRCode = async () => {
    if (!user) {
      return;
    }

    try {
      setUserQRLoading(true);
      setUserQRError(null);

      const qrData = await qrCodeService.generateUserQRCode(user.id, user.email);
      setUserQRData(qrData);
    } catch (error) {
      console.error('Error generating user QR code:', error);
      setUserQRError('Failed to generate your QR code. Please try again.');
    } finally {
      setUserQRLoading(false);
    }
  };

  const handleDownloadUserQR = () => {
    if (!userQRData || !user) return;
    qrCodeService.downloadQRCode(
      userQRData.dataURL,
      `eventease-user-qr-${user.email?.split('@')[0] || 'profile'}.png`
    );
  };

  const handleCopyUserQRData = async () => {
    if (!userQRData) return;

    try {
      await navigator.clipboard.writeText(userQRData.data);
      setUserQRCopied(true);
      setTimeout(() => setUserQRCopied(false), 2000);
    } catch (error) {
      console.error('Error copying user QR data:', error);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-primary-600">EventEase</h2>
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Main Navigation
              </h3>
              {navigation.map((item, index) => {
                // Handle separator
                if (item.separator || item.name === '---') {
                  return (
                    <div key={`separator-${index}`} className="my-4 border-t border-gray-200" />
                  );
                }

                const isActive = location.pathname === item.href;
                const IconComponent = item.icon;
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`
                      flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200
                      ${isActive 
                        ? 'bg-primary-100 text-primary-700' 
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                    onClick={() => onClose()}
                  >
                    {IconComponent && <IconComponent size={20} className="mr-3" />}
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* Admin section is now integrated into main navigation above */}
            {false && isAdmin && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Admin Panel
                </h3>
                {adminNavigation.map((item) => {
                  const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`
                        flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200
                        ${isActive 
                          ? 'bg-red-100 text-red-700' 
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        }
                      `}
                      onClick={() => onClose()}
                    >
                      <item.icon size={20} className="mr-3" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Features */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                AI & Cloud Features
              </h3>
              {features.map((feature) => {
                const IconComponent = feature.icon;

                if (feature.action === 'qr') {
                  return (
                    <button
                      key={feature.name}
                      onClick={handleOpenUserQR}
                      className="w-full text-left flex items-center px-3 py-2 text-sm text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                    >
                      <IconComponent size={18} className="mr-3 text-primary-600" />
                      <div>
                        <div className="font-semibold text-primary-700">{feature.name}</div>
                        <div className="text-xs text-primary-600">{feature.description}</div>
                      </div>
                    </button>
                  );
                }

                return (
                  <div
                    key={feature.name}
                    className="flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
                  >
                    <IconComponent size={18} className="mr-3 text-primary-500" />
                    <div>
                      <div className="font-medium text-gray-700">{feature.name}</div>
                      <div className="text-xs text-gray-500">{feature.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              <p>{getFooterText()}</p>
              <p className="mt-1">{appConfig.name} {getAppVersion()}</p>
              {user && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    {getUserRoleName(user)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showUserQRModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 px-4"
          onClick={(e) => {
            // Close modal when clicking outside the modal content
            if (e.target === e.currentTarget) {
              setShowUserQRModal(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Your Check-in QR</h3>
                <p className="text-sm text-gray-500">Use this code to check in to any EventEase event.</p>
              </div>
              <button
                onClick={() => setShowUserQRModal(false)}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-6">
              {userQRLoading && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Loader2 className="animate-spin mb-3" size={24} />
                  Generating your QR code...
                </div>
              )}

              {!userQRLoading && userQRError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-500" size={20} />
                    <div className="text-sm text-red-700">
                      <p className="font-medium mb-2">{userQRError}</p>
                      <button
                        onClick={generateUserQRCode}
                        className="text-red-600 hover:text-red-800 underline"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!userQRLoading && !userQRError && userQRData && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="bg-white p-6 rounded-lg border-2 border-gray-200 inline-block">
                      <img
                        src={userQRData.dataURL}
                        alt="User QR Code"
                        className="w-56 h-56 mx-auto"
                      />
                    </div>
                    <p className="mt-4 text-sm text-gray-500">
                      Linked to {user?.email}
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900 space-y-1">
                    <p><strong>User ID:</strong> {userQRData.userData?.userId}</p>
                    <p><strong>Email:</strong> {userQRData.userData?.email}</p>
                    <p><strong>Version:</strong> {userQRData.userData?.version}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleDownloadUserQR}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                    >
                      <Download size={16} className="mr-2" />
                      Download QR
                    </button>
                    <button
                      onClick={handleCopyUserQRData}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100"
                    >
                      {userQRCopied ? (
                        <>
                          <Check size={16} className="mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={16} className="mr-2" />
                          Copy Data
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                    Keep this QR handy. It stays the same for every event, so you can reuse it for quick check-ins across EventEase.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
