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

    // Listen for auth state changes
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Only show navbar and sidebar for authenticated users on non-auth routes */}
      {user && !isAuthRoute && !isLandingPage && (
        <>
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </>
      )}
      
      <div className={user && !isAuthRoute && !isLandingPage ? "lg:ml-64" : ""}>
        {isAuthRoute ? (
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
          <main className="pt-0 lg:pt-0 px-6 pb-6">
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
