-- Fix RLS policies for participants table to allow event registration
-- This script updates the participants table policies to properly allow registration

-- Drop ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can register for events" ON participants;
DROP POLICY IF EXISTS "Users can view participants of their events" ON participants;
DROP POLICY IF EXISTS "Users can update their own registrations" ON participants;
DROP POLICY IF EXISTS "Users can delete their own registrations" ON participants;
DROP POLICY IF EXISTS "Users can view participants" ON participants;
DROP POLICY IF EXISTS "Event creators can manage participants" ON participants;

-- Create updated policies for participants table
-- Allow users to register for any event (insert their own registration)
CREATE POLICY "Users can register for events" ON participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to view participants of events they created OR their own registrations
CREATE POLICY "Users can view participants" ON participants
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = participants.event_id 
      AND events.user_id = auth.uid()
    )
  );

-- Allow users to update their own registrations
CREATE POLICY "Users can update their own registrations" ON participants
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own registrations
CREATE POLICY "Users can delete their own registrations" ON participants
  FOR DELETE USING (auth.uid() = user_id);

-- Optional: Allow event creators to manage all participants of their events
-- Uncomment the following if you want event creators to be able to update/delete any participant
-- CREATE POLICY "Event creators can manage participants" ON participants
--   FOR ALL USING (
--     EXISTS (
--       SELECT 1 FROM events 
--       WHERE events.id = participants.event_id 
--       AND events.user_id = auth.uid()
--     )
--   );
