-- Add registration source and feedback fields to participants table
-- This enables functional analytics features

-- Add registration_source column
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS registration_source VARCHAR(50) DEFAULT 'website';

-- Add rating column for event satisfaction
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);

-- Add comments field for feedback
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS comments TEXT;

-- Add age field for demographics (optional but useful)
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age >= 1 AND age <= 150);

-- Add created_at if not exists (for analytics)
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing participants to have created_at
UPDATE participants 
SET created_at = registration_date 
WHERE created_at IS NULL;

-- Add index for registration_source for faster analytics queries
CREATE INDEX IF NOT EXISTS idx_participants_registration_source ON participants(registration_source);

-- Add index for rating for faster analytics queries  
CREATE INDEX IF NOT EXISTS idx_participants_rating ON participants(rating);

-- Add index for age for faster analytics queries
CREATE INDEX IF NOT EXISTS idx_participants_age ON participants(age);

-- Update RLS policies if needed (existing policies should still work)
-- No changes needed to RLS since we're just adding optional columns

COMMENT ON COLUMN participants.registration_source IS 'Source of registration: website, social-media, email, referral, direct, other';
COMMENT ON COLUMN participants.rating IS 'Event rating from 1-5 stars';
COMMENT ON COLUMN participants.comments IS 'Feedback comments from participant';
COMMENT ON COLUMN participants.age IS 'Participant age for demographics analysis';

