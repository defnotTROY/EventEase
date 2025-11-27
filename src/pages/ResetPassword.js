import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { auth, supabase } from '../lib/supabase';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    let sessionEstablished = false;
    
    // Listen for auth state changes FIRST (Supabase auto-detects hash tokens)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, { hasSession: !!session });
      
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        if (session) {
          console.log('Session established via auth state change');
          sessionEstablished = true;
          setError('');
          setLoading(false);
          setSessionChecked(true);
        }
      }
    });

    // Check if we have a recovery session from the URL hash
    const checkRecoverySession = async () => {
      try {
        // Wait for Supabase to automatically process hash tokens
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Check both hash and query parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        // First, check for errors in the URL (hash or query)
        const error = hashParams.get('error') || queryParams.get('error');
        const errorCode = hashParams.get('error_code') || queryParams.get('error_code');
        const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
        
        if (error || errorCode) {
          console.error('Error in URL:', { error, errorCode, errorDescription });
          
          let errorMessage = 'Invalid or expired reset link.';
          
          if (errorCode === 'otp_expired') {
            errorMessage = 'This password reset link has expired. Please request a new password reset email.';
          } else if (errorCode === 'access_denied') {
            errorMessage = 'Access denied. The reset link may be invalid or expired.';
          } else if (errorDescription) {
            errorMessage = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
          }
          
          setError(errorMessage);
          setLoading(false);
          setSessionChecked(true);
          
          // Clear the error from URL
          window.history.replaceState(null, '', window.location.pathname);
          
          return;
        }
        
        // Get tokens from hash (preferred) or query params
        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const type = hashParams.get('type') || queryParams.get('type');
        
        console.log('URL params:', { 
          hasHash: window.location.hash.length > 0,
          hasQuery: window.location.search.length > 0,
          accessToken: !!accessToken, 
          refreshToken: !!refreshToken, 
          type 
        });
        
        // Check if Supabase already established a session automatically
        let { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (session) {
          console.log('Session already exists');
          setError('');
          setLoading(false);
          setSessionChecked(true);
          return;
        }
        
        // If we have recovery tokens in the URL, set the session manually
        if (accessToken && refreshToken) {
          console.log('Setting session from URL tokens...');
          const { data: { session: newSession }, error: hashError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (hashError) {
            console.error('Session error:', hashError);
            setError('Invalid or expired reset link. Please request a new password reset.');
            setLoading(false);
            setSessionChecked(true);
            return;
          }
          
          if (newSession) {
            console.log('Session established successfully from tokens');
            setError('');
            setLoading(false);
            setSessionChecked(true);
            // Clear tokens from URL
            window.history.replaceState(null, '', window.location.pathname);
            return;
          }
        }
        
        // If we get here and no session, but also no tokens, show helpful message
        if (!accessToken && !refreshToken && !session) {
          console.log('No tokens or session found');
          // Don't show error immediately - let user try to use the form
          // The form submission will handle the error
          setError('');
        }
        
      } catch (err) {
        console.error('Error checking recovery session:', err);
        setError('Failed to validate reset link. Please try again or request a new reset email.');
      } finally {
        setLoading(false);
        setSessionChecked(true);
      }
    };

    checkRecoverySession();

    // Cleanup subscription
    return () => {
      subscription?.unsubscribe();
    };
  }, [navigate]);

  const handleInputChange = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    setError(''); // Clear error when user starts typing
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate passwords
    if (passwordData.password !== passwordData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (passwordData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      // Check if we have a valid session first
      let { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('Form submission - checking session:', { hasSession: !!session, error: sessionError });
      
      // If no session, try to recover from URL tokens (hash or query)
      if (!session) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          console.log('Attempting to set session from URL tokens...');
          const { data: { session: newSession }, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (setSessionError) {
            console.error('Failed to set session:', setSessionError);
            throw new Error('Invalid or expired reset link. Please request a new password reset.');
          }
          
          if (newSession) {
            session = newSession;
            console.log('Session established from URL tokens');
            // Clear tokens from URL
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
      }
      
      // Final check - if still no session, throw error
      if (!session) {
        console.error('No valid session found after all attempts');
        throw new Error('No valid session found. Please click the reset link from your email again, or request a new reset link if this one has expired.');
      }

      console.log('Updating password for session:', session.user?.email);

      // Update the password
      const { error: updateError } = await auth.updateUser({
        password: passwordData.password
      });

      if (updateError) {
        console.error('Password update error:', updateError);
        throw updateError;
      }

      setSuccess(true);
      
      // Sign out to clear the recovery session
      await supabase.auth.signOut();
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (error) {
      console.error('Error resetting password:', error);
      setError(error.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset Successful!</h2>
              <p className="text-gray-600 mb-6">
                Your password has been successfully updated. You will be redirected to the login page shortly.
              </p>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while checking session
  if (loading && !sessionChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 text-primary-600 animate-spin mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Validating Reset Link</h2>
              <p className="text-gray-600">
                Please wait while we verify your password reset link...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Header */}
          <div className="text-center mb-8">
            <Lock className="mx-auto h-12 w-12 text-primary-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Reset Your Password</h2>
            <p className="mt-2 text-sm text-gray-600">
              Enter your new password below
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="text-red-600 mr-3 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="text-red-800 font-medium mb-1">Reset Failed</p>
                  <p className="text-red-700 text-sm mb-3">{error}</p>
                  {error.includes('expired') && (
                    <button
                      onClick={() => navigate('/forgot-password')}
                      className="text-sm text-red-800 font-medium hover:text-red-900 underline"
                    >
                      Request a new reset link →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reset Password Form */}
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="input-field pr-10"
                  placeholder="Enter your new password"
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
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={passwordData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="input-field pr-10"
                  placeholder="Confirm your new password"
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

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 size={20} className="mr-2 animate-spin" />
                ) : (
                  <Lock size={20} className="mr-2" />
                )}
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </div>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-primary-600 hover:text-primary-500 text-sm font-medium flex items-center justify-center mx-auto"
            >
              <ArrowLeft size={16} className="mr-1" />
              Back to Login
            </button>
          </div>

          {/* Password Requirements */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Password Requirements</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• At least 6 characters long</li>
              <li>• Mix of letters and numbers recommended</li>
              <li>• Avoid common passwords</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

