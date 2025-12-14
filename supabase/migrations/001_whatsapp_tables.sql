-- WhatsApp Bridge Database Schema
-- Created: 2025-12-14

-- WhatsApp webhook events (raw audit log)
CREATE TABLE IF NOT EXISTS whatsapp_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  message_sid TEXT,
  payload JSONB NOT NULL,
  signature_valid BOOLEAN DEFAULT true,
  received_at TIMESTAMPTZ DEFAULT now(),
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp messages (normalized inbound/outbound)
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_sid TEXT UNIQUE NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  body TEXT,
  button_text TEXT,
  button_payload TEXT,
  status TEXT,
  error_code TEXT,
  error_message TEXT,
  metadata JSONB,
  received_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp conversation threads
CREATE TABLE IF NOT EXISTS whatsapp_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT UNIQUE NOT NULL,
  first_message_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  thread_type TEXT,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Leads (buyer intent tracking)
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  thread_id UUID REFERENCES whatsapp_threads(id),
  item_requested TEXT,
  location_text TEXT,
  location_lat NUMERIC,
  location_lng NUMERIC,
  budget TEXT,
  quantity TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'broadcasted', 'quoted', 'closed', 'abandoned')),
  broadcast_count INTEGER DEFAULT 0,
  quote_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Lead state events (funnel tracking)
CREATE TABLE IF NOT EXISTS lead_state_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id),
  from_state TEXT,
  to_state TEXT NOT NULL,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vendor responses
CREATE TABLE IF NOT EXISTS vendor_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  vendor_phone TEXT NOT NULL,
  response_type TEXT CHECK (response_type IN ('have_it', 'no_stock', 'stop')),
  message_sid TEXT,
  button_text TEXT,
  button_payload TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_events_received ON whatsapp_webhook_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_sid ON whatsapp_webhook_events(message_sid);
CREATE INDEX IF NOT EXISTS idx_messages_from ON whatsapp_messages(from_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sid ON whatsapp_messages(message_sid);
CREATE INDEX IF NOT EXISTS idx_threads_phone ON whatsapp_threads(phone_number);
CREATE INDEX IF NOT EXISTS idx_threads_updated ON whatsapp_threads(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone_number);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_responses_lead ON vendor_responses(lead_id, created_at DESC);

-- RLS
ALTER TABLE whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_state_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_responses ENABLE ROW LEVEL SECURITY;

-- Policies (service role bypass)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_webhook_events' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON whatsapp_webhook_events FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_messages' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON whatsapp_messages FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_threads' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON whatsapp_threads FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON leads FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lead_state_events' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON lead_state_events FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendor_responses' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON vendor_responses FOR ALL USING (true);
  END IF;
END $$;
