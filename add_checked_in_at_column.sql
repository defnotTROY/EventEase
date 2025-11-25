-- Add checked_in_at column to participants table for tracking check-in timestamps
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_participants_checked_in_at ON participants(checked_in_at);

-- Add comment to column
COMMENT ON COLUMN participants.checked_in_at IS 'Timestamp when the participant was checked in to the event';

