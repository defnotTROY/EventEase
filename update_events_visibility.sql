-- Update RLS policies to allow all users to view all events
-- This makes events public and visible to everyone

-- Drop ALL existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own events" ON events;
DROP POLICY IF EXISTS "All users can view all events" ON events;
DROP POLICY IF EXISTS "Anonymous users can view events" ON events;

-- Create a new policy that allows all authenticated users to view all events
CREATE POLICY "All users can view all events" ON events
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Keep the existing policies for insert, update, and delete (only owners can modify)
-- These policies remain unchanged:
-- - Users can insert their own events
-- - Users can update their own events  
-- - Users can delete their own events

-- Optional: Add a policy to allow anonymous users to view events (if you want public access)
-- Uncomment the following lines if you want events to be visible without login:
-- CREATE POLICY "Anonymous users can view events" ON events
--   FOR SELECT USING (true);
