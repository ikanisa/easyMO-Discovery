-- Migration: AI-First Multi-Domain Schema
-- Date: 2025-01-28
-- Description: Comprehensive schema for AI-first app with mobility, marketplace, payments, and conversation tracking
-- Dependencies: Requires PostGIS extension

BEGIN;

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

-- Enable PostGIS for geographical queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. USER PROFILES TABLE
-- ============================================================================

-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add columns if they don't exist (for existing tables)
DO $$
BEGIN
  -- Add display_name if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_profiles' AND column_name = 'display_name') THEN
    ALTER TABLE user_profiles ADD COLUMN display_name TEXT;
  END IF;
  
  -- Add phone if missing (may exist as phone_number)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_profiles' AND column_name = 'phone') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'user_profiles' AND column_name = 'phone_number') THEN
      ALTER TABLE user_profiles ADD COLUMN phone TEXT;
      UPDATE user_profiles SET phone = phone_number WHERE phone IS NULL;
    ELSE
      ALTER TABLE user_profiles ADD COLUMN phone TEXT;
    END IF;
  END IF;
  
  -- Ensure created_at exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_profiles' AND column_name = 'created_at') THEN
    ALTER TABLE user_profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
  END IF;
  
  -- Ensure updated_at exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE user_profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone) WHERE phone IS NOT NULL;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Create RLS policies
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 3. USER ROLES TABLE (Multi-role support)
-- ============================================================================

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('passenger', 'driver', 'vendor', 'admin', 'staff')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, role)
);

-- Update check constraint if table exists with old constraint
DO $$
BEGIN
  -- Check if constraint exists with old values
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name LIKE '%user_roles_role%' 
    AND constraint_schema = 'public'
  ) THEN
    -- Drop old constraint
    ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
    -- Add new constraint
    ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check 
      CHECK (role IN ('passenger', 'driver', 'vendor', 'admin', 'staff'));
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(user_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can update own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can delete own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Staff can manage roles" ON user_roles;

-- Create RLS policies
-- Users can read their own roles
CREATE POLICY "Users can read own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own roles (except admin/staff)
CREATE POLICY "Users can insert own roles" ON user_roles
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND role NOT IN ('admin', 'staff')
  );

-- Users can update their own roles (except admin/staff)
CREATE POLICY "Users can update own roles" ON user_roles
  FOR UPDATE USING (auth.uid() = user_id) 
  WITH CHECK (
    auth.uid() = user_id 
    AND role NOT IN ('admin', 'staff')
  );

-- Users can delete their own roles (except admin/staff)
CREATE POLICY "Users can delete own roles" ON user_roles
  FOR DELETE USING (
    auth.uid() = user_id 
    AND role NOT IN ('admin', 'staff')
  );

-- Admins can manage all roles
CREATE POLICY "Admins can manage all roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND is_active = true
    )
  );

-- Staff can manage non-admin roles
CREATE POLICY "Staff can manage roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'staff' 
      AND is_active = true
    )
    AND role != 'admin'
  );

-- ============================================================================
-- 4. PRESENCE TABLE (Real-time location matching)
-- ============================================================================

-- Create presence table if it doesn't exist
CREATE TABLE IF NOT EXISTS presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('passenger', 'driver', 'vendor')),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  geohash TEXT,
  is_online BOOLEAN DEFAULT true NOT NULL,
  last_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  meta JSONB DEFAULT '{}'::jsonb
);

