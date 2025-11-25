-- Add event_type column to events table
-- This column indicates whether an event is 'free' or 'paid'

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS event_type VARCHAR(20) DEFAULT 'free' CHECK (event_type IN ('free', 'paid'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);

-- Update existing events: if they have tickets, mark as 'paid', otherwise 'free'
UPDATE events 
SET event_type = CASE 
  WHEN EXISTS (
    SELECT 1 FROM tickets 
    WHERE tickets.event_id = events.id 
    AND tickets.is_active = true
  ) THEN 'paid'
  ELSE 'free'
END
WHERE event_type IS NULL OR event_type = 'free';

