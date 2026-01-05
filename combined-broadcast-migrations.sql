-- Combined Broadcast Migrations
-- Generated: 2026-01-05T09:34:40.929Z
-- Apply this script in Supabase Dashboard → SQL Editor
-- Project: rghmxgutlbvzrfztxvaq

BEGIN;

-- ========================================
-- Migration: 20250127_broadcast_businesses.sql
-- ========================================

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



-- ========================================
-- Migration: 20250127_broadcast_enhance_broadcasts.sql
-- ========================================

-- Migration: Enhance broadcasts table for WhatsApp broadcast
-- Date: 2025-01-27
-- Description: Add user ownership, campaign tracking, and broadcast parameters

BEGIN;

-- Add user_id (required for RLS and user ownership)
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add thread_id (optional, for linking to ChatKit conversation)
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES conversations(id) ON DELETE SET NULL;

-- Add campaign_id (primary identifier, keep request_id for backward compat)
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS campaign_id TEXT UNIQUE;
-- Generate campaign_id from id if missing
UPDATE broadcasts SET campaign_id = id::TEXT WHERE campaign_id IS NULL;

-- Add radius_km and max_targets (for target selection)
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS radius_km NUMERIC;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS max_targets INTEGER;

-- Add category filter (optional)
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS category TEXT;

-- Add channel (for future multi-channel support)
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'whatsapp';
-- Update constraint if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name LIKE '%broadcasts_channel%'
  ) THEN
    ALTER TABLE broadcasts DROP CONSTRAINT IF EXISTS broadcasts_channel_check;
  END IF;
  ALTER TABLE broadcasts ADD CONSTRAINT broadcasts_channel_check 
    CHECK (channel IN ('whatsapp', 'sms', 'email'));
END $$;

