-- Migration 004: Scheduled Trips Table
-- Created: 2025-12-14
-- Purpose: Enable trip scheduling feature in Discovery page

CREATE TABLE IF NOT EXISTS scheduled_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('passenger', 'driver')),
  date DATE NOT NULL,
  time TIME NOT NULL,
  recurrence TEXT CHECK (recurrence IN ('none', 'daily', 'weekdays', 'weekly')),
  
  -- Origin details
  origin_text TEXT NOT NULL,
  origin_lat NUMERIC,
  origin_lng NUMERIC,
  
  -- Destination details
  destination_text TEXT NOT NULL,
  destination_lat NUMERIC,
  destination_lng NUMERIC,
  
  -- Trip details
  vehicle_type TEXT CHECK (vehicle_type IN ('moto', 'cab', 'liffan', 'truck', 'other')),
  notes TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  matched_driver_id UUID REFERENCES auth.users(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_scheduled_trips_user ON scheduled_trips(user_id);
CREATE INDEX idx_scheduled_trips_date ON scheduled_trips(date, time) WHERE status = 'scheduled';
CREATE INDEX idx_scheduled_trips_status ON scheduled_trips(status);
CREATE INDEX idx_scheduled_trips_recurrence ON scheduled_trips(recurrence) WHERE recurrence != 'none';

-- Enable Row Level Security
ALTER TABLE scheduled_trips ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own trips
CREATE POLICY "Users can view own trips"
  ON scheduled_trips FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can manage own trips
CREATE POLICY "Users can insert own trips"
  ON scheduled_trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips"
  ON scheduled_trips FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips"
  ON scheduled_trips FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_scheduled_trips_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER scheduled_trips_updated_at
  BEFORE UPDATE ON scheduled_trips
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_trips_timestamp();

-- Function: Get upcoming trips for a user
CREATE OR REPLACE FUNCTION get_upcoming_trips(
  p_user_id UUID,
  p_days_ahead INTEGER DEFAULT 7
)
RETURNS TABLE (
  trip_id UUID,
  trip_date DATE,
  trip_time TIME,
  origin TEXT,
  destination TEXT,
  vehicle_type TEXT,
  recurrence TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    st.id,
    st.date,
    st.time,
    st.origin_text,
    st.destination_text,
    st.vehicle_type,
    st.recurrence,
    st.status
  FROM scheduled_trips st
  WHERE st.user_id = p_user_id
    AND st.status = 'scheduled'
    AND st.date BETWEEN CURRENT_DATE AND CURRENT_DATE + p_days_ahead
  ORDER BY st.date, st.time;
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON scheduled_trips TO authenticated;

-- Comments for documentation
COMMENT ON TABLE scheduled_trips IS 'User scheduled trips with recurrence support';
COMMENT ON FUNCTION get_upcoming_trips IS 'Get upcoming scheduled trips for a user';
