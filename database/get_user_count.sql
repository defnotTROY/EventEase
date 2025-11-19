-- Function to get total user count from auth.users
-- Run this in Supabase SQL Editor to create the function

CREATE OR REPLACE FUNCTION get_user_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint FROM auth.users;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_count() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_count() TO anon;

-- Test the function
-- SELECT get_user_count();
