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

