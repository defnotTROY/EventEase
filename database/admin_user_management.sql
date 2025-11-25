-- Admin User Management Functions
-- Run these in Supabase SQL Editor to enable user management operations

-- Drop existing functions if they exist (in case return types changed)
DROP FUNCTION IF EXISTS update_user_role(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_user_status(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS delete_user(UUID) CASCADE;

-- Function to update user role
CREATE OR REPLACE FUNCTION update_user_role(user_id UUID, new_role TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Update user metadata role
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(new_role)
  ),
  updated_at = NOW()
  WHERE id = user_id;

  -- Check if update was successful
  IF FOUND THEN
    SELECT json_build_object(
      'success', true,
      'message', 'User role updated successfully',
      'user_id', user_id,
      'new_role', new_role
    ) INTO result;
  ELSE
    SELECT json_build_object(
      'success', false,
      'message', 'User not found',
      'user_id', user_id
    ) INTO result;
  END IF;

  RETURN result;
END;
$$;

-- Function to update user status (active/inactive)
CREATE OR REPLACE FUNCTION update_user_status(user_id UUID, status TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  banned_until_value TIMESTAMPTZ;
BEGIN
  -- If status is 'suspended', ban user for 1 year
  -- If status is 'inactive', ban user indefinitely
  -- If status is 'active', remove ban
  CASE status
    WHEN 'suspended' THEN
      banned_until_value := NOW() + INTERVAL '1 year';
    WHEN 'inactive' THEN
      banned_until_value := '9999-12-31'::TIMESTAMPTZ;
    WHEN 'active' THEN
      banned_until_value := NULL;
    ELSE
      banned_until_value := NULL;
  END CASE;

  -- Update user ban status
  UPDATE auth.users
  SET banned_until = banned_until_value,
      updated_at = NOW()
  WHERE id = user_id;

  -- Check if update was successful
  IF FOUND THEN
    SELECT json_build_object(
      'success', true,
      'message', 'User status updated successfully',
      'user_id', user_id,
      'status', status
    ) INTO result;
  ELSE
    SELECT json_build_object(
      'success', false,
      'message', 'User not found',
      'user_id', user_id
    ) INTO result;
  END IF;

  RETURN result;
END;
$$;

-- Function to delete user (soft delete by banning)
-- Note: Hard delete requires Supabase Admin API
CREATE OR REPLACE FUNCTION delete_user(user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Soft delete by banning user indefinitely
  UPDATE auth.users
  SET banned_until = '9999-12-31'::TIMESTAMPTZ,
      updated_at = NOW()
  WHERE id = user_id;

  -- Check if update was successful
  IF FOUND THEN
    SELECT json_build_object(
      'success', true,
      'message', 'User deleted successfully (soft delete)',
      'user_id', user_id
    ) INTO result;
  ELSE
    SELECT json_build_object(
      'success', false,
      'message', 'User not found',
      'user_id', user_id
    ) INTO result;
  END IF;

  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user(UUID) TO authenticated;

-- Test functions
-- SELECT update_user_role('user-uuid-here', 'admin');
-- SELECT update_user_status('user-uuid-here', 'suspended');
-- SELECT delete_user('user-uuid-here');


