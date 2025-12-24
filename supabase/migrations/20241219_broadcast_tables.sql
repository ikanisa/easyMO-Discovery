-- Migration: Create broadcast tables for WhatsApp integration
-- Date: 2024-12-19
-- Description: Creates tables needed for broadcast request tracking and business responses

BEGIN;

-- Broadcast request tracking
CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT UNIQUE NOT NULL,
  need_description TEXT,
  location_label TEXT,
  target_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for request_id lookups
CREATE INDEX IF NOT EXISTS idx_broadcasts_request_id ON broadcasts(request_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON broadcasts(status);

-- Business responses to broadcast inquiries
CREATE TABLE IF NOT EXISTS broadcast_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL REFERENCES broadcasts(request_id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_phone TEXT NOT NULL,
  item_found TEXT,
  response_type TEXT DEFAULT 'available' CHECK (response_type IN ('available', 'unavailable', 'pending')),
  responded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient polling
CREATE INDEX IF NOT EXISTS idx_broadcast_responses_request_id ON broadcast_responses(request_id);

-- Enable Row Level Security
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_responses ENABLE ROW LEVEL SECURITY;

-- Service role only policies (these tables are accessed via Edge Functions)
CREATE POLICY "service_role_broadcasts_all" ON broadcasts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_broadcast_responses_all" ON broadcast_responses
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Read-only access for authenticated users (optional - for status checking)
CREATE POLICY "authenticated_broadcasts_select" ON broadcasts
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated_broadcast_responses_select" ON broadcast_responses
  FOR SELECT TO authenticated
  USING (true);

-- Revoke direct access from anon role
REVOKE ALL ON broadcasts FROM anon;
REVOKE ALL ON broadcast_responses FROM anon;

COMMIT;
