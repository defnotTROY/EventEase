import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Download, 
  RefreshCw, 
  User, 
  Calendar,
  Loader2,
  Copy,
  Check
} from 'lucide-react';
import { qrCodeService } from '../services/qrCodeService';
import { auth } from '../lib/supabase';

const UserQRCode = () => {
  const [qrCodeData, setQrCodeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { user } = await auth.getCurrentUser();
        setUser(user);
        if (user) {
          await generateQRCode(user);
        }
      } catch (error) {
        console.error('Error getting user:', error);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    getCurrentUser();
  }, []);

  const generateQRCode = async (userData) => {
    try {
      setLoading(true);
      setError(null);

      const qrData = await qrCodeService.generateUserQRCode(
        userData.id,
        userData.email
      );

      setQrCodeData(qrData);
    } catch (error) {
      console.error('Error generating QR code:', error);
      setError('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (qrCodeData) {
      qrCodeService.downloadQRCode(
        qrCodeData.dataURL,
        `eventease-user-qr-${user?.email?.split('@')[0] || 'profile'}.png`
      );
    }
  };

  const handleCopyData = async () => {
    if (qrCodeData) {
      try {
        await navigator.clipboard.writeText(qrCodeData.data);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Error copying QR data:', error);
      }
    }
  };

  const handleRefresh = () => {
    if (user) {
      generateQRCode(user);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-primary-600 mr-3" size={24} />
          <span className="text-gray-600">Generating your QR code...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <QrCode className="text-red-600" size={20} />
            </div>
            <div className="ml-3">
              <p className="text-red-800 font-medium">Error Loading QR Code</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <QrCode className="text-primary-600 mr-3" size={24} />
          <h3 className="text-lg font-semibold text-gray-900">Your Personal QR Code</h3>
        </div>
        <button
          onClick={handleRefresh}
          className="btn-secondary text-sm"
        >
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </button>
      </div>

      <div className="text-center">
        <div className="bg-white p-6 rounded-lg border-2 border-gray-200 inline-block mb-6">
          {qrCodeData && (
            <img
              src={qrCodeData.dataURL}
              alt="User QR Code"
              className="w-64 h-64 mx-auto"
            />
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">How to Use Your QR Code</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-start">
                <User className="text-primary-600 mr-2 mt-0.5" size={16} />
                <div>
                  <p className="font-medium">Event Check-in</p>
                  <p>Show this QR code at events for quick registration</p>
                </div>
              </div>
              <div className="flex items-start">
                <Calendar className="text-primary-600 mr-2 mt-0.5" size={16} />
                <div>
                  <p className="font-medium">Profile Sharing</p>
                  <p>Share your contact info quickly with organizers</p>
                </div>
              </div>
            </div>
          </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="font-medium text-blue-900 mb-2">QR Code Information</h5>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>User ID:</strong> {qrCodeData?.userData?.userId}</p>
                <p><strong>Email:</strong> {qrCodeData?.userData?.email}</p>
                <p><strong>Version:</strong> {qrCodeData?.userData?.version}</p>
              </div>
            </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleDownload}
              className="btn-primary flex items-center justify-center"
            >
              <Download size={16} className="mr-2" />
              Download QR Code
            </button>
            <button
              onClick={handleCopyData}
              className="btn-secondary flex items-center justify-center"
            >
              {copied ? (
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
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h5 className="font-medium text-gray-900 mb-2">Security Note</h5>
          <p className="text-sm text-gray-600">
            This QR code contains your user ID and email. Only share it with trusted event organizers 
            or use it at official EventEase events. The QR code is unique to your account and can be 
            used to identify you at events.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserQRCode;