-- Add columns if they don't exist
DO $$
BEGIN
  -- Add geohash if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'presence' AND column_name = 'geohash') THEN
    ALTER TABLE presence ADD COLUMN geohash TEXT;
  END IF;
  
  -- Add expires_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'presence' AND column_name = 'expires_at') THEN
    ALTER TABLE presence ADD COLUMN expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour');
  END IF;
  
  -- Add meta if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'presence' AND column_name = 'meta') THEN
    ALTER TABLE presence ADD COLUMN meta JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  -- Ensure lat/lng exist (may exist as location only)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'presence' AND column_name = 'lat') THEN
    ALTER TABLE presence ADD COLUMN lat DOUBLE PRECISION;
    ALTER TABLE presence ADD COLUMN lng DOUBLE PRECISION;
    -- Populate from location if it exists
    UPDATE presence SET 
      lat = ST_Y(location::geometry),
      lng = ST_X(location::geometry)
    WHERE lat IS NULL OR lng IS NULL;
    ALTER TABLE presence ALTER COLUMN lat SET NOT NULL;
    ALTER TABLE presence ALTER COLUMN lng SET NOT NULL;
  END IF;
  
  -- Ensure last_seen_at exists (may exist as last_seen)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'presence' AND column_name = 'last_seen_at') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'presence' AND column_name = 'last_seen') THEN
      ALTER TABLE presence ADD COLUMN last_seen_at TIMESTAMPTZ;
      UPDATE presence SET last_seen_at = last_seen WHERE last_seen_at IS NULL;
      ALTER TABLE presence ALTER COLUMN last_seen_at SET NOT NULL;
      ALTER TABLE presence ALTER COLUMN last_seen_at SET DEFAULT NOW();
    ELSE
      ALTER TABLE presence ADD COLUMN last_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
    END IF;
  END IF;
END $$;

