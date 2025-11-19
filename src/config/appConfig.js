/**
 * Application Configuration
 * Centralized configuration for app metadata and versioning
 */

// App metadata
export const appConfig = {
  name: 'EventEase',
  version: process.env.REACT_APP_VERSION || '1.0.0',
  description: 'A Smart Event Management and Engagement Platform Using AI and Cloud Integration',
  features: {
    aiEnabled: true,
    cloudEnabled: true
  },
  qrCode: {
    // Use timestamp for QR code versioning to ensure uniqueness
    useTimestamp: true,
    // Fallback version if timestamp not used
    fallbackVersion: '1.0'
  }
};

// Get formatted version string
export const getAppVersion = () => {
  return `v${appConfig.version}`;
};

// Get footer text
export const getFooterText = () => {
  const features = [];
  if (appConfig.features.aiEnabled) features.push('AI');
  if (appConfig.features.cloudEnabled) features.push('Cloud');
  
  return features.length > 0 
    ? `Powered by ${features.join(' & ')}`
    : 'Powered by EventEase';
};

// Get QR code version
export const getQRCodeVersion = () => {
  if (appConfig.qrCode.useTimestamp) {
    return new Date().toISOString();
  }
  return appConfig.qrCode.fallbackVersion;
};

