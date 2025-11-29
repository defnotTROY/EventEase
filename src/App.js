import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import EmailVerification from './pages/EmailVerification';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import EventCreation from './pages/EventCreation';
import EventEdit from './pages/EventEdit';
import EventView from './pages/EventView';
import Analytics from './pages/Analytics';
import Participants from './pages/Participants';
import Settings from './pages/Settings';
import SearchPage from './pages/SearchPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminUserManagement from './pages/AdminUserManagement';
import AdminEventManagement from './pages/AdminEventManagement';
import AdminVerificationReview from './pages/AdminVerificationReview';
import AdminQRCheckIn from './pages/AdminQRCheckIn';
import CreateAdminAccount from './pages/CreateAdminAccount';
import Landing from './pages/Landing';
import { auth } from './lib/supabase';
import { ToastProvider } from './contexts/ToastContext';

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  // Check if current route is auth-related
  const isAuthRoute = ['/login', '/signup', '/forgot-password', '/reset-password', '/create-admin', '/verify-email'].includes(location.pathname);
  // Landing page shows for unauthenticated users on "/" or anyone on "/landing"
  const isLandingPage = location.pathname === '/landing' || (location.pathname === '/' && !user);

  // Get current user and listen for auth changes
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { user } = await auth.getCurrentUser();
        setUser(user);
      } catch (error) {
        console.error('Error getting user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getCurrentUser();

    // Listen for auth state changes (syncs across tabs via localStorage)
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      // If user is on reset-password page with recovery tokens, don't redirect them
      // They need to complete the password reset first
      if (event === 'PASSWORD_RECOVERY' && location.pathname === '/reset-password') {
        // Keep them on reset-password page, don't redirect
        setUser(session?.user || null);
        setIsLoading(false);
        return;
      }
      
      // Check if email was just verified (SIGNED_IN event with email_confirmed_at)
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        // If user is on verify-email page, they might want to stay there
        // But update the user state anyway
        setUser(session?.user || null);
        setIsLoading(false);
        return;
      }
      
      setUser(session?.user || null);
      setIsLoading(false);
    });

    // Also listen for cross-tab verification messages
    let verificationChannel = null;
    const handleStorageChange = (e) => {
      if (e.key === 'email-verified' && e.newValue === 'true') {
        // Refresh user session to get updated email_confirmed_at status
        getCurrentUser();
      }
    };

    if (typeof BroadcastChannel !== 'undefined') {
      verificationChannel = new BroadcastChannel('email-verification');
      verificationChannel.onmessage = (event) => {
        if (event.data.type === 'email-verified') {
          // Refresh user session to get updated email_confirmed_at status
          getCurrentUser();
        }
      };
    }
    
    window.addEventListener('storage', handleStorageChange);

    return () => {
      subscription.unsubscribe();
      if (verificationChannel) {
        verificationChannel.close();
      }
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [location.pathname]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Check if user is on reset-password with recovery session (don't show navbar/sidebar)
  const isRecoverySession = user && location.pathname === '/reset-password' && 
    (window.location.hash.includes('access_token') || window.location.hash.includes('type=recovery'));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Only show navbar and sidebar for authenticated users on non-auth routes */}
      {/* Don't show navbar/sidebar if user is in recovery session on reset-password */}
      {user && !isAuthRoute && !isLandingPage && !isRecoverySession && (
        <>
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </>
      )}
      
      <div className={user && !isAuthRoute && !isLandingPage && !isRecoverySession ? "lg:ml-64" : ""}>
        {/* Always show reset-password route, even if user is authenticated (recovery session) */}
        {isAuthRoute || isRecoverySession ? (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/create-admin" element={<CreateAdminAccount />} />
            <Route path="/verify-email" element={<EmailVerification />} />
          </Routes>
        ) : isLandingPage ? (
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/landing" element={<Landing />} />
          </Routes>
        ) : (
          <main className="pt-0 lg:pt-0 px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="max-w-screen-2xl mx-auto w-full no-top-gap">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/events" element={<Events />} />
                <Route path="/events/:id" element={<EventView />} />
                <Route path="/events/:id/edit" element={<EventEdit />} />
                <Route path="/create-event" element={<EventCreation />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/participants" element={<Participants />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/search" element={<SearchPage />} />
                {/* Admin Routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUserManagement />} />
                <Route path="/admin/events" element={<AdminEventManagement />} />
                <Route path="/admin/verifications" element={<AdminVerificationReview />} />
                <Route path="/admin/qr-checkin" element={<AdminQRCheckIn />} />
              </Routes>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <Router>
        <AppContent />
      </Router>
    </ToastProvider>
  );
}

export default App;