-- Create spatial index
CREATE INDEX IF NOT EXISTS idx_presence_location ON presence USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_presence_geohash ON presence(geohash) WHERE geohash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_presence_role_online ON presence(role, is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_presence_expires_at ON presence(expires_at);

-- Enable RLS
ALTER TABLE presence ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can update own presence" ON presence;
DROP POLICY IF EXISTS "Users can insert own presence" ON presence;
DROP POLICY IF EXISTS "Public read presence" ON presence;

-- Create RLS policies
-- Users can write their own presence
CREATE POLICY "Users can write own presence" ON presence
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Note: Reads are restricted to RPC functions only (no direct SELECT policy)
-- This ensures users can only see presence via get_nearby_presence() function

-- ============================================================================
-- 5. RIDE INTENTS TABLE (Mobility matching)
-- ============================================================================

-- Create ride_intents table (rename from trip_intents if it exists)
DO $$
BEGIN
  -- Check if trip_intents exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_intents') THEN
    -- Rename to ride_intents
    ALTER TABLE trip_intents RENAME TO ride_intents;
  END IF;
END $$;

-- Create ride_intents table if it doesn't exist
CREATE TABLE IF NOT EXISTS ride_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  pickup_location GEOGRAPHY(POINT, 4326) NOT NULL,
  pickup_address TEXT,
  dropoff_lat DOUBLE PRECISION,
  dropoff_lng DOUBLE PRECISION,
  dropoff_location GEOGRAPHY(POINT, 4326),
  dropoff_address TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Migrate from old schema if needed
DO $$
BEGIN
  -- If old columns exist, migrate data
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'ride_intents' AND column_name = 'origin') THEN
    -- Migrate origin to pickup
    UPDATE ride_intents SET 
      pickup_address = origin,
      pickup_lat = ST_Y(origin_location::geometry),
      pickup_lng = ST_X(origin_location::geometry),
      pickup_location = origin_location
    WHERE pickup_address IS NULL;
    
    -- Migrate destination to dropoff
    UPDATE ride_intents SET 
      dropoff_address = destination,
      dropoff_lat = ST_Y(destination_location::geometry),
      dropoff_lng = ST_X(destination_location::geometry),
      dropoff_location = destination_location
    WHERE dropoff_address IS NULL AND destination IS NOT NULL;
    
    -- Drop old columns
    ALTER TABLE ride_intents DROP COLUMN IF EXISTS origin;
    ALTER TABLE ride_intents DROP COLUMN IF EXISTS destination;
    ALTER TABLE ride_intents DROP COLUMN IF EXISTS origin_location;
    ALTER TABLE ride_intents DROP COLUMN IF EXISTS destination_location;
    ALTER TABLE ride_intents DROP COLUMN IF EXISTS role;
  END IF;
  
  -- Migrate user_id to passenger_id if needed
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'ride_intents' AND column_name = 'user_id') THEN
    ALTER TABLE ride_intents RENAME COLUMN user_id TO passenger_id;
  END IF;
  
  -- Add missing columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ride_intents' AND column_name = 'pickup_lat') THEN
    ALTER TABLE ride_intents ADD COLUMN pickup_lat DOUBLE PRECISION;
    ALTER TABLE ride_intents ADD COLUMN pickup_lng DOUBLE PRECISION;
    ALTER TABLE ride_intents ADD COLUMN pickup_location GEOGRAPHY(POINT, 4326);
    ALTER TABLE ride_intents ADD COLUMN pickup_address TEXT;
    ALTER TABLE ride_intents ADD COLUMN dropoff_lat DOUBLE PRECISION;
    ALTER TABLE ride_intents ADD COLUMN dropoff_lng DOUBLE PRECISION;
    ALTER TABLE ride_intents ADD COLUMN dropoff_location GEOGRAPHY(POINT, 4326);
    ALTER TABLE ride_intents ADD COLUMN dropoff_address TEXT;
    ALTER TABLE ride_intents ADD COLUMN notes TEXT;
    ALTER TABLE ride_intents ADD COLUMN expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour');
    
    -- Populate from existing location if available
    UPDATE ride_intents SET 
      pickup_lat = ST_Y(pickup_location::geometry),
      pickup_lng = ST_X(pickup_location::geometry)
    WHERE pickup_lat IS NULL;
    
    ALTER TABLE ride_intents ALTER COLUMN pickup_lat SET NOT NULL;
    ALTER TABLE ride_intents ALTER COLUMN pickup_lng SET NOT NULL;
    ALTER TABLE ride_intents ALTER COLUMN pickup_location SET NOT NULL;
  END IF;
  
  -- Update status constraint if needed
  IF EXISTS (SELECT 1 FROM information_schema.check_constraints 
             WHERE constraint_name LIKE '%ride_intents_status%') THEN
    ALTER TABLE ride_intents DROP CONSTRAINT IF EXISTS ride_intents_status_check;
    ALTER TABLE ride_intents ADD CONSTRAINT ride_intents_status_check 
      CHECK (status IN ('pending', 'matched', 'in_progress', 'completed', 'cancelled'));
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ride_intents_passenger_id ON ride_intents(passenger_id);
CREATE INDEX IF NOT EXISTS idx_ride_intents_status ON ride_intents(status);
CREATE INDEX IF NOT EXISTS idx_ride_intents_pickup_location ON ride_intents USING GIST(pickup_location);
CREATE INDEX IF NOT EXISTS idx_ride_intents_expires_at ON ride_intents(expires_at);
CREATE INDEX IF NOT EXISTS idx_ride_intents_created_at ON ride_intents(created_at DESC);

-- Enable RLS
ALTER TABLE ride_intents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own ride_intents" ON ride_intents;
DROP POLICY IF EXISTS "Users can insert own ride_intents" ON ride_intents;
DROP POLICY IF EXISTS "Users can update own ride_intents" ON ride_intents;
DROP POLICY IF EXISTS "Users can delete own ride_intents" ON ride_intents;

-- Create RLS policies
-- Passengers can read/write their own intents
CREATE POLICY "Passengers can manage own intents" ON ride_intents
  FOR ALL USING (auth.uid() = passenger_id) WITH CHECK (auth.uid() = passenger_id);

-- Note: Drivers can only see intents via create_match_candidates() RPC function

