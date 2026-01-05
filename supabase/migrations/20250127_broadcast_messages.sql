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

