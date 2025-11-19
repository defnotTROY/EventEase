-- Fix RLS policies for user_verifications table
-- The issue: Regular users can't query auth.users directly
-- Solution: Use a security definer function to check admin status

-- Create a function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND (
      auth.users.raw_user_meta_data->>'role' = 'Administrator' 
      OR auth.users.raw_user_meta_data->>'role' = 'Admin'
    )
  );
END;
$$;

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can view all verifications" ON user_verifications;
DROP POLICY IF EXISTS "Admins can update all verifications" ON user_verifications;
DROP POLICY IF EXISTS "Admins can view all verification history" ON verification_history;
DROP POLICY IF EXISTS "Admins can manage maintenance" ON system_maintenance;
DROP POLICY IF EXISTS "Admins can manage announcements" ON system_announcements;

-- Recreate admin policies using the function
CREATE POLICY "Admins can view all verifications"
  ON user_verifications FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update all verifications"
  ON user_verifications FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can view all verification history"
  ON verification_history FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can manage maintenance"
  ON system_maintenance FOR ALL
  USING (is_admin());

CREATE POLICY "Admins can manage announcements"
  ON system_announcements FOR ALL
  USING (is_admin());

-- Also fix the storage policies that reference auth.users
-- Drop existing storage policies
DROP POLICY IF EXISTS "Admins can view all verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete any verification documents" ON storage.objects;

-- Recreate storage policies using the function
CREATE POLICY "Admins can view all verification documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'verification-documents' AND
  is_admin()
);

CREATE POLICY "Admins can delete any verification documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'verification-documents' AND
  is_admin()
);