-- ============================================================================
-- 6. MATCHES TABLE (Driver-passenger matching)
-- ============================================================================

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id UUID NOT NULL REFERENCES ride_intents(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  eta_seconds INTEGER,
  distance_m DOUBLE PRECISION,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(intent_id, driver_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_matches_intent_id ON matches(intent_id);
CREATE INDEX IF NOT EXISTS idx_matches_driver_id ON matches(driver_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_score ON matches(score DESC);
CREATE INDEX IF NOT EXISTS idx_matches_expires_at ON matches(expires_at);

-- Enable RLS
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Passengers can view matches for own intents" ON matches;
DROP POLICY IF EXISTS "Drivers can view own matches" ON matches;
DROP POLICY IF EXISTS "Passengers can update matches for own intents" ON matches;
DROP POLICY IF EXISTS "Drivers can update own matches" ON matches;

-- Create RLS policies
-- Passengers can see matches for their intents
CREATE POLICY "Passengers can view matches for own intents" ON matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ride_intents 
      WHERE id = matches.intent_id 
      AND passenger_id = auth.uid()
    )
  );

-- Drivers can see their own matches
CREATE POLICY "Drivers can view own matches" ON matches
  FOR SELECT USING (auth.uid() = driver_id);

-- Passengers can update matches for their intents
CREATE POLICY "Passengers can update matches for own intents" ON matches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM ride_intents 
      WHERE id = matches.intent_id 
      AND passenger_id = auth.uid()
    )
  );

-- Drivers can update their own matches
CREATE POLICY "Drivers can update own matches" ON matches
  FOR UPDATE USING (auth.uid() = driver_id) WITH CHECK (auth.uid() = driver_id);

-- ============================================================================
-- 7. MARKETPLACE LISTINGS TABLE (Update existing)
-- ============================================================================

-- Ensure all required columns exist
DO $$
BEGIN
  -- Add images column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'marketplace_listings' AND column_name = 'images') THEN
    ALTER TABLE marketplace_listings ADD COLUMN images TEXT[] DEFAULT '{}';
  END IF;
  
  -- Ensure status constraint is correct
  IF EXISTS (SELECT 1 FROM information_schema.check_constraints 
             WHERE constraint_name LIKE '%marketplace_listings_status%') THEN
    ALTER TABLE marketplace_listings DROP CONSTRAINT IF EXISTS marketplace_listings_status_check;
    ALTER TABLE marketplace_listings ADD CONSTRAINT marketplace_listings_status_check 
      CHECK (status IN ('active', 'sold', 'removed', 'pending'));
  END IF;
END $$;

-- RLS policies are already created in 20250127_conversations_messages.sql
-- Ensure they're correct
DROP POLICY IF EXISTS "Users can view marketplace_listings" ON marketplace_listings;
DROP POLICY IF EXISTS "Users can insert own marketplace_listings" ON marketplace_listings;
DROP POLICY IF EXISTS "Users can update own marketplace_listings" ON marketplace_listings;
DROP POLICY IF EXISTS "Users can delete own marketplace_listings" ON marketplace_listings;

-- Public read for active listings
CREATE POLICY "Public can view active listings" ON marketplace_listings
  FOR SELECT USING (status = 'active');

-- Vendors can manage their own listings
CREATE POLICY "Vendors can manage own listings" ON marketplace_listings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 8. PAYMENT REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RWF',
  reference TEXT UNIQUE,
  qr_payload JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_requests_created_by ON payment_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_payment_requests_reference ON payment_requests(reference) WHERE reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_expires_at ON payment_requests(expires_at);

-- Enable RLS
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own payment requests" ON payment_requests;
DROP POLICY IF EXISTS "Users can create payment requests" ON payment_requests;
DROP POLICY IF EXISTS "Users can update own payment requests" ON payment_requests;

-- Create RLS policies
CREATE POLICY "Users can view own payment requests" ON payment_requests
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create payment requests" ON payment_requests
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own payment requests" ON payment_requests
  FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

-- ============================================================================
-- 9. CONVERSATIONS TABLE (Update existing)
-- ============================================================================

-- Ensure channel column exists (for future multi-channel support)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'conversations' AND column_name = 'channel') THEN
    ALTER TABLE conversations ADD COLUMN channel TEXT DEFAULT 'chat' CHECK (channel IN ('chat', 'voice', 'whatsapp'));
  END IF;
END $$;

-- RLS policies are already created in 20250127_conversations_messages.sql
-- Ensure they're correct (users own their conversations)

-- ============================================================================
-- 10. MESSAGES TABLE (Update existing)
-- ============================================================================

