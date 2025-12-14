-- Migration 005: User Profiles Table
-- Created: 2025-12-14
-- Purpose: Store user display names, ratings, and preferences

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic info
  display_name TEXT,
  phone_number TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  
  -- User preferences
  default_role TEXT CHECK (default_role IN ('passenger', 'driver', 'vendor')),
  vehicle_type TEXT CHECK (vehicle_type IN ('moto', 'cab', 'liffan', 'truck', 'other', 'shop')),
  
  -- Verification & reputation
  verified BOOLEAN DEFAULT false,
  rating NUMERIC DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  total_trips INTEGER DEFAULT 0,
  total_earnings NUMERIC DEFAULT 0,
  
  -- Settings (JSON for flexibility)
  settings JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_profiles_phone ON user_profiles(phone_number);
CREATE INDEX idx_user_profiles_verified ON user_profiles(verified) WHERE verified = true;
CREATE INDEX idx_user_profiles_rating ON user_profiles(rating DESC) WHERE verified = true;

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Profiles are viewable by everyone (public info)
CREATE POLICY "Profiles are viewable by everyone"
  ON user_profiles FOR SELECT
  USING (true);

-- Policy: Users can update own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can insert own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_user_profiles_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_timestamp();

-- Trigger: Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_profiles (user_id, display_name, phone_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User ' || SUBSTRING(NEW.id::TEXT, 1, 8)),
    NEW.phone
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION handle_new_user();

-- Function: Update user rating
CREATE OR REPLACE FUNCTION update_user_rating(
  p_user_id UUID,
  p_new_rating NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_rating NUMERIC;
  current_trips INTEGER;
  new_average NUMERIC;
BEGIN
  -- Get current stats
  SELECT rating, total_trips 
  INTO current_rating, current_trips
  FROM user_profiles
  WHERE user_id = p_user_id;
  
  -- Calculate new average
  IF current_trips = 0 THEN
    new_average := p_new_rating;
  ELSE
    new_average := ((current_rating * current_trips) + p_new_rating) / (current_trips + 1);
  END IF;
  
  -- Update profile
  UPDATE user_profiles
  SET 
    rating = new_average,
    total_trips = current_trips + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- Grant permissions
GRANT SELECT ON user_profiles TO authenticated;
GRANT INSERT, UPDATE ON user_profiles TO authenticated;

-- Comments for documentation
COMMENT ON TABLE user_profiles IS 'User profiles with ratings and preferences';
COMMENT ON FUNCTION handle_new_user IS 'Auto-create profile when user signs up';
COMMENT ON FUNCTION update_user_rating IS 'Update user rating with weighted average';

-- Create profiles for existing users (migration safety)
INSERT INTO user_profiles (user_id, display_name)
SELECT 
  id,
  'User ' || SUBSTRING(id::TEXT, 1, 8)
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_profiles)
ON CONFLICT (user_id) DO NOTHING;
