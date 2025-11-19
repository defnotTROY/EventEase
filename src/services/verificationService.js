import { supabase } from '../lib/supabase';
import { storageService } from './storageService';
import { notificationService } from './notificationService';
import { pushNotificationService } from './pushNotificationService';

/**
 * Verification Service
 * Handles user profile verification for ethical event registration
 */
class VerificationService {
  /**
   * Get user's verification status
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async getVerification(userId) {
    try {
      const { data, error } = await supabase
        .from('user_verifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return { data: data || null, error: null };
    } catch (error) {
      console.error('Error fetching verification:', error);
      return { data: null, error };
    }
  }

  /**
   * Check if user is verified
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  async isVerified(userId) {
    try {
      const { data, error } = await supabase.rpc('is_user_verified', {
        user_uuid: userId
      });

      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error checking verification status:', error);
      // Fallback to direct query
      const { data } = await this.getVerification(userId);
      return data?.status === 'approved' && (!data.expires_at || new Date(data.expires_at) > new Date());
    }
  }

  /**
   * Upload verification document
   * @param {string} userId - User ID
   * @param {File} file - File to upload
   * @param {Object} verificationData - Verification metadata
   * @returns {Promise<Object>}
   */
  async uploadVerification(userId, file, verificationData) {
    try {
      // Validate file
      if (!file) {
        throw new Error('No file provided');
      }

      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('File size exceeds 10MB limit');
      }

      // Check file type (allow PDF, images, and common document formats)
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload PDF, image, or document file.');
      }

      // Get current user info to store email and full name in metadata
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userEmail = currentUser?.email || null;
      
