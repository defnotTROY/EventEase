-- Add logout_time column to participants table for tracking logout timestamps
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS logout_time TIMESTAMP WITH TIME ZONE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_participants_logout_time ON participants(logout_time);

-- Add comment to column
COMMENT ON COLUMN participants.logout_time IS 'Timestamp when the participant logged out from the event';

