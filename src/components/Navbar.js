import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, User, Menu, X, LogOut, Settings, Loader2 } from 'lucide-react';
import { auth, supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { searchService } from '../services/searchService';
import { notificationService } from '../services/notificationService';
import SearchResults from './SearchResults';

const Navbar = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const mobileSearchInputRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Get current user and notifications on component mount
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { user } = await auth.getCurrentUser();
        setUser(user);
        
        // Load notifications if user is logged in
        if (user) {
          await loadNotifications(user.id);
        }
      } catch (error) {
        console.error('Error getting user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getCurrentUser();

    // Listen for auth state changes
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setIsLoading(false);
      
      // Load notifications when user logs in
      if (session?.user) {
        loadNotifications(session.user.id);
      } else {
        setNotifications([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load notifications
  const loadNotifications = async (userId, forceGenerate = false) => {
    try {
      const { data, error } = await notificationService.getNotifications(userId, {
        limit: 20,
        unreadOnly: false
      });

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      // If no notifications exist and user clicks, generate some
      if ((!data || data.length === 0) && forceGenerate) {
        console.log('No notifications found, generating activity notifications...');
        const { data: generated } = await notificationService.generateActivityNotifications(userId);
        if (generated && generated.length > 0) {
          setNotifications(generated);
          return;
        }
      }

      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  // Set up real-time subscription for notifications
  useEffect(() => {
    if (!user) return;

    // Load notifications immediately
    loadNotifications(user.id);

    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New notification received:', payload.new);
          // Add new notification to the list
          setNotifications(prev => [payload.new, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Notification updated:', payload.new);
          // Update notification in the list
          setNotifications(prev =>
            prev.map(n => n.id === payload.new.id ? payload.new : n)
          );
        }
      )
      .subscribe();

    // Refresh notifications periodically (every 30 seconds) as backup
    const interval = setInterval(() => {
      loadNotifications(user.id);
    }, 30000); // Refresh every 30 seconds

    // Refresh notifications when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadNotifications(user.id);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
      if (showSearchResults && !event.target.closest('.search-container')) {
        setShowSearchResults(false);
      }
      if (showNotifications && !event.target.closest('.notification-container')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu, showSearchResults, showNotifications]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !user) return;

    setIsSearching(true);
    setShowSearchResults(true);

    try {
      const userRole = user?.user_metadata?.role;
      const results = await searchService.globalSearch(user.id, searchQuery.trim(), userRole);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({ events: [], participants: [], total: 0, error: 'Search failed' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Auto-search as user types (with debounce)
    if (value.trim().length >= 2) {
      clearTimeout(searchTimeout);
      const timeout = setTimeout(async () => {
        if (user) {
          setIsSearching(true);
          try {
            const userRole = user?.user_metadata?.role;
            const results = await searchService.globalSearch(user.id, value.trim(), userRole);
            setSearchResults(results);
            setShowSearchResults(true);
          } catch (error) {
            console.error('Search error:', error);
          } finally {
            setIsSearching(false);
          }
        }
      }, 300);
      setSearchTimeout(timeout);
    } else {
      setShowSearchResults(false);
      setSearchResults(null);
    }
  };

  const [searchTimeout, setSearchTimeout] = useState(null);

  const getUserDisplayName = () => {
    if (!user) return 'Guest User';
    
    // Try to get name from user metadata
    const firstName = user.user_metadata?.first_name;
    const lastName = user.user_metadata?.last_name;
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    
    // Fallback to email
    return user.email?.split('@')[0] || 'User';
  };

  const getUserRole = () => {
    if (!user) return 'Guest';
    
    // Get role from user metadata, fallback to default
    return user.user_metadata?.role || 'Event Organizer';
  };

  const handleNotificationClick = async (notification) => {
    // Mark notification as read
    if (!notification.read) {
      await notificationService.markAsRead(notification.id);
      setNotifications(prev => 
        prev.map(n => 
          n.id === notification.id ? { ...n, read: true, read_at: new Date().toISOString() } : n
        )
      );
    }

    // Navigate based on notification type or action_url
    if (notification.action_url) {
      navigate(notification.action_url);
    } else if (notification.metadata?.event_id) {
      navigate(`/events/${notification.metadata.event_id}`);
    } else if (notification.type === 'registration') {
      navigate('/participants');
    } else if (notification.type === 'reminder') {
      navigate('/events');
    } else if (notification.type === 'feedback') {
      navigate('/analytics');
    } else {
      navigate('/events');
    }

    setShowNotifications(false);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type, metadata) => {
    // Check metadata for specific alert types
    if (metadata?.alert_type === 'verification_approved') {
      return '✅';
    }
    if (metadata?.alert_type === 'verification_rejected') {
      return '❌';
    }
    
    switch (type) {
      case 'system_alert':
        return '🔔';
      case 'timely_suggestion':
        return '✨';
      case 'price_alert':
        return '💰';
      case 'last_chance':
        return '⏰';
      case 'nearby_alert':
        return '📍';
      case 'registration':
        return '👤';
      case 'reminder':
        return '⏰';
      case 'feedback':
        return '💬';
      default:
        return '🔔';
    }
  };

  const formatNotificationTime = (createdAt) => {
    if (!createdAt) return '';
    
    const now = new Date();
    const time = new Date(createdAt);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return time.toLocaleDateString();
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="w-full px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Left side */}
          <div className="flex items-center min-w-0 flex-shrink-0">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-1.5 sm:p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 flex-shrink-0"
            >
              <Menu size={20} />
            </button>
            
            <div className="flex items-center ml-2 sm:ml-4 lg:ml-0">
              <div className="flex-shrink-0">
                <h1 className="text-lg sm:text-xl font-bold text-primary-600">EventEase</h1>
              </div>
            </div>
          </div>

          {/* Center - Search */}
          <div className="flex-1 max-w-lg mx-2 sm:mx-4 lg:mx-8 hidden md:block search-container">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search events, participants..."
                value={searchQuery}
                onChange={handleSearchInputChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 animate-spin" size={16} />
              )}
              
              {/* Search Results Dropdown */}
              {showSearchResults && searchResults && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <SearchResults 
                    results={searchResults} 
                    searchQuery={searchQuery}
                    onClose={() => setShowSearchResults(false)}
                  />
                </div>
              )}
            </form>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 flex-shrink-0">
            {/* Mobile Search Button */}
            <button
              onClick={() => {
                setShowMobileSearch(true);
                setTimeout(() => mobileSearchInputRef.current?.focus(), 100);
              }}
              className="md:hidden p-1.5 sm:p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Search"
            >
              <Search size={18} />
            </button>

            {/* Notifications */}
            <div className="relative notification-container">
              <button
                onClick={async () => {
                  // Refresh notifications when opening the dropdown
                  // Pass true to generate notifications if none exist
                  if (!showNotifications && user) {
                    await loadNotifications(user.id, true);
                  }
                  setShowNotifications(!showNotifications);
                }}
                className="p-1.5 sm:p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 relative transition-colors"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-red-500 text-white text-[10px] sm:text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-semibold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="fixed sm:absolute inset-x-2 sm:inset-x-auto sm:right-0 top-14 sm:top-auto sm:mt-2 w-auto sm:w-80 bg-white rounded-lg shadow-lg z-50 border border-gray-200 max-h-[70vh] sm:max-h-96 overflow-hidden flex flex-col">
                  {/* Header */}
                  <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  {/* Notifications List */}
                  <div className="overflow-y-auto flex-1">
                    {notifications.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {notifications.map((notification) => (
                          <button
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left hover:bg-gray-50 transition-colors ${
                              !notification.read ? 'bg-blue-50' : 'bg-white'
                            }`}
                          >
                            <div className="flex items-start space-x-2 sm:space-x-3">
                              <div className="flex-shrink-0 mt-0.5">
                                <span className="text-base sm:text-lg">{getNotificationIcon(notification.type, notification.metadata)}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs sm:text-sm break-words ${
                                  !notification.read ? 'font-semibold text-gray-900' : 'text-gray-700'
                                }`}>
                                  {notification.title || notification.message}
                                </p>
                                {notification.title && notification.message && notification.title !== notification.message && (
                                  <p className="text-xs text-gray-600 mt-1 break-words line-clamp-2">{notification.message}</p>
                                )}
                                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                                  {formatNotificationTime(notification.created_at)}
                                </p>
                              </div>
                              {!notification.read && (
                                <div className="flex-shrink-0">
                                  <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-6 sm:py-8 text-center">
                        <Bell className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mb-2" />
                        <p className="text-xs sm:text-sm text-gray-500">No notifications</p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div className="px-3 sm:px-4 py-2 border-t border-gray-200 bg-gray-50">
                      <button
                        onClick={() => {
                          navigate('/settings');
                          setShowNotifications(false);
                        }}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium w-full text-center"
                      >
                        Notification Settings
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="relative user-menu-container">
              <div className="flex items-center space-x-1 sm:space-x-3">
                <div className="text-right hidden lg:block">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                    {isLoading ? 'Loading...' : getUserDisplayName()}
                  </p>
                  <p className="text-xs text-gray-500 truncate max-w-[120px]">{getUserRole()}</p>
                </div>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="h-7 w-7 sm:h-8 sm:w-8 bg-primary-600 rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors flex-shrink-0"
                >
                  <User className="text-white" size={14} />
                </button>
              </div>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 sm:w-52 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                  <div className="px-3 sm:px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">{getUserDisplayName()}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setShowUserMenu(false);
                    }}
                    className="flex items-center w-full px-3 sm:px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Settings className="mr-2 flex-shrink-0" size={16} />
                    Settings
                  </button>
                  
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowUserMenu(false);
                    }}
                    className="flex items-center w-full px-3 sm:px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut className="mr-2 flex-shrink-0" size={16} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search Popup */}
      {showMobileSearch && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowMobileSearch(false);
              setShowSearchResults(false);
              setSearchResults(null);
            }}
          />
          
          {/* Search Container */}
          <div className="absolute top-0 left-0 right-0 bg-white shadow-lg p-3 sm:p-4 animate-slide-down safe-area-inset-top">
            <form onSubmit={(e) => {
              handleSearch(e);
            }} className="relative">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative min-w-0">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    ref={mobileSearchInputRef}
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    className="w-full pl-9 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 animate-spin" size={16} />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowMobileSearch(false);
                    setShowSearchResults(false);
                    setSearchResults(null);
                    setSearchQuery('');
                  }}
                  className="p-2 sm:p-3 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors flex-shrink-0"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Mobile Search Results */}
              {showSearchResults && searchResults && (
                <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[60vh] overflow-y-auto">
                  <SearchResults 
                    results={searchResults} 
                    searchQuery={searchQuery}
                    onClose={() => {
                      setShowSearchResults(false);
                      setShowMobileSearch(false);
                    }}
                  />
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
