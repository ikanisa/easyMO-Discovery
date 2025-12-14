-- Request / telemetry logs (best-effort, server-write via Edge Function)

CREATE TABLE IF NOT EXISTS request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type TEXT NOT NULL DEFAULT 'event',
  phone TEXT,
  need TEXT,
  location TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_logs_user_created ON request_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_event_created ON request_logs(event_type, created_at DESC);

ALTER TABLE request_logs ENABLE ROW LEVEL SECURITY;

