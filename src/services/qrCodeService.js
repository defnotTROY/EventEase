import QRCode from 'qrcode';

class QRCodeService {
  // Generate QR code for user
  async generateUserQRCode(userId, userEmail) {
    try {
      // Create a unique identifier for the user
      const userData = {
        userId: userId,
        email: userEmail,
        type: 'user_profile',
        version: '1.0' // Static version instead of timestamp
      };

      // Convert to JSON string
      const qrData = JSON.stringify(userData);

      // Generate QR code as data URL
      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      return {
        dataURL: qrCodeDataURL,
        data: qrData,
        userData: userData
      };
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  // Generate QR code for event check-in
  async generateEventCheckInQRCode(eventId, eventTitle) {
    try {
      const eventData = {
        eventId: eventId,
        eventTitle: eventTitle,
        type: 'event_checkin',
        version: '1.0' // Static version instead of timestamp
      };

      const qrData = JSON.stringify(eventData);

      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      return {
        dataURL: qrCodeDataURL,
        data: qrData,
        eventData: eventData
      };
    } catch (error) {
      console.error('Error generating event QR code:', error);
      throw error;
    }
  }

  // Parse QR code data
  parseQRCodeData(qrDataString) {
    try {
      const data = JSON.parse(qrDataString);
      return data;
    } catch (error) {
      console.error('Error parsing QR code data:', error);
      return null;
    }
  }

  // Validate QR code data
  validateQRCodeData(data) {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Check required fields based on type
    if (data.type === 'user_profile') {
      return data.userId && data.email && data.type;
    } else if (data.type === 'event_checkin') {
      return data.eventId && data.eventTitle && data.type;
    }

    return false;
  }

  // Download QR code as image
  downloadQRCode(dataURL, filename = 'qr-code.png') {
    try {
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading QR code:', error);
    }
  }

  // Generate QR code with custom styling
  async generateStyledQRCode(data, options = {}) {
    try {
      const defaultOptions = {
        width: 256,
        margin: 2,
        color: {
          dark: '#1F2937', // Dark gray
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      };

      const finalOptions = { ...defaultOptions, ...options };
      const qrData = typeof data === 'string' ? data : JSON.stringify(data);

      return await QRCode.toDataURL(qrData, finalOptions);
    } catch (error) {
      console.error('Error generating styled QR code:', error);
      throw error;
    }
  }
}

export const qrCodeService = new QRCodeService();
