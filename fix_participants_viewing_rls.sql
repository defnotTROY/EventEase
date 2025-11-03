-- Update RLS policies for participants table to allow broader access
-- This script allows event organizers to view all participants

-- Drop existing policies
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

-- Allow ALL authenticated users to view participants (for admin/organizer purposes)
-- This allows the Participants page to show all participants from all events
CREATE POLICY "All authenticated users can view participants" ON participants
  FOR SELECT USING (auth.uid() IS NOT NULL);

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
