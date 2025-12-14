-- Vendors Table for Broadcast System
-- Created: 2025-12-14

-- Main vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  phone_number TEXT UNIQUE NOT NULL,
  categories TEXT[] NOT NULL,
  location_text TEXT,
  location_lat NUMERIC,
  location_lng NUMERIC,
  is_active BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false,
  rating NUMERIC DEFAULT 0,
  total_broadcasts_received INTEGER DEFAULT 0,
  total_responses INTEGER DEFAULT 0,
  successful_quotes INTEGER DEFAULT 0,
  last_broadcast_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Update leads table for broadcast tracking
ALTER TABLE leads ADD COLUMN IF NOT EXISTS vendor_count INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS broadcast_sent_at TIMESTAMPTZ;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendors_categories ON vendors USING GIN (categories);
CREATE INDEX IF NOT EXISTS idx_vendors_location ON vendors (location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_vendors_phone ON vendors (phone_number);

-- Enable RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Service role bypass
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendors' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON vendors FOR ALL USING (true);
  END IF;
END $$;

-- Sample vendor categories (for reference)
COMMENT ON COLUMN vendors.categories IS 
'Categories: electronics, laptops, phones, furniture, food, restaurants, construction, 
plumbing, electrical, transport, logistics, fashion, beauty, health, education, etc.';

-- Insert sample vendors for testing
INSERT INTO vendors (business_name, phone_number, categories, location_text, location_lat, location_lng, verified) VALUES
  ('Tech Hub Rwanda', 'whatsapp:+250788111111', ARRAY['electronics', 'laptops', 'phones'], 'Kigali, Kicukiro', -1.9705, 30.1044, true),
  ('Quick Electronics', 'whatsapp:+250788222222', ARRAY['electronics', 'laptops', 'accessories'], 'Kigali, Remera', -1.9536, 30.0919, true),
  ('Digital Store', 'whatsapp:+250788333333', ARRAY['electronics', 'phones', 'tablets'], 'Kigali, Kimironko', -1.9425, 30.1261, true),
  ('City Furniture', 'whatsapp:+250788444444', ARRAY['furniture', 'home'], 'Kigali, Nyarugenge', -1.9536, 30.0605, true),
  ('Fresh Foods Market', 'whatsapp:+250788555555', ARRAY['food', 'groceries'], 'Kigali, Kicukiro', -1.9705, 30.1044, true)
ON CONFLICT (phone_number) DO NOTHING;
