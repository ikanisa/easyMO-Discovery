-- Migration: Create businesses table for WhatsApp broadcast
-- Date: 2025-01-27
-- Description: Business directory for broadcast target selection

BEGIN;

-- Create businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Optional: link to vendor user
  name TEXT NOT NULL,
  category TEXT, -- e.g. 'pharmacy', 'restaurant', 'hardware'
  location GEOGRAPHY(POINT, 4326),
  address TEXT,
  phone TEXT NOT NULL, -- WhatsApp phone number
  whatsapp_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_businesses_location ON businesses USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_businesses_phone ON businesses(phone);
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_businesses_active ON businesses(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public read for active businesses (for discovery)
CREATE POLICY "Public can view active businesses" ON businesses
  FOR SELECT USING (is_active = true);

-- Vendors can manage their own businesses
CREATE POLICY "Vendors can manage own businesses" ON businesses
  FOR ALL USING (
    user_id IS NOT NULL AND auth.uid() = user_id
  ) WITH CHECK (
    user_id IS NOT NULL AND auth.uid() = user_id
  );

-- Service role full access (for Edge Functions)
CREATE POLICY "service_role_businesses_all" ON businesses
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

