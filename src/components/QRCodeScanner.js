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
import jsqr from 'jsqr';
import { qrCodeService } from '../services/qrCodeService';

const QRCodeScanner = ({ onScan, onError, onClose }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const isScanningRef = useRef(false);

  useEffect(() => {
    return () => {
      // Cleanup camera stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);
      isScanningRef.current = true;

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
        
        // Wait for video to be ready
        await new Promise((resolve) => {
          if (videoRef.current.readyState >= 2) {
            resolve();
          } else {
            videoRef.current.addEventListener('loadedmetadata', resolve, { once: true });
            videoRef.current.addEventListener('loadeddata', resolve, { once: true });
          }
        });
        
        await videoRef.current.play();
        
        // Start detection after a short delay to ensure video is playing
        setTimeout(() => {
          detectQRCode();
        }, 500);
      }

    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Camera access denied or not available');
      setHasPermission(false);
      setIsScanning(false);
      isScanningRef.current = false;
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    isScanningRef.current = false;
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const detectQRCode = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.log('Video or canvas not ready');
      return;
    }

    // Clear any existing interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Wait for video dimensions to be available
    const checkVideoReady = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        console.log('Starting QR detection, video size:', canvas.width, 'x', canvas.height);
        
        scanIntervalRef.current = setInterval(() => {
          if (!isScanningRef.current || !video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        return;
      }
      
          try {
            // Draw video frame to canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Get image data from canvas
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            
            // Detect QR code using jsqr
            const code = jsqr(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (code && code.data) {
              // QR code detected!
              console.log('QR code detected:', code.data);
              // Temporarily pause scanning to process the QR code
              // Don't stop completely - we'll resume after processing
              const detectedData = code.data;
              // Clear interval temporarily
              if (scanIntervalRef.current) {
                clearInterval(scanIntervalRef.current);
                scanIntervalRef.current = null;
              }
              // Process the scanned data
              processScannedData(detectedData);
            }
          } catch (err) {
            console.error('Error detecting QR code:', err);
          }
        }, 200); // Check every 200ms
      } else {
        // Video not ready yet, check again
        setTimeout(checkVideoReady, 100);
      }
    };

    checkVideoReady();
  };

  const handleManualInput = () => {
    const qrData = prompt('Enter QR code data manually:');
    if (qrData) {
      processScannedData(qrData);
    }
  };

  const processScannedData = async (data) => {
    try {
      const parsedData = qrCodeService.parseQRCodeData(data);
      
      if (qrCodeService.validateQRCodeData(parsedData)) {
        setScannedData(parsedData);
        setError(null);
        
        // Call the onScan callback
        if (onScan) {
          await onScan(parsedData);
        }
        
        // After successful scan, reset scanner after a short delay to allow scanning multiple QR codes
        setTimeout(() => {
          setScannedData(null);
          // Restart scanning if video is still active and scanning was enabled
          if (videoRef.current && videoRef.current.readyState >= 2 && isScanningRef.current) {
            detectQRCode();
          }
        }, 1500); // 1.5 second delay to show success, then reset
      } else {
        setError('Invalid QR code format');
        if (onError) {
          onError('Invalid QR code format');
        }
        // Restart scanning even on error
        setTimeout(() => {
          setError(null);
          if (videoRef.current && videoRef.current.readyState >= 2 && isScanningRef.current) {
            detectQRCode();
          }
        }, 2000);
      }
    } catch (err) {
      setError('Failed to parse QR code data');
      if (onError) {
        onError('Failed to parse QR code data');
      }
      // Restart scanning even on error
      setTimeout(() => {
        setError(null);
        if (videoRef.current && videoRef.current.readyState >= 2 && isScanningRef.current) {
          detectQRCode();
        }
      }, 2000);
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
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-[calc(100vw-24px)] sm:max-w-md max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center min-w-0">
              <QrCode className="text-primary-600 mr-2 sm:mr-3 flex-shrink-0" size={20} />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">QR Code Scanner</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"
            >
              <XCircle size={22} />
            </button>
          </div>

          {/* Scanner Area */}
          <div className="space-y-3 sm:space-y-4">
            {!isScanning && !scannedData && (
              <div className="text-center py-6 sm:py-8">
                <Camera className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mb-3 sm:mb-4" />
                <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Ready to Scan</h4>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 px-2">
                  Position the QR code within the camera view to scan
                </p>
                <button
                  onClick={startScanning}
                  className="w-full flex items-center justify-center px-4 sm:px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors text-sm sm:text-base"
                >
                  <Camera size={18} className="mr-2" />
                  Start Scanning
                </button>
                <button
                  onClick={handleManualInput}
                  className="w-full flex items-center justify-center px-4 sm:px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors mt-2 sm:mt-3 text-sm sm:text-base"
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
                  className="w-full h-48 sm:h-64 bg-gray-100 rounded-lg object-cover"
                  playsInline
                  autoPlay
                  muted
                />
                {/* Hidden canvas for QR detection */}
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 border-2 border-primary-500 rounded-lg pointer-events-none">
                  <div className="absolute top-2 left-2 w-5 h-5 sm:w-6 sm:h-6 border-t-2 border-l-2 border-primary-500"></div>
                  <div className="absolute top-2 right-2 w-5 h-5 sm:w-6 sm:h-6 border-t-2 border-r-2 border-primary-500"></div>
                  <div className="absolute bottom-2 left-2 w-5 h-5 sm:w-6 sm:h-6 border-b-2 border-l-2 border-primary-500"></div>
                  <div className="absolute bottom-2 right-2 w-5 h-5 sm:w-6 sm:h-6 border-b-2 border-r-2 border-primary-500"></div>
                </div>
                <div className="absolute bottom-3 sm:bottom-4 left-1/2 transform -translate-x-1/2">
                  <button
                    onClick={stopScanning}
                    className="bg-red-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm hover:bg-red-600"
                  >
                    Stop Scanning
                  </button>
                </div>
                <div className="absolute top-3 sm:top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm whitespace-nowrap">
                  Point camera at QR code
                </div>
              </div>
            )}

            {/* Scanned Result */}
            {scannedData && (
              <div className="space-y-3 sm:space-y-4">
                <div className={`p-3 sm:p-4 rounded-lg border-2 ${
                  scannedData.type === 'user_profile' ? 'border-blue-200 bg-blue-50' :
                  scannedData.type === 'event_checkin' ? 'border-green-200 bg-green-50' :
                  'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center mb-2 sm:mb-3">
                    <div className="text-xl sm:text-2xl mr-2 sm:mr-3">
                      {getQRCodeTypeInfo(scannedData).icon}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm sm:text-base">
                        {getQRCodeTypeInfo(scannedData).title}
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">
                        {getQRCodeTypeInfo(scannedData).description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-xs sm:text-sm text-gray-700 space-y-1">
                    {scannedData.userId && (
                      <p className="truncate"><strong>User ID:</strong> {scannedData.userId}</p>
                    )}
                    {scannedData.email && (
                      <p className="truncate"><strong>Email:</strong> {scannedData.email}</p>
                    )}
                    {scannedData.eventId && (
                      <p className="truncate"><strong>Event ID:</strong> {scannedData.eventId}</p>
                    )}
                    {scannedData.eventTitle && (
                      <p className="break-words"><strong>Event:</strong> {scannedData.eventTitle}</p>
                    )}
                    {scannedData.version && (
                      <p><strong>Version:</strong> {scannedData.version}</p>
                    )}
                    <p><strong>Scanned:</strong> {new Date().toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={resetScanner}
                    className="btn-secondary flex-1 py-2.5 sm:py-2 text-sm sm:text-base"
                  >
                    <RefreshCw size={16} className="mr-2" />
                    Scan Another
                  </button>
                  <button
                    onClick={onClose}
                    className="btn-primary flex-1 py-2.5 sm:py-2 text-sm sm:text-base"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-start">
                  <AlertCircle className="text-red-600 mr-2 sm:mr-3 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-red-800 font-medium text-sm sm:text-base">Scan Error</p>
                    <p className="text-red-700 text-xs sm:text-sm">{error}</p>
                  </div>
                </div>
                <button
                  onClick={resetScanner}
                  className="mt-2 sm:mt-3 text-red-600 hover:text-red-800 underline text-xs sm:text-sm"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Permission Denied */}
            {hasPermission === false && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-start">
                  <AlertCircle className="text-yellow-600 mr-2 sm:mr-3 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-yellow-800 font-medium text-sm sm:text-base">Camera Access Required</p>
                    <p className="text-yellow-700 text-xs sm:text-sm">
                      Please allow camera access to scan QR codes, or use manual input instead.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleManualInput}
                  className="mt-2 sm:mt-3 btn-secondary text-sm py-2"
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
