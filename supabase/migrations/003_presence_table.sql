-- Migration 003: Presence Table for Real-time Driver/Passenger Discovery
-- Created: 2025-12-14
-- Purpose: Enable mobility features (Discovery page)

-- Enable PostGIS extension for location queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Presence tracking for drivers, passengers, vendors
CREATE TABLE IF NOT EXISTS presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('passenger', 'driver', 'vendor')),
  vehicle_type TEXT CHECK (vehicle_type IN ('moto', 'cab', 'liffan', 'truck', 'other', 'shop')),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  is_online BOOLEAN DEFAULT true,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  display_name TEXT,
  phone_number TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index for location queries (critical for performance)
CREATE INDEX idx_presence_location ON presence USING GIST(location);
CREATE INDEX idx_presence_online ON presence(is_online) WHERE is_online = true;
CREATE INDEX idx_presence_role_vehicle ON presence(role, vehicle_type) WHERE is_online = true;
CREATE INDEX idx_presence_last_seen ON presence(last_seen DESC);

-- Enable Row Level Security
ALTER TABLE presence ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all online presence
CREATE POLICY "Anyone can view online presence"
  ON presence FOR SELECT
  USING (is_online = true);

-- Policy: Users can update their own presence
CREATE POLICY "Users can update own presence"
  ON presence FOR ALL
  USING (auth.uid() = user_id);

-- PostGIS Function: Get nearby drivers/passengers
CREATE OR REPLACE FUNCTION get_nearby_drivers(
  search_lat DOUBLE PRECISION,
  search_lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 5000,
  role_filter TEXT DEFAULT 'driver'
)
RETURNS TABLE (
  user_id UUID,
  role TEXT,
  vehicle_type TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  last_seen TIMESTAMPTZ,
  dist_meters DOUBLE PRECISION,
  display_name TEXT,
  phone_number TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.role,
    p.vehicle_type,
    ST_Y(p.location::geometry) as location_lat,
    ST_X(p.location::geometry) as location_lng,
    p.last_seen,
    ST_Distance(
      p.location,
      ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography
    ) as dist_meters,
    p.display_name,
    p.phone_number
  FROM presence p
  WHERE p.is_online = true
    AND p.role = role_filter
    AND p.last_seen > NOW() - INTERVAL '10 minutes'
    AND ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
      radius_meters
    )
  ORDER BY dist_meters ASC
  LIMIT 50;
END;
$$;

-- Cleanup function: Remove stale presence (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void 
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE presence 
  SET is_online = false 
  WHERE last_seen < NOW() - INTERVAL '1 hour' 
    AND is_online = true;
END;
$$;

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_presence_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER presence_updated_at
  BEFORE UPDATE ON presence
  FOR EACH ROW
  EXECUTE FUNCTION update_presence_timestamp();

-- Grant permissions to authenticated users
GRANT SELECT ON presence TO authenticated;
GRANT INSERT, UPDATE ON presence TO authenticated;

-- Comment for documentation
COMMENT ON TABLE presence IS 'Real-time location tracking for drivers, passengers, and vendors';
COMMENT ON FUNCTION get_nearby_drivers IS 'Find nearby drivers/passengers within radius using PostGIS';
COMMENT ON FUNCTION cleanup_stale_presence IS 'Mark users offline if no activity in 1 hour';
