-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'timely_suggestion', 'price_alert', 'last_chance', 'nearby_alert', 'system_alert'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  action_url VARCHAR(500),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- User Notification Preferences Table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  frequency VARCHAR(20) DEFAULT 'real-time', -- 'real-time', 'daily-digest', 'weekly-digest'
  categories JSONB DEFAULT '{
    "music": true,
    "sports": true,
    "food": true,
    "tech": true,
    "arts": true,
    "business": true,
    "education": true,
    "other": true
  }',
  quiet_hours JSONB DEFAULT '{
    "enabled": true,
    "start": "22:00",
    "end": "08:00"
  }',
  priority_level VARCHAR(20) DEFAULT 'all', -- 'all', 'urgent-only', 'high-priority'
  location_based BOOLEAN DEFAULT TRUE,
  max_daily_notifications INTEGER DEFAULT 3,
  timely_suggestions BOOLEAN DEFAULT TRUE,
  price_alerts BOOLEAN DEFAULT TRUE,
  last_chance_reminders BOOLEAN DEFAULT TRUE,
  nearby_alerts BOOLEAN DEFAULT TRUE,
  weather_alerts BOOLEAN DEFAULT TRUE,
  traffic_reminders BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON user_notification_preferences(user_id);

-- Event Views Table (for tracking which events users view for price alerts)
CREATE TABLE IF NOT EXISTS event_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_event_views_user_id ON event_views(user_id);
CREATE INDEX IF NOT EXISTS idx_event_views_event_id ON event_views(event_id);
CREATE INDEX IF NOT EXISTS idx_event_views_viewed_at ON event_views(viewed_at DESC);

-- User Locations Table (for location-based notifications)
CREATE TABLE IF NOT EXISTS user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);

-- Price History Table (for tracking price changes)
CREATE TABLE IF NOT EXISTS event_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_event_id ON event_price_history(event_id);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at ON event_price_history(recorded_at DESC);

-- Row Level Security (RLS) Policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS for notification preferences
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification preferences"
  ON user_notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON user_notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
  ON user_notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS for event views
ALTER TABLE event_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own event views"
  ON event_views FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own event views"
  ON event_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS for user locations
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own location"
  ON user_locations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own location"
  ON user_locations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own location"
  ON user_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_locations_updated_at
  BEFORE UPDATE ON user_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

