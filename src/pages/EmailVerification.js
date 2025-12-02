import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, CheckCircle, Loader2, RefreshCw, ArrowRight, Search } from 'lucide-react';
import { auth, supabase } from '../lib/supabase';
import { appConfig } from '../config/appConfig';
import { useToast } from '../contexts/ToastContext';

const EmailVerification = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const pollingIntervalRef = useRef(null);
  const userIdRef = useRef(null);
  const broadcastChannelRef = useRef(null);

  // Stop polling (defined early so it's available to effects)
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Set up cross-tab communication for verification status
  useEffect(() => {
    // Create a BroadcastChannel for cross-tab communication
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannelRef.current = new BroadcastChannel('email-verification');
      
      // Listen for verification messages from other tabs
      broadcastChannelRef.current.onmessage = (event) => {
        if (event.data.type === 'email-verified') {
          // Another tab verified the email, update this tab
          setIsVerified(true);
          stopPolling();
          toast.success('Email verified in another tab! Redirecting to login...');
          setTimeout(() => {
            navigate('/login?verified=success');
          }, 1500);
        }
      };
    }

    // Also listen to localStorage changes (fallback for browsers without BroadcastChannel)
    const handleStorageChange = (e) => {
      if (e.key === 'email-verified' && e.newValue === 'true') {
        setIsVerified(true);
        stopPolling();
        toast.success('Email verified! Redirecting to login...');
        setTimeout(() => {
          navigate('/login?verified=success');
        }, 1500);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [navigate, toast, stopPolling]);

  // Check if this is a callback from email verification link
  useEffect(() => {
    const checkVerification = async () => {
      try {
        // Supabase email verification uses hash fragments (#) in the URL
        // Check for hash fragments first (from email link)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');
        
        // Also check query params (fallback)
        const token = searchParams.get('token') || hashParams.get('token');
        const queryType = searchParams.get('type') || type;
        
        if ((accessToken || token) && (queryType === 'signup' || type === 'signup')) {
          setIsVerifying(true);
          
          // Supabase automatically handles the session when user clicks email link
          // Just check if user is now authenticated and email is confirmed
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Session error:', sessionError);
            toast.error('Verification failed. Please try again or request a new verification email.');
            setIsVerifying(false);
            return;
          }

          if (session?.user?.email_confirmed_at) {
            // Success! Email is verified
            setIsVerified(true);
            setIsVerifying(false);
            
            // Broadcast to other tabs that verification is complete
            if (broadcastChannelRef.current) {
              broadcastChannelRef.current.postMessage({ type: 'email-verified' });
            }
            // Also use localStorage as fallback
            localStorage.setItem('email-verified', 'true');
            setTimeout(() => localStorage.removeItem('email-verified'), 5000);
            
            // Sign out the user (they'll need to log in)
            await auth.signOut();
            
            // Show message to close this tab if it was opened from email
            const isFromEmail = window.opener === null && window.history.length <= 2;
            
            // Redirect to login with success message after a short delay
            setTimeout(() => {
              navigate('/login?verified=success');
              // If opened from email, suggest closing this tab
              if (isFromEmail) {
                setTimeout(() => {
                  if (window.opener) {
                    // If there's an opener window, close this tab
                    window.close();
                  }
                }, 3000);
              }
            }, 2000);
          } else {
            // Token present but not verified yet, wait a bit and check again
            setTimeout(async () => {
              const { data: { session: newSession } } = await supabase.auth.getSession();
              if (newSession?.user?.email_confirmed_at) {
                setIsVerified(true);
                setIsVerifying(false);
                
                // Broadcast to other tabs
                if (broadcastChannelRef.current) {
                  broadcastChannelRef.current.postMessage({ type: 'email-verified' });
                }
                localStorage.setItem('email-verified', 'true');
                setTimeout(() => localStorage.removeItem('email-verified'), 5000);
                
                await auth.signOut();
                setTimeout(() => {
                  navigate('/login?verified=success');
                }, 2000);
              } else {
                toast.error('Verification failed. Please try again or request a new verification email.');
                setIsVerifying(false);
              }
            }, 1000);
          }
        } else {
          // No token, just show the waiting page
          // Try to get email from URL or session
          const emailParam = searchParams.get('email') || hashParams.get('email');
          if (emailParam) {
            setEmail(emailParam);
          } else {
            // Try to get from current session
            const { user } = await auth.getCurrentUser();
            if (user) {
              setEmail(user.email);
              // If user is already verified, redirect to login
              if (user.email_confirmed_at) {
                navigate('/login?verified=success');
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking verification:', error);
        setIsVerifying(false);
      }
    };

    checkVerification();
  }, [searchParams, navigate, toast]);

  // Function to check verification status
  const checkVerificationStatus = useCallback(async (showToast = true) => {
    if (!email) return false;
    
    setIsCheckingStatus(true);
    try {
      // Try to sign in with a refresh to check if email is now confirmed
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session?.user?.email_confirmed_at) {
        // User is verified!
        setIsVerified(true);
        stopPolling();
        
        // Broadcast to other tabs
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({ type: 'email-verified' });
        }
        localStorage.setItem('email-verified', 'true');
        setTimeout(() => localStorage.removeItem('email-verified'), 5000);
        
        // Sign out and redirect to login
        await auth.signOut();
        if (showToast) {
          toast.success('Email verified! Redirecting to login...');
        }
        setTimeout(() => {
          navigate('/login?verified=success');
        }, 1500);
        return true;
      }
      
      // Also try to refresh the session to get latest status
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (refreshData?.session?.user?.email_confirmed_at) {
        setIsVerified(true);
        stopPolling();
        
        // Broadcast to other tabs
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({ type: 'email-verified' });
        }
        localStorage.setItem('email-verified', 'true');
        setTimeout(() => localStorage.removeItem('email-verified'), 5000);
        
        await auth.signOut();
        if (showToast) {
          toast.success('Email verified! Redirecting to login...');
        }
        setTimeout(() => {
          navigate('/login?verified=success');
        }, 1500);
        return true;
      }

      setLastChecked(new Date());
      if (showToast) {
        toast.info('Email not yet verified. Please check your inbox and click the verification link.');
      }
      return false;
    } catch (error) {
      console.error('Error checking verification status:', error);
      if (showToast) {
        toast.error('Unable to check verification status. Please try again.');
      }
      return false;
    } finally {
      setIsCheckingStatus(false);
    }
  }, [email, navigate, toast]);

  // Start polling for verification status
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return; // Already polling
    
    pollingIntervalRef.current = setInterval(() => {
      checkVerificationStatus(false); // Don't show toast for automatic checks
    }, 5000); // Check every 5 seconds
  }, [checkVerificationStatus]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // Start polling when email is available and not verified
  useEffect(() => {
    if (email && !isVerified && !isVerifying) {
      startPolling();
    }
    return () => {
      stopPolling();
    };
  }, [email, isVerified, isVerifying, startPolling, stopPolling]);

  const handleResendEmail = async () => {
    if (!email) {
      toast.error('Email address not found. Please sign up again.');
      return;
    }

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });

      if (error) {
        toast.error(`Unable to resend verification email: ${error.message}`);
      } else {
        toast.success('Verification email has been resent. Please check your inbox.');
      }
    } catch (error) {
      toast.error('Unable to resend verification email. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  // Manual check status handler
  const handleCheckStatus = () => {
    checkVerificationStatus(true);
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-3 sm:px-4">
        <div className="max-w-md w-full bg-white rounded-xl sm:rounded-2xl shadow-xl p-5 sm:p-8 text-center">
          <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 animate-spin text-primary-600 mx-auto mb-3 sm:mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Verifying Your Email</h2>
          <p className="text-sm sm:text-base text-gray-600">Please wait while we verify your email address...</p>
        </div>
      </div>
    );
  }

  if (isVerified) {
    const isFromEmail = window.opener === null && window.history.length <= 2;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-3 sm:px-4">
        <div className="max-w-md w-full bg-white rounded-xl sm:rounded-2xl shadow-xl p-5 sm:p-8 text-center">
          <div className="mb-4 sm:mb-6">
            <div className="h-12 w-12 sm:h-16 sm:w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              Your email has been successfully verified. Redirecting to login...
            </p>
            {isFromEmail && (
              <p className="text-xs sm:text-sm text-gray-500 italic">
                You can close this tab and return to the original page.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-3 sm:px-4 py-6 sm:py-0">
      <div className="max-w-md w-full bg-white rounded-xl sm:rounded-2xl shadow-xl p-5 sm:p-8">
        {/* Header */}
        <div className="text-center mb-5 sm:mb-8">
          <div className="h-12 w-12 sm:h-16 sm:w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Mail className="h-7 w-7 sm:h-10 sm:w-10 text-blue-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1.5 sm:mb-2">Verify Your Email</h1>
          <p className="text-sm sm:text-base text-gray-600">
            We've sent a verification email to <span className="font-semibold text-gray-900 break-all">{email || 'your email address'}</span>
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-2 sm:mb-3">Next Steps:</h3>
          <ol className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-700">
            <li className="flex items-start">
              <span className="font-bold text-blue-600 mr-2">1.</span>
              <span>Check your email inbox (and spam folder)</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-blue-600 mr-2">2.</span>
              <span>Click the verification link in the email</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-blue-600 mr-2">3.</span>
              <span>You'll be redirected to login once verified</span>
            </li>
          </ol>
        </div>

        {/* Auto-checking indicator */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex items-center">
            <div className="relative mr-2 sm:mr-3 flex-shrink-0">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-green-800">Auto-checking verification status</p>
              <p className="text-xs text-green-600 truncate">
                {lastChecked 
                  ? `Last checked: ${lastChecked.toLocaleTimeString()}`
                  : 'Checking every 5 seconds...'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 sm:space-y-3">
          {/* Check Status Button */}
          <button
            onClick={handleCheckStatus}
            disabled={isCheckingStatus}
            className="w-full flex items-center justify-center px-4 py-2.5 sm:py-3 bg-primary-600 text-white text-sm sm:text-base rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isCheckingStatus ? (
              <>
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin mr-2" />
                Checking...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Check Verification Status
              </>
            )}
          </button>

          {/* Resend Email Button */}
          <button
            onClick={handleResendEmail}
            disabled={isResending || !email}
            className="w-full flex items-center justify-center px-4 py-2.5 sm:py-3 bg-white text-sm sm:text-base border-2 border-gray-300 rounded-lg hover:border-primary-500 hover:text-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResending ? (
              <>
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Resend Verification Email
              </>
            )}
          </button>

          <Link
            to="/login"
            className="block w-full text-center px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-600 hover:text-gray-900 transition-colors"
          >
            Back to Login
          </Link>
        </div>

        {/* Help Text */}
        <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center leading-relaxed">
            Didn't receive the email? Check your spam folder or try resending.
            Already verified? Click "Check Verification Status" above.
            If you continue to have issues, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;

