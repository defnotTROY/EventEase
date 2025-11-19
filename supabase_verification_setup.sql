-- User Verifications Table
-- Stores verification documents and status for ethical event registration
CREATE TABLE IF NOT EXISTS user_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_type VARCHAR(50) NOT NULL DEFAULT 'identity', -- 'identity', 'organization', 'student', 'professional', 'other'
  document_type VARCHAR(50) NOT NULL, -- 'id_card', 'passport', 'driver_license', 'student_id', 'organization_certificate', 'other'
  document_name VARCHAR(255) NOT NULL, -- Original filename
  file_path TEXT NOT NULL, -- Path to uploaded file in storage
  file_url TEXT NOT NULL, -- Public URL of the file
  file_size INTEGER, -- File size in bytes
  mime_type VARCHAR(100), -- File MIME type
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'expired')),
  reviewed_by UUID REFERENCES auth.users(id), -- Admin who reviewed
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT, -- Reason for rejection if rejected
  admin_notes TEXT, -- Internal notes for admins
  notification_sent BOOLEAN DEFAULT FALSE, -- Whether notification was sent to user
  expires_at TIMESTAMPTZ, -- When verification expires (if applicable)
  metadata JSONB DEFAULT '{}', -- Additional metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_verifications_user_id ON user_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_status ON user_verifications(status);
CREATE INDEX IF NOT EXISTS idx_user_verifications_reviewed_by ON user_verifications(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_user_verifications_created_at ON user_verifications(created_at DESC);

-- Verification History Table (for tracking verification changes)
CREATE TABLE IF NOT EXISTS verification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID NOT NULL REFERENCES user_verifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  reviewed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_history_verification_id ON verification_history(verification_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_user_id ON verification_history(user_id);

-- System Maintenance Table (for system alerts)
CREATE TABLE IF NOT EXISTS system_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_maintenance_scheduled_start ON system_maintenance(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_system_maintenance_is_active ON system_maintenance(is_active);

-- System Announcements Table (for important updates)
CREATE TABLE IF NOT EXISTS system_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  is_active BOOLEAN DEFAULT TRUE,
  action_url VARCHAR(500),
  target_audience VARCHAR(50) DEFAULT 'all' CHECK (target_audience IN ('all', 'verified_users', 'unverified_users', 'organizers', 'admins')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_system_announcements_is_active ON system_announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_system_announcements_priority ON system_announcements(priority);
CREATE INDEX IF NOT EXISTS idx_system_announcements_created_at ON system_announcements(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_verifications
CREATE POLICY "Users can view their own verifications"
  ON user_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verifications"
  ON user_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending verifications"
  ON user_verifications FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all verifications"
  ON user_verifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'Administrator' OR auth.users.raw_user_meta_data->>'role' = 'Admin')
    )
  );

CREATE POLICY "Admins can update all verifications"
  ON user_verifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'Administrator' OR auth.users.raw_user_meta_data->>'role' = 'Admin')
    )
  );

-- RLS Policies for verification_history
CREATE POLICY "Users can view their own verification history"
  ON verification_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all verification history"
  ON verification_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'Administrator' OR auth.users.raw_user_meta_data->>'role' = 'Admin')
    )
  );

CREATE POLICY "System can insert verification history"
  ON verification_history FOR INSERT
  WITH CHECK (true);

-- RLS Policies for system_maintenance
CREATE POLICY "Everyone can view active maintenance"
  ON system_maintenance FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Admins can manage maintenance"
  ON system_maintenance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'Administrator' OR auth.users.raw_user_meta_data->>'role' = 'Admin')
    )
  );

-- RLS Policies for system_announcements
CREATE POLICY "Everyone can view active announcements"
  ON system_announcements FOR SELECT
  USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

CREATE POLICY "Admins can manage announcements"
  ON system_announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'Administrator' OR auth.users.raw_user_meta_data->>'role' = 'Admin')
    )
  );

-- Function to update updated_at timestamp
CREATE TRIGGER update_user_verifications_updated_at
  BEFORE UPDATE ON user_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create verification history entry when status changes
CREATE OR REPLACE FUNCTION create_verification_history()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO verification_history (verification_id, user_id, status, reviewed_by, notes)
    VALUES (NEW.id, NEW.user_id, NEW.status, NEW.reviewed_by, NEW.admin_notes);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create verification history
CREATE TRIGGER create_verification_history_trigger
  AFTER UPDATE OF status ON user_verifications
  FOR EACH ROW
  EXECUTE FUNCTION create_verification_history();

-- Function to check if user is verified (for use in other queries)
CREATE OR REPLACE FUNCTION is_user_verified(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_verifications
    WHERE user_id = user_uuid
    AND status = 'approved'
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

