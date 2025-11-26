import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Download, 
  RefreshCw, 
  Calendar,
  Loader2,
  Copy,
  Check,
  Plus,
  Trash2
} from 'lucide-react';
import { qrCodeService } from '../services/qrCodeService';

const EventQRCodeGenerator = ({ eventId, eventTitle, onClose }) => {
  const [qrCodeData, setQrCodeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    if (eventId && eventTitle) {
      generateEventQRCode();
    }
  }, [eventId, eventTitle]);

  const generateEventQRCode = async () => {
    try {
      setLoading(true);
      setError(null);

      const qrData = await qrCodeService.generateEventCheckInQRCode(
        eventId,
        eventTitle
      );

      setQrCodeData(qrData);
    } catch (error) {
      console.error('Error generating event QR code:', error);
      setError('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const generateCustomQRCode = async () => {
    if (!customMessage.trim()) {
      setError('Please enter a custom message');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const customData = {
        eventId: eventId,
        eventTitle: eventTitle,
        customMessage: customMessage,
        type: 'custom_event_message',
        timestamp: new Date().toISOString()
      };

      const qrData = await qrCodeService.generateStyledQRCode(customData);
      
      setQrCodeData({
        dataURL: qrData,
        data: JSON.stringify(customData),
        eventData: customData
      });
    } catch (error) {
      console.error('Error generating custom QR code:', error);
      setError('Failed to generate custom QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (qrCodeData) {
      qrCodeService.downloadQRCode(
        qrCodeData.dataURL,
        `eventease-event-qr-${eventTitle?.replace(/[^a-zA-Z0-9]/g, '-') || 'event'}.png`
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
    generateEventQRCode();
  };

  if (loading) {
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-3 sm:p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget && onClose) {
            onClose();
          }
        }}
      >
        <div 
          className="bg-white rounded-lg shadow-xl w-full max-w-[calc(100vw-24px)] sm:max-w-md p-4 sm:p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center py-8 sm:py-12">
            <Loader2 className="animate-spin text-primary-600 mr-3" size={24} />
            <span className="text-sm sm:text-base text-gray-600">Generating QR code...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-[calc(100vw-24px)] sm:max-w-lg max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center min-w-0">
              <QrCode className="text-primary-600 mr-2 sm:mr-3 flex-shrink-0" size={20} />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Event QR Code</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"
            >
              ✕
            </button>
          </div>

          {/* Event Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-start sm:items-center">
              <Calendar className="text-blue-600 mr-2 sm:mr-3 flex-shrink-0 mt-0.5 sm:mt-0" size={18} />
              <div className="min-w-0">
                <h4 className="font-medium text-blue-900 text-sm sm:text-base break-words">{eventTitle}</h4>
                <p className="text-xs sm:text-sm text-blue-800 truncate">Event ID: {eventId}</p>
              </div>
            </div>
          </div>

          {/* QR Code Display */}
          {qrCodeData && !error && (
            <div className="text-center mb-4 sm:mb-6">
              <div className="bg-white p-3 sm:p-6 rounded-lg border-2 border-gray-200 inline-block mb-3 sm:mb-4">
                <img
                  src={qrCodeData.dataURL}
                  alt="Event QR Code"
                  className="w-36 h-36 sm:w-48 sm:h-48 mx-auto"
                />
              </div>

              <div className="space-y-2 sm:space-y-3">
                <div className="flex flex-col gap-2 sm:gap-3">
                  <button
                    onClick={handleDownload}
                    className="btn-primary flex items-center justify-center text-sm sm:text-base py-2.5 sm:py-2"
                  >
                    <Download size={16} className="mr-2" />
                    Download QR Code
                  </button>
                  <button
                    onClick={handleCopyData}
                    className="btn-secondary flex items-center justify-center text-sm sm:text-base py-2.5 sm:py-2"
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

                <button
                  onClick={handleRefresh}
                  className="btn-secondary text-xs sm:text-sm py-2"
                >
                  <RefreshCw size={14} className="mr-2" />
                  Generate New QR Code
                </button>
              </div>
            </div>
          )}

          {/* Custom Message QR Code */}
          <div className="border-t pt-4 sm:pt-6">
            <h4 className="font-medium text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Custom Message QR Code</h4>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Custom Message
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Enter a custom message for the QR code..."
                  className="input-field h-16 sm:h-20 resize-none text-sm"
                  rows={3}
                />
              </div>
              <button
                onClick={generateCustomQRCode}
                className="btn-primary w-full text-sm sm:text-base py-2.5 sm:py-2"
              >
                <Plus size={16} className="mr-2" />
                Generate Custom QR Code
              </button>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mt-4 sm:mt-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <QrCode className="text-red-600" size={18} />
                </div>
                <div className="ml-2 sm:ml-3">
                  <p className="text-red-800 font-medium text-sm sm:text-base">Error Generating QR Code</p>
                  <p className="text-red-700 text-xs sm:text-sm mt-1">{error}</p>
                  <button
                    onClick={handleRefresh}
                    className="mt-2 text-red-600 hover:text-red-800 underline text-xs sm:text-sm"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Usage Instructions */}
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">How to Use</h5>
            <div className="text-xs sm:text-sm text-gray-600 space-y-1">
              <p>• <strong>Check-in:</strong> Scan to check into your event</p>
              <p>• <strong>Share:</strong> Quick event info for attendees</p>
              <p>• <strong>Custom:</strong> Special instructions or announcements</p>
              <p>• <strong>Print:</strong> Download for physical materials</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventQRCodeGenerator;
