import { supabase } from '../lib/supabase';

export const storageService = {
  // Upload image to Supabase Storage
  async uploadEventImage(file, userId, eventId = null) {
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${eventId || 'temp'}/${Date.now()}.${fileExt}`;
      
      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('event-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName);

      return { 
        data: { 
          path: data.path, 
          publicUrl 
        }, 
        error: null 
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      return { data: null, error };
    }
  },

  // Delete image from Supabase Storage
  async deleteEventImage(imagePath) {
    try {
      const { error } = await supabase.storage
        .from('event-images')
        .remove([imagePath]);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error deleting image:', error);
      return { error };
    }
  },

  // Get image URL from path
  getImageUrl(imagePath) {
    if (!imagePath) return null;
    
    const { data: { publicUrl } } = supabase.storage
      .from('event-images')
      .getPublicUrl(imagePath);
    
    return publicUrl;
  },

  // Upload verification document
  async uploadVerificationDocument(file, userId) {
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `verifications/${userId}/${Date.now()}.${fileExt}`;
      
      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('verification-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL (signed URL for private bucket)
      const { data: { publicUrl } } = supabase.storage
        .from('verification-documents')
        .getPublicUrl(fileName);

      return { 
        data: { 
          path: data.path, 
          publicUrl 
        }, 
        error: null 
      };
    } catch (error) {
      console.error('Error uploading verification document:', error);
      return { data: null, error };
    }
  },

  // Get signed URL for verification document (for admin viewing)
  async getVerificationDocumentUrl(filePath, expiresIn = 3600) {
    try {
      const { data, error } = await supabase.storage
        .from('verification-documents')
        .createSignedUrl(filePath, expiresIn);

      if (error) throw error;
      return { data: data?.signedUrl || null, error: null };
    } catch (error) {
      console.error('Error getting verification document URL:', error);
      return { data: null, error };
    }
  }
};
