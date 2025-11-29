-- Add end_time column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS end_time VARCHAR(50);

-- Add a comment to explain the column
COMMENT ON COLUMN events.end_time IS 'Event end time in 24-hour format (HH:MM)';

