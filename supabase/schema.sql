-- =============================================================================
-- easyMO Discovery Database Schema
-- =============================================================================
-- This schema defines the core tables and functions for the easyMO Discovery
-- platform - a discovery and connection service for Rwanda.
-- 
-- Prerequisites:
-- - PostGIS extension enabled (for geographic queries)
-- - Supabase auth.users table (provided by Supabase)
-- =============================================================================

-- Enable PostGIS extension for geographic data types and functions
CREATE EXTENSION IF NOT EXISTS postgis;

-- =============================================================================
-- PROFILES TABLE
-- =============================================================================
-- Stores user profile information linked to Supabase auth.users
-- Users can be passengers, drivers, or vendors

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'passenger' CHECK (role IN ('passenger', 'driver', 'vendor')),
    bio TEXT,
    vehicle_plate TEXT,
    whatsapp_consent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for phone lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles table
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- PRESENCE TABLE
-- =============================================================================
-- Tracks real-time location and online status of drivers/vendors
-- Used for the discovery feature to find nearby service providers

CREATE TABLE IF NOT EXISTS presence (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('driver', 'vendor')),
    vehicle_type TEXT CHECK (vehicle_type IN ('moto', 'cab', 'liffan', 'truck', 'shop')),
    location GEOGRAPHY(POINT, 4326),
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial index for efficient proximity queries
CREATE INDEX IF NOT EXISTS idx_presence_location ON presence USING GIST(location);

-- Create index for online status filtering
CREATE INDEX IF NOT EXISTS idx_presence_online ON presence(is_online) WHERE is_online = TRUE;

-- Enable Row Level Security
ALTER TABLE presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for presence table
CREATE POLICY "Users can view online presence"
    ON presence FOR SELECT
    USING (is_online = TRUE OR auth.uid() = user_id);

CREATE POLICY "Users can update their own presence"
    ON presence FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own presence"
    ON presence FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- GET NEARBY DRIVERS FUNCTION
-- =============================================================================
-- PostGIS function to find drivers within a specified radius
-- Returns drivers sorted by distance from the given coordinates

CREATE OR REPLACE FUNCTION get_nearby_drivers(
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    radius_meters INTEGER DEFAULT 5000,
    vehicle_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    user_id UUID,
    vehicle_type TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    dist_meters DOUBLE PRECISION,
    last_seen TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.user_id,
        p.vehicle_type,
        ST_Y(p.location::geometry) AS lat,
        ST_X(p.location::geometry) AS lng,
        ST_Distance(
            p.location,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
        ) AS dist_meters,
        p.last_seen
    FROM presence p
    WHERE 
        p.is_online = TRUE
        AND p.role = 'driver'
        AND (vehicle_filter IS NULL OR p.vehicle_type = vehicle_filter)
        AND ST_DWithin(
            p.location,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
            radius_meters
        )
    ORDER BY dist_meters ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- REQUEST LOG TABLE (Optional - for analytics)
-- =============================================================================
-- Tracks user requests for analytics and debugging

CREATE TABLE IF NOT EXISTS request_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for time-based queries
CREATE INDEX IF NOT EXISTS idx_request_logs_created ON request_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE request_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy - Users can only view their own logs
CREATE POLICY "Users can view their own logs"
    ON request_logs FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy - Allow authenticated users to insert logs
CREATE POLICY "Authenticated users can insert logs"
    ON request_logs FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- NOTES
-- =============================================================================
-- 
-- Edge Functions (deployed separately to Supabase):
-- - chat-gemini: Proxy for Gemini AI calls
-- - whatsapp-broadcast: Send WhatsApp broadcasts via Twilio
-- - whatsapp-status: Check WhatsApp message status
-- - log-request: Log user requests for analytics
--
-- WhatsApp Bridge (services/whatsapp-bridge):
-- - Deployed as a separate Node.js service
-- - Handles Twilio webhook callbacks
-- - Requires TWILIO_* environment variables
-- =============================================================================