-- Ensure tool_call is JSONB (may exist as tool_calls)
DO $$
BEGIN
  -- Rename tool_calls to tool_call if needed
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'messages' AND column_name = 'tool_calls') THEN
    ALTER TABLE messages RENAME COLUMN tool_calls TO tool_call;
  END IF;
  
  -- Add tool_call if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'messages' AND column_name = 'tool_call') THEN
    ALTER TABLE messages ADD COLUMN tool_call JSONB;
  END IF;
  
  -- Remove tool_results if it exists (we use tool_traces instead)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'messages' AND column_name = 'tool_results') THEN
    ALTER TABLE messages DROP COLUMN tool_results;
  END IF;
END $$;

-- RLS policies are already created in 20250127_conversations_messages.sql

-- ============================================================================
-- 11. TOOL TRACES TABLE (AI tool execution tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tool_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  input JSONB NOT NULL,
  output JSONB,
  latency_ms INTEGER,
  ok BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tool_traces_conversation_id ON tool_traces(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tool_traces_tool_name ON tool_traces(tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_traces_created_at ON tool_traces(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_traces_ok ON tool_traces(ok);

-- Enable RLS
ALTER TABLE tool_traces ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own tool traces" ON tool_traces;
DROP POLICY IF EXISTS "Admins can view all tool traces" ON tool_traces;

-- Create RLS policies
-- Users can view traces for their conversations
CREATE POLICY "Users can view own tool traces" ON tool_traces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE id = tool_traces.conversation_id 
      AND user_id = auth.uid()
    )
  );

-- Admins can view all traces
CREATE POLICY "Admins can view all tool traces" ON tool_traces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND is_active = true
    )
  );

-- ============================================================================
-- 12. TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Create or replace update_updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for all tables with updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ride_intents_updated_at
  BEFORE UPDATE ON ride_intents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_listings_updated_at
  BEFORE UPDATE ON marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 13. RPC FUNCTIONS
-- ============================================================================

