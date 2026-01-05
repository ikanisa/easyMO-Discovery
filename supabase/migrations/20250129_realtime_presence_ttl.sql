-- Migration: Realtime Presence and TTL Cleanup
-- Date: 2025-01-29
-- Description: Implements realtime presence updates, TTL cleanup, rate limiting, and anti-spam

BEGIN;

-- ============================================================================
-- 1. UPDATE create_or_refresh_presence FUNCTION
-- ============================================================================

-- Enhanced function with minimum update interval and 15min TTL
CREATE OR REPLACE FUNCTION create_or_refresh_presence(
  p_user_id UUID,
  p_role TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_is_online BOOLEAN DEFAULT true,
  p_ttl_seconds INTEGER DEFAULT 900, -- 15 minutes default
  p_meta JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_geohash TEXT;
  v_expires_at TIMESTAMPTZ;
  v_last_seen_at TIMESTAMPTZ;
  v_min_interval INTERVAL := '10 seconds';
BEGIN
  -- Only allow users to update their own presence
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot update presence for other users';
  END IF;
  
  -- Check minimum update interval (ignore updates faster than 10s)
  SELECT last_seen_at INTO v_last_seen_at
  FROM presence
  WHERE user_id = p_user_id;
  
  IF v_last_seen_at IS NOT NULL AND (NOW() - v_last_seen_at) < v_min_interval THEN
    -- Return existing user_id without updating (rate limiting)
    RETURN p_user_id;
  END IF;
  
  -- Set expires_at to now() + 15 minutes (or provided TTL, max 15min)
  v_expires_at := NOW() + LEAST(p_ttl_seconds, 900)::INTERVAL;
  
  -- Simple geohash for quick filtering
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
    expires_at = v_expires_at, -- Always refresh to now() + 15min
    meta = EXCLUDED.meta;
  
  RETURN p_user_id;
END;
$$;

-- ============================================================================
-- 2. UPDATE expire_stale_presence FUNCTION
-- ============================================================================

-- Enhanced cleanup function
CREATE OR REPLACE FUNCTION expire_stale_presence()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Mark expired presence as offline
  UPDATE presence
  SET is_online = false
  WHERE expires_at < NOW()
    AND is_online = true;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Optionally delete very old presence entries (older than 24 hours)
  DELETE FROM presence
  WHERE expires_at < NOW() - INTERVAL '24 hours';
  
  RETURN v_count;
END;
$$;

-- ============================================================================
-- 3. RIDE INTENTS CLEANUP FUNCTION
-- ============================================================================

-- Function to expire stale ride intents
CREATE OR REPLACE FUNCTION expire_stale_ride_intents()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Mark expired intents as cancelled
  UPDATE ride_intents
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE expires_at < NOW()
    AND status IN ('pending', 'matched');
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Delete very old cancelled/completed intents (older than 7 days)
  DELETE FROM ride_intents
  WHERE status IN ('cancelled', 'completed')
    AND updated_at < NOW() - INTERVAL '7 days';
  
  RETURN v_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION expire_stale_ride_intents() TO authenticated;

-- ============================================================================
-- 4. RATE LIMITING TABLE
-- ============================================================================

-- Table to track rate limits for anti-spam
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL, -- 'ride_intent', 'match_query', etc.
  count INTEGER DEFAULT 1 NOT NULL,
  window_start TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, resource_type, window_start)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_resource ON rate_limits(user_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own rate limits" ON rate_limits;
DROP POLICY IF EXISTS "System can manage rate limits" ON rate_limits;

-- Users can view their own rate limits
CREATE POLICY "Users can view own rate limits" ON rate_limits
  FOR SELECT USING (auth.uid() = user_id);

-- System can insert/update (via SECURITY DEFINER functions)
-- No policy needed for INSERT/UPDATE as functions use SECURITY DEFINER

-- ============================================================================
-- 5. RATE LIMITING FUNCTIONS
-- ============================================================================

-- Function to check and increment rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_resource_type TEXT,
  p_max_count INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
BEGIN
  -- Calculate current window start
  v_window_start := date_trunc('second', NOW() - (EXTRACT(EPOCH FROM NOW())::BIGINT % p_window_seconds || ' seconds')::INTERVAL);
  
  -- Get or create rate limit entry
  INSERT INTO rate_limits (user_id, resource_type, count, window_start)
  VALUES (p_user_id, p_resource_type, 1, v_window_start)
  ON CONFLICT (user_id, resource_type, window_start) DO UPDATE
  SET count = rate_limits.count + 1
  RETURNING count INTO v_current_count;
  
  -- Check if limit exceeded
  IF v_current_count > p_max_count THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Function to clean old rate limit entries
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Delete rate limit entries older than 1 hour
  DELETE FROM rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_rate_limit(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_rate_limits() TO authenticated;

-- ============================================================================
-- 6. ABUSE REPORTING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS abuse_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resource_type TEXT NOT NULL, -- 'presence', 'ride_intent', 'match', etc.
  resource_id UUID,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_abuse_reports_reporter ON abuse_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_abuse_reports_reported_user ON abuse_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_abuse_reports_status ON abuse_reports(status);
CREATE INDEX IF NOT EXISTS idx_abuse_reports_created_at ON abuse_reports(created_at DESC);

-- Enable RLS
ALTER TABLE abuse_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create abuse reports" ON abuse_reports;
DROP POLICY IF EXISTS "Users can view own reports" ON abuse_reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON abuse_reports;

-- Users can create reports
CREATE POLICY "Users can create abuse reports" ON abuse_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports" ON abuse_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports" ON abuse_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND is_active = true
    )
  );