-- Update status enum (add 'preview', 'cancelled')
ALTER TABLE broadcasts DROP CONSTRAINT IF EXISTS broadcasts_status_check;
ALTER TABLE broadcasts ADD CONSTRAINT broadcasts_status_check 
  CHECK (status IN ('preview', 'queued', 'sending', 'completed', 'failed', 'cancelled'));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_broadcasts_user_id ON broadcasts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_broadcasts_campaign_id ON broadcasts(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_broadcasts_thread_id ON broadcasts(thread_id) WHERE thread_id IS NOT NULL;

-- Update RLS policies
-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view own broadcasts" ON broadcasts;
DROP POLICY IF EXISTS "Users can create own broadcasts" ON broadcasts;
DROP POLICY IF EXISTS "Users can update own broadcasts" ON broadcasts;

-- Users can view their own broadcasts
CREATE POLICY "Users can view own broadcasts" ON broadcasts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own broadcasts
CREATE POLICY "Users can create own broadcasts" ON broadcasts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own broadcasts
CREATE POLICY "Users can update own broadcasts" ON broadcasts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Keep service_role policy (already exists)
-- Keep authenticated select policy (already exists)

COMMIT;



-- ========================================
-- Migration: 20250127_broadcast_targets.sql
-- ========================================

-- Migration: Create broadcast_targets table
-- Date: 2025-01-27
-- Description: Track selected businesses per broadcast campaign

BEGIN;

-- Create broadcast_targets table
CREATE TABLE IF NOT EXISTS broadcast_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'replied', 'failed')),
  wa_message_id TEXT, -- Meta WhatsApp message ID
  last_event_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(campaign_id, business_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_broadcast_targets_campaign_id ON broadcast_targets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_targets_business_id ON broadcast_targets(business_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_targets_status ON broadcast_targets(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_targets_wa_message_id ON broadcast_targets(wa_message_id) WHERE wa_message_id IS NOT NULL;

-- Enable RLS
ALTER TABLE broadcast_targets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view targets for their own campaigns
CREATE POLICY "Users can view own broadcast targets" ON broadcast_targets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM broadcasts 
      WHERE id = broadcast_targets.campaign_id 
      AND user_id = auth.uid()
    )
  );

-- Service role can manage all (for Edge Functions)
CREATE POLICY "service_role_broadcast_targets_all" ON broadcast_targets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_broadcast_targets_updated_at
  BEFORE UPDATE ON broadcast_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;



-- ========================================
-- Migration: 20250127_broadcast_messages.sql
-- ========================================

-- Migration: Create broadcast_messages table
-- Date: 2025-01-27
-- Description: Log all WhatsApp messages (outbound and inbound) for audit/debugging

BEGIN;

-- Create broadcast_messages table
CREATE TABLE IF NOT EXISTS broadcast_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  target_id UUID REFERENCES broadcast_targets(id) ON DELETE SET NULL,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  wa_message_id TEXT NOT NULL, -- Meta WhatsApp message ID
  text TEXT, -- Message content
  raw_payload JSONB NOT NULL, -- Full Meta API request/response
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_campaign_id ON broadcast_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_target_id ON broadcast_messages(target_id) WHERE target_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_business_id ON broadcast_messages(business_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_wa_message_id ON broadcast_messages(wa_message_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_direction ON broadcast_messages(direction);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_created_at ON broadcast_messages(created_at DESC);

-- Enable RLS
ALTER TABLE broadcast_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view messages for their own campaigns
CREATE POLICY "Users can view own broadcast messages" ON broadcast_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM broadcasts 
      WHERE id = broadcast_messages.campaign_id 
      AND user_id = auth.uid()
    )
  );

-- Service role can manage all (for Edge Functions)
CREATE POLICY "service_role_broadcast_messages_all" ON broadcast_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;



-- ========================================
-- Migration: 20250127_broadcast_enhance_responses.sql
-- ========================================

-- Migration: Enhance broadcast_responses table
-- Date: 2025-01-27
-- Description: Add full message tracking (campaign_id, target_id, wa_message_id, text, raw_payload)

BEGIN;

-- Add campaign_id (FK to broadcasts.id)
ALTER TABLE broadcast_responses ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES broadcasts(id) ON DELETE CASCADE;

-- Populate campaign_id from request_id if possible
UPDATE broadcast_responses br
SET campaign_id = b.id
FROM broadcasts b
WHERE br.request_id = b.request_id AND br.campaign_id IS NULL;

-- Add target_id (FK to broadcast_targets, optional)
ALTER TABLE broadcast_responses ADD COLUMN IF NOT EXISTS target_id UUID REFERENCES broadcast_targets(id) ON DELETE SET NULL;

-- Add business_id (FK to businesses, optional for now)
ALTER TABLE broadcast_responses ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;

-- Add wa_message_id (Meta WhatsApp message ID)
ALTER TABLE broadcast_responses ADD COLUMN IF NOT EXISTS wa_message_id TEXT;
CREATE INDEX IF NOT EXISTS idx_broadcast_responses_wa_message_id ON broadcast_responses(wa_message_id) WHERE wa_message_id IS NOT NULL;

-- Add text (full message text, not just item_found)
ALTER TABLE broadcast_responses ADD COLUMN IF NOT EXISTS text TEXT;

-- Add raw_payload (full webhook payload)
ALTER TABLE broadcast_responses ADD COLUMN IF NOT EXISTS raw_payload JSONB;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_broadcast_responses_campaign_id ON broadcast_responses(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_broadcast_responses_target_id ON broadcast_responses(target_id) WHERE target_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_broadcast_responses_business_id ON broadcast_responses(business_id) WHERE business_id IS NOT NULL;

-- Update RLS: Add user ownership policy
DROP POLICY IF EXISTS "Users can view own broadcast responses" ON broadcast_responses;
CREATE POLICY "Users can view own broadcast responses" ON broadcast_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM broadcasts 
      WHERE (
        (id = broadcast_responses.campaign_id) OR 
        (request_id = broadcast_responses.request_id)
      )
      AND user_id = auth.uid()
    )
  );

-- Keep existing policies (service_role, authenticated select)

COMMIT;



COMMIT;

-- Migration complete!
-- Verify tables:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('businesses', 'broadcasts', 'broadcast_targets', 'broadcast_messages', 'broadcast_responses');