-- Function: get_nearby_presence
-- Returns nearby presence entries for matching
CREATE OR REPLACE FUNCTION get_nearby_presence(
  p_role TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_m DOUBLE PRECISION DEFAULT 5000,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  user_id UUID,
  role TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  distance_m DOUBLE PRECISION,
  is_online BOOLEAN,
  last_seen_at TIMESTAMPTZ,
  meta JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.user_id,
    p.role,
    p.lat,
    p.lng,
    ST_Distance(
      p.location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    )::DOUBLE PRECISION AS distance_m,
    p.is_online,
    p.last_seen_at,
    p.meta
  FROM presence p
  WHERE p.role = p_role
    AND p.is_online = true
    AND p.expires_at > NOW()
    AND ST_DWithin(
      p.location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_m
    )
  ORDER BY distance_m
  LIMIT p_limit;
END;
$$;

-- Function: create_or_refresh_presence
-- Creates or updates presence entry with automatic expiration
CREATE OR REPLACE FUNCTION create_or_refresh_presence(
  p_user_id UUID,
  p_role TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_is_online BOOLEAN DEFAULT true,
  p_ttl_seconds INTEGER DEFAULT 3600,
  p_meta JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_geohash TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Only allow users to update their own presence
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot update presence for other users';
  END IF;
  
  v_expires_at := NOW() + (p_ttl_seconds || ' seconds')::INTERVAL;
  
  -- Simple geohash (can be enhanced with proper geohash library)
  -- For now, we'll use a simple grid-based hash
  v_geohash := floor(p_lat * 100)::TEXT || ',' || floor(p_lng * 100)::TEXT;
  
  INSERT INTO presence (
    user_id, role, lat, lng, location, geohash,
    is_online, last_seen_at, expires_at, meta
  )
  VALUES (
    p_user_id, p_role, p_lat, p_lng,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    v_geohash,
    p_is_online, NOW(), v_expires_at, p_meta
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    role = EXCLUDED.role,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    location = EXCLUDED.location,
    geohash = EXCLUDED.geohash,
    is_online = EXCLUDED.is_online,
    last_seen_at = NOW(),
    expires_at = EXCLUDED.expires_at,
    meta = EXCLUDED.meta;
  
  RETURN p_user_id;
END;
$$;

-- Function: expire_stale_presence
-- Marks expired presence entries as offline
CREATE OR REPLACE FUNCTION expire_stale_presence()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE presence
  SET is_online = false
  WHERE expires_at < NOW()
    AND is_online = true;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Function: create_match_candidates
-- Creates match candidates for a ride intent
CREATE OR REPLACE FUNCTION create_match_candidates(
  p_intent_id UUID,
  p_limit_candidates INTEGER DEFAULT 10
)
RETURNS TABLE (
  match_id UUID,
  driver_id UUID,
  score DOUBLE PRECISION,
  eta_seconds INTEGER,
  distance_m DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_intent ride_intents%ROWTYPE;
  v_candidate presence%ROWTYPE;
  v_match_id UUID;
  v_score DOUBLE PRECISION;
  v_distance_m DOUBLE PRECISION;
  v_eta_seconds INTEGER;
BEGIN
  -- Get the intent
  SELECT * INTO v_intent
  FROM ride_intents
  WHERE id = p_intent_id
    AND status = 'pending'
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Intent not found or not available for matching';
  END IF;
  
  -- Only allow passengers to create matches for their own intents
  IF v_intent.passenger_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot create matches for other users'' intents';
  END IF;
  
  -- Find nearby drivers
  FOR v_candidate IN
    SELECT * FROM get_nearby_presence(
      'driver',
      v_intent.pickup_lat,
      v_intent.pickup_lng,
      10000, -- 10km radius
      p_limit_candidates * 2 -- Get more candidates for scoring
    )
  LOOP
    -- Calculate score (simple distance-based, can be enhanced)
    v_distance_m := ST_Distance(
      v_candidate.location::geography,
      v_intent.pickup_location::geography
    )::DOUBLE PRECISION;
    
    -- Score: inverse distance (closer = higher score)
    v_score := 1000.0 / (v_distance_m + 1.0);
    
    -- Estimate ETA (simple: assume 30 km/h average speed)
    v_eta_seconds := (v_distance_m / 1000.0 / 30.0 * 3600)::INTEGER;
    
    -- Create match candidate
    INSERT INTO matches (
      intent_id, driver_id, score, eta_seconds, distance_m,
      expires_at
    )
    VALUES (
      p_intent_id, v_candidate.user_id, v_score, v_eta_seconds, v_distance_m,
      NOW() + INTERVAL '5 minutes'
    )
    ON CONFLICT (intent_id, driver_id) DO UPDATE
    SET
      score = EXCLUDED.score,
      eta_seconds = EXCLUDED.eta_seconds,
      distance_m = EXCLUDED.distance_m,
      expires_at = EXCLUDED.expires_at
    RETURNING id INTO v_match_id;
    
    -- Return the match
    RETURN QUERY
    SELECT v_match_id, v_candidate.user_id, v_score, v_eta_seconds, v_distance_m;
  END LOOP;
  
  -- Update intent status
  UPDATE ride_intents
  SET status = 'matched'
  WHERE id = p_intent_id;
END;
$$;

-- ============================================================================
-- 14. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION get_nearby_presence(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION create_or_refresh_presence(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, BOOLEAN, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION expire_stale_presence() TO authenticated;
GRANT EXECUTE ON FUNCTION create_match_candidates(UUID, INTEGER) TO authenticated;

-- Grant select on tables (RLS will enforce row-level access)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- ============================================================================
-- 15. SCHEDULED TASKS (via pg_cron if available)
-- ============================================================================

-- Note: pg_cron requires superuser access and may not be available
-- This is a placeholder for future implementation
-- To enable: CREATE EXTENSION IF NOT EXISTS pg_cron;
-- Then: SELECT cron.schedule('expire-stale-presence', '*/5 * * * *', 'SELECT expire_stale_presence();');

COMMIT;

