-- Agent Handoffs Table
-- Tracks when conversations are transferred between agents

CREATE TABLE IF NOT EXISTS agent_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  from_agent TEXT NOT NULL CHECK (from_agent IN ('router', 'mobility', 'marketplace', 'payments', 'support')),
  to_agent TEXT NOT NULL CHECK (to_agent IN ('router', 'mobility', 'marketplace', 'payments', 'support')),
  reason TEXT,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_handoffs_conversation_id ON agent_handoffs(conversation_id);
CREATE INDEX idx_agent_handoffs_created_at ON agent_handoffs(created_at DESC);

-- RLS Policies
ALTER TABLE agent_handoffs ENABLE ROW LEVEL SECURITY;

-- Users can view handoffs for their own conversations
CREATE POLICY "Users can view own handoffs"
  ON agent_handoffs
  FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

-- Service role can manage all handoffs
CREATE POLICY "Service role can manage all handoffs"
  ON agent_handoffs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE agent_handoffs IS 'Tracks agent-to-agent handoffs in conversations';
COMMENT ON COLUMN agent_handoffs.context IS 'JSON context passed to the new agent';
COMMENT ON COLUMN agent_handoffs.reason IS 'Reason for the handoff (e.g., "User needs a ride")';

