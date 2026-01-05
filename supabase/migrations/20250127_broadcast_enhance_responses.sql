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

