-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-documents',
  'verification-documents',
  false, -- Private bucket for security
  10485760, -- 10MB limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for verification documents
-- Users can upload their own verification documents
CREATE POLICY "Users can upload their own verification documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'verification-documents' AND
  (storage.foldername(name))[1] = 'verifications' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Users can view their own verification documents
CREATE POLICY "Users can view their own verification documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'verification-documents' AND
  (storage.foldername(name))[1] = 'verifications' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Admins can view all verification documents
CREATE POLICY "Admins can view all verification documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'verification-documents' AND
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND (auth.users.raw_user_meta_data->>'role' = 'Administrator' OR auth.users.raw_user_meta_data->>'role' = 'Admin')
  )
);

-- Users can delete their own pending/rejected verification documents
CREATE POLICY "Users can delete their own verification documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'verification-documents' AND
  (storage.foldername(name))[1] = 'verifications' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Admins can delete any verification documents
CREATE POLICY "Admins can delete any verification documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'verification-documents' AND
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND (auth.users.raw_user_meta_data->>'role' = 'Administrator' OR auth.users.raw_user_meta_data->>'role' = 'Admin')
  )
);