-- ============================================================================
-- 7. ENHANCED RIDE INTENT CREATION WITH RATE LIMITING
-- ============================================================================

-- Function to create ride intent with rate limiting
CREATE OR REPLACE FUNCTION create_ride_intent_safe(
  p_passenger_id UUID,
  p_pickup_lat DOUBLE PRECISION,
  p_pickup_lng DOUBLE PRECISION,
  p_pickup_address TEXT DEFAULT NULL,
  p_dropoff_lat DOUBLE PRECISION DEFAULT NULL,
  p_dropoff_lng DOUBLE PRECISION DEFAULT NULL,
  p_dropoff_address TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_ttl_seconds INTEGER DEFAULT 900 -- 10-15 min default
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_intent_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_rate_limit_ok BOOLEAN;
BEGIN
  -- Only allow users to create intents for themselves
  IF p_passenger_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot create ride intent for other users';
  END IF;
  
  -- Check rate limit: max 5 intents per 10 minutes
  v_rate_limit_ok := check_rate_limit(p_passenger_id, 'ride_intent', 5, 600);
  
  IF NOT v_rate_limit_ok THEN
    RAISE EXCEPTION 'Rate limit exceeded: Too many ride intents. Please wait before creating another.';
  END IF;
  
  -- Enforce TTL: 10-15 minutes (600-900 seconds)
  v_expires_at := NOW() + LEAST(GREATEST(p_ttl_seconds, 600), 900)::INTERVAL;
  
  -- Create ride intent
  INSERT INTO ride_intents (
    passenger_id,
    pickup_lat, pickup_lng, pickup_location, pickup_address,
    dropoff_lat, dropoff_lng, dropoff_location, dropoff_address,
    notes, status, expires_at
  )
  VALUES (
    p_passenger_id,
    p_pickup_lat, p_pickup_lng,
    ST_SetSRID(ST_MakePoint(p_pickup_lng, p_pickup_lat), 4326)::geography,
    p_pickup_address,
    p_dropoff_lat, p_dropoff_lng,
    CASE WHEN p_dropoff_lat IS NOT NULL AND p_dropoff_lng IS NOT NULL
      THEN ST_SetSRID(ST_MakePoint(p_dropoff_lng, p_dropoff_lat), 4326)::geography
      ELSE NULL
    END,
    p_dropoff_address,
    p_notes,
    'pending',
    v_expires_at
  )
  RETURNING id INTO v_intent_id;
  
  RETURN v_intent_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_ride_intent_safe(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT, INTEGER) TO authenticated;

-- ============================================================================
-- 8. ENHANCED MATCH QUERY WITH THROTTLING
-- ============================================================================

-- Function to get nearby ride intents for drivers (with throttling)
CREATE OR REPLACE FUNCTION get_nearby_ride_intents(
  p_driver_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_m DOUBLE PRECISION DEFAULT 10000,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  intent_id UUID,
  passenger_id UUID,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  pickup_address TEXT,
  dropoff_lat DOUBLE PRECISION,
  dropoff_lng DOUBLE PRECISION,
  dropoff_address TEXT,
  notes TEXT,
  distance_m DOUBLE PRECISION,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rate_limit_ok BOOLEAN;
BEGIN
  -- Only allow drivers to query
  IF p_driver_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot query ride intents for other users';
  END IF;
  
  -- Check rate limit: max 20 queries per minute
  v_rate_limit_ok := check_rate_limit(p_driver_id, 'match_query', 20, 60);
  
  IF NOT v_rate_limit_ok THEN
    RAISE EXCEPTION 'Rate limit exceeded: Too many match queries. Please wait before querying again.';
  END IF;
  
  -- Return nearby pending intents
  RETURN QUERY
  SELECT
    ri.id AS intent_id,
    ri.passenger_id,
    ri.pickup_lat,
    ri.pickup_lng,
    ri.pickup_address,
    ri.dropoff_lat,
    ri.dropoff_lng,
    ri.dropoff_address,
    ri.notes,
    ST_Distance(
      ri.pickup_location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    )::DOUBLE PRECISION AS distance_m,
    ri.created_at,
    ri.expires_at
  FROM ride_intents ri
  WHERE ri.status = 'pending'
    AND ri.expires_at > NOW()
    AND ST_DWithin(
      ri.pickup_location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_m
    )
  ORDER BY distance_m
  LIMIT p_limit;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_nearby_ride_intents(UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;

-- ============================================================================
-- 9. REALTIME PUBLICATION CONFIGURATION
-- ============================================================================

-- Enable realtime for presence table (with sanitized data)
-- Note: This requires Supabase Dashboard configuration, but we document it here

-- Create a view for realtime presence (sanitized coordinates)
CREATE OR REPLACE VIEW presence_realtime AS
SELECT
  user_id,
  role,
  -- Sanitize coordinates: round to ~100m precision (0.001 degrees ≈ 111m)
  ROUND(lat::numeric, 3) AS lat_approx,
  ROUND(lng::numeric, 3) AS lng_approx,
  geohash,
  is_online,
  last_seen_at,
  expires_at,
  meta
FROM presence
WHERE expires_at > NOW();

-- Grant select on view
GRANT SELECT ON presence_realtime TO authenticated;

-- Create a view for realtime ride intents (for drivers)
CREATE OR REPLACE VIEW ride_intents_realtime AS
SELECT
  id,
  passenger_id,
  -- Sanitize pickup coordinates
  ROUND(pickup_lat::numeric, 3) AS pickup_lat_approx,
  ROUND(pickup_lng::numeric, 3) AS pickup_lng_approx,
  pickup_address,
  -- Sanitize dropoff coordinates if present
  CASE WHEN dropoff_lat IS NOT NULL THEN ROUND(dropoff_lat::numeric, 3) ELSE NULL END AS dropoff_lat_approx,
  CASE WHEN dropoff_lng IS NOT NULL THEN ROUND(dropoff_lng::numeric, 3) ELSE NULL END AS dropoff_lng_approx,
  dropoff_address,
  notes,
  status,
  created_at,
  expires_at
FROM ride_intents
WHERE status = 'pending'
  AND expires_at > NOW();

-- Grant select on view
GRANT SELECT ON ride_intents_realtime TO authenticated;

-- ============================================================================
-- 10. SCHEDULED CLEANUP (via pg_cron if available)
-- ============================================================================

-- Note: pg_cron requires superuser access
-- To enable, run as superuser:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- 
-- Then schedule cleanup jobs:
-- SELECT cron.schedule('expire-stale-presence', '*/5 * * * *', 'SELECT expire_stale_presence();');
-- SELECT cron.schedule('expire-stale-ride-intents', '*/5 * * * *', 'SELECT expire_stale_ride_intents();');
-- SELECT cron.schedule('cleanup-rate-limits', '0 * * * *', 'SELECT cleanup_rate_limits();');

-- Alternative: Use Supabase Edge Functions with cron triggers
-- See: https://supabase.com/docs/guides/functions/scheduled-functions

COMMIT;

