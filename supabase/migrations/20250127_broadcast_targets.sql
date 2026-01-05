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

