import React, { useState, useRef, useEffect } from 'react';
import { 
  QrCode, 
  Camera, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  Download,
  RefreshCw
} from 'lucide-react';
import { qrCodeService } from '../services/qrCodeService';

const QRCodeScanner = ({ onScan, onError, onClose }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup camera stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });

      setHasPermission(true);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Start QR code detection
      detectQRCode();

    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Camera access denied or not available');
      setHasPermission(false);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const detectQRCode = () => {
    // This is a simplified QR detection
    // In a real implementation, you'd use a library like jsQR or quagga
    // For now, we'll simulate detection with a manual input option
    
    const interval = setInterval(() => {
      if (!isScanning) {
        clearInterval(interval);
        return;
      }
      
      // Simulate QR code detection
      // In real implementation, this would analyze the video feed
    }, 100);

    return () => clearInterval(interval);
  };

  const handleManualInput = () => {
    const qrData = prompt('Enter QR code data manually:');
    if (qrData) {
      processScannedData(qrData);
    }
  };

  const processScannedData = (data) => {
    try {
      const parsedData = qrCodeService.parseQRCodeData(data);
      
      if (qrCodeService.validateQRCodeData(parsedData)) {
        setScannedData(parsedData);
        setError(null);
        if (onScan) {
          onScan(parsedData);
        }
      } else {
        setError('Invalid QR code format');
        if (onError) {
          onError('Invalid QR code format');
        }
      }
    } catch (err) {
      setError('Failed to parse QR code data');
      if (onError) {
        onError('Failed to parse QR code data');
      }
    }
  };

  const resetScanner = () => {
    setScannedData(null);
    setError(null);
    stopScanning();
  };

  const getQRCodeTypeInfo = (data) => {
    if (data.type === 'user_profile') {
      return {
        title: 'User Profile',
        description: `User: ${data.email}`,
        icon: '👤',
        color: 'blue'
      };
    } else if (data.type === 'event_checkin') {
      return {
        title: 'Event Check-in',
        description: `Event: ${data.eventTitle}`,
        icon: '🎫',
        color: 'green'
      };
    }
    return {
      title: 'Unknown QR Code',
      description: 'QR code type not recognized',
      icon: '❓',
      color: 'gray'
    };
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <QrCode className="text-primary-600 mr-3" size={24} />
              <h3 className="text-lg font-semibold text-gray-900">QR Code Scanner</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle size={24} />
            </button>
          </div>

          {/* Scanner Area */}
          <div className="space-y-4">
            {!isScanning && !scannedData && (
              <div className="text-center py-8">
                <Camera className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Ready to Scan</h4>
                <p className="text-gray-600 mb-6">
                  Position the QR code within the camera view to scan
                </p>
                <button
                  onClick={startScanning}
                  className="btn-primary w-full"
                >
                  <Camera size={20} className="mr-2" />
                  Start Scanning
                </button>
                <button
                  onClick={handleManualInput}
                  className="btn-secondary w-full mt-3"
                >
                  Enter Manually
                </button>
              </div>
            )}

            {/* Camera Feed */}
            {isScanning && (
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full h-64 bg-gray-100 rounded-lg object-cover"
                  playsInline
                />
                <div className="absolute inset-0 border-2 border-primary-500 rounded-lg pointer-events-none">
                  <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-primary-500"></div>
                  <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-primary-500"></div>
                  <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-primary-500"></div>
                  <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-primary-500"></div>
                </div>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <button
                    onClick={stopScanning}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Stop Scanning
                  </button>
                </div>
              </div>
            )}

            {/* Scanned Result */}
            {scannedData && (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border-2 ${
                  scannedData.type === 'user_profile' ? 'border-blue-200 bg-blue-50' :
                  scannedData.type === 'event_checkin' ? 'border-green-200 bg-green-50' :
                  'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center mb-3">
                    <div className="text-2xl mr-3">
                      {getQRCodeTypeInfo(scannedData).icon}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {getQRCodeTypeInfo(scannedData).title}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {getQRCodeTypeInfo(scannedData).description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-700 space-y-1">
                    {scannedData.userId && (
                      <p><strong>User ID:</strong> {scannedData.userId}</p>
                    )}
                    {scannedData.email && (
                      <p><strong>Email:</strong> {scannedData.email}</p>
                    )}
                    {scannedData.eventId && (
                      <p><strong>Event ID:</strong> {scannedData.eventId}</p>
                    )}
                    {scannedData.eventTitle && (
                      <p><strong>Event:</strong> {scannedData.eventTitle}</p>
                    )}
                    {scannedData.version && (
                      <p><strong>Version:</strong> {scannedData.version}</p>
                    )}
                    <p><strong>Scanned:</strong> {new Date().toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={resetScanner}
                    className="btn-secondary flex-1"
                  >
                    <RefreshCw size={16} className="mr-2" />
                    Scan Another
                  </button>
                  <button
                    onClick={onClose}
                    className="btn-primary flex-1"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="text-red-600 mr-3" size={20} />
                  <div>
                    <p className="text-red-800 font-medium">Scan Error</p>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
                <button
                  onClick={resetScanner}
                  className="mt-3 text-red-600 hover:text-red-800 underline text-sm"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Permission Denied */}
            {hasPermission === false && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="text-yellow-600 mr-3" size={20} />
                  <div>
                    <p className="text-yellow-800 font-medium">Camera Access Required</p>
                    <p className="text-yellow-700 text-sm">
                      Please allow camera access to scan QR codes, or use manual input instead.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleManualInput}
                  className="mt-3 btn-secondary"
                >
                  Enter QR Data Manually
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeScanner;