      // Build full name from first_name and last_name, or use existing full_name
      let userName = null;
      if (currentUser?.user_metadata) {
        const firstName = currentUser.user_metadata.first_name || '';
        const lastName = currentUser.user_metadata.last_name || '';
        if (firstName && lastName) {
          userName = `${firstName} ${lastName}`;
        } else if (currentUser.user_metadata.full_name) {
          userName = currentUser.user_metadata.full_name;
        } else if (firstName) {
          userName = firstName;
        }
      }

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `verifications/${userId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('verification-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('verification-documents')
        .getPublicUrl(fileName);

      // Check if user already has a verification
      const { data: existing } = await this.getVerification(userId);

      const verificationDataToInsert = {
        user_id: userId,
        verification_type: verificationData.verificationType || 'identity',
        document_type: verificationData.documentType || 'id_card',
        document_name: file.name,
        file_path: uploadData.path,
        file_url: publicUrl,
        file_size: file.size,
        mime_type: file.type,
        status: existing ? 'under_review' : 'pending', // If resubmission, mark as under review
        metadata: {
          uploaded_at: new Date().toISOString(),
          user_email: userEmail, // Store email in metadata
          user_name: userName, // Store name in metadata
          ...verificationData.metadata
        }
      };

      let result;
      if (existing) {
        // Update existing verification
        const { data, error } = await supabase
          .from('user_verifications')
          .update({
            ...verificationDataToInsert,
            status: 'pending', // Reset to pending for review
            reviewed_by: null,
            reviewed_at: null,
            rejection_reason: null,
            notification_sent: false
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new verification
        const { data, error } = await supabase
          .from('user_verifications')
          .insert([verificationDataToInsert])
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      return { data: result, error: null };
    } catch (error) {
      console.error('Error uploading verification:', error);
      return { data: null, error };
    }
  }

  /**
   * Get all pending verifications (for admin review)
   * @param {Object} options - Query options
   * @returns {Promise<Object>}
   */
  async getPendingVerifications(options = {}) {
    try {
      const { limit = 50, offset = 0, status = 'pending' } = options;
      
      let query = supabase
        .from('user_verifications')
        .select('*')
        .in('status', status === 'all' ? ['pending', 'under_review'] : [status])
        .order('created_at', { ascending: false });
      
      // Apply limit and offset
      if (limit) {
        query = query.limit(limit);
      }
      
      if (offset) {
        query = query.range(offset, offset + limit - 1);
      }
      
      const { data, error } = await query;

      if (error) throw error;
      
      // Enrich data with user info from metadata
      const enrichedData = (data || []).map(verification => ({
        ...verification,
        users: {
          email: verification.metadata?.user_email || null,
          name: verification.metadata?.user_name || null
        }
      }));
      
      return { data: enrichedData, error: null };
    } catch (error) {
      console.error('Error fetching pending verifications:', error);
      return { data: [], error };
    }
  }

  /**
   * Approve verification (admin only)
   * @param {string} verificationId - Verification ID
   * @param {string} adminId - Admin user ID
   * @param {string} notes - Admin notes
   * @returns {Promise<Object>}
   */
  async approveVerification(verificationId, adminId, notes = null) {
    try {
      const { data, error } = await supabase
        .from('user_verifications')
        .update({
          status: 'approved',
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
          admin_notes: notes,
          notification_sent: false // Will be sent by notification service
        })
        .eq('id', verificationId)
        .select()
        .single();

      if (error) throw error;

      // Mark notification as sent
      await supabase
        .from('user_verifications')
        .update({ notification_sent: true })
        .eq('id', verificationId);

      // Create notification for user
      const notificationResult = await notificationService.createSystemAlert(
        data.user_id,
        'Verification Approved',
        'Your profile verification has been approved! You can now register for events.',
        '/settings?tab=verification',
        { verification_id: verificationId, alert_type: 'verification_approved' }
      );

      if (notificationResult.error) {
        console.error('Error creating notification:', notificationResult.error);
        // Don't fail the whole operation if notification fails
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error approving verification:', error);
      return { data: null, error };
    }
  }

  /**
   * Reject verification (admin only)
   * @param {string} verificationId - Verification ID
   * @param {string} adminId - Admin user ID
   * @param {string} reason - Rejection reason
   * @param {string} notes - Admin notes
   * @returns {Promise<Object>}
   */
  async rejectVerification(verificationId, adminId, reason, notes = null) {
    try {
      const { data, error } = await supabase
        .from('user_verifications')
        .update({
          status: 'rejected',
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason,
          admin_notes: notes,
          notification_sent: false // Will be sent by notification service
        })
        .eq('id', verificationId)
        .select()
        .single();

      if (error) throw error;

      // Mark notification as sent
      await supabase
        .from('user_verifications')
        .update({ notification_sent: true })
        .eq('id', verificationId);

      // Create notification for user
      const notificationResult = await notificationService.createSystemAlert(
        data.user_id,
        'Verification Rejected',
        `Your profile verification was rejected. Reason: ${reason}`,
        '/settings?tab=verification',
        { verification_id: verificationId, alert_type: 'verification_rejected', rejection_reason: reason }
      );

      if (notificationResult.error) {
        console.error('Error creating notification:', notificationResult.error);
        // Don't fail the whole operation if notification fails
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error rejecting verification:', error);
      return { data: null, error };
    }
  }

  /**
   * Get verification history for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async getVerificationHistory(userId) {
    try {
      const { data, error } = await supabase
        .from('verification_history')
        .select(`
          *,
          reviewed_by_user:reviewed_by (
            id,
            email,
            raw_user_meta_data
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching verification history:', error);
      return { data: [], error };
    }
  }

  /**
   * Delete verification document
   * @param {string} verificationId - Verification ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<Object>}
   */
  async deleteVerification(verificationId, userId) {
    try {
      // Get verification to check ownership and get file path
      const { data: verification, error: fetchError } = await supabase
        .from('user_verifications')
        .select('*')
        .eq('id', verificationId)
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Only allow deletion if status is pending or rejected
      if (!['pending', 'rejected'].includes(verification.status)) {
        throw new Error('Cannot delete approved or under review verification');
      }

      // Delete file from storage
      if (verification.file_path) {
        const { error: deleteError } = await supabase.storage
          .from('verification-documents')
          .remove([verification.file_path]);

        if (deleteError) {
          console.error('Error deleting file from storage:', deleteError);
          // Continue with database deletion even if file deletion fails
        }
      }

      // Delete verification from database
      const { error } = await supabase
        .from('user_verifications')
        .delete()
        .eq('id', verificationId);

      if (error) throw error;
      return { data: true, error: null };
    } catch (error) {
      console.error('Error deleting verification:', error);
      return { data: null, error };
    }
  }
}

export const verificationService = new VerificationService();

