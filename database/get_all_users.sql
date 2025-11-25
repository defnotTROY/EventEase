-- Function to get all users from auth.users for admin management
-- Run this in Supabase SQL Editor to create the function

-- Drop existing function if it exists (in case return type changed)
DROP FUNCTION IF EXISTS get_all_users() CASCADE;

CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  role TEXT,
  organization TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  email_confirmed_at TIMESTAMPTZ,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email::TEXT,
    COALESCE((u.raw_user_meta_data->>'first_name')::TEXT, '') as first_name,
    COALESCE((u.raw_user_meta_data->>'last_name')::TEXT, '') as last_name,
    COALESCE((u.raw_user_meta_data->>'phone')::TEXT, '') as phone,
    COALESCE((u.raw_user_meta_data->>'role')::TEXT, 'organizer') as role,
    COALESCE((u.raw_user_meta_data->>'organization')::TEXT, '') as organization,
    u.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at,
    CASE 
      WHEN u.banned_until IS NOT NULL AND u.banned_until > NOW() THEN FALSE
      ELSE TRUE
    END as is_active
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated;

-- Test the function
-- SELECT * FROM get_all_users();


