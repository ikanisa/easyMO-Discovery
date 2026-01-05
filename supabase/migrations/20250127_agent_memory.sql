-- Agent Memory Table
-- Stores user preferences and patterns for each agent type

CREATE TABLE IF NOT EXISTS agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('router', 'mobility', 'marketplace', 'payments', 'support')),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  confidence NUMERIC DEFAULT 1.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, agent_type, key)
);

CREATE INDEX idx_agent_memory_user_agent ON agent_memory(user_id, agent_type);
CREATE INDEX idx_agent_memory_key ON agent_memory(key);
CREATE INDEX idx_agent_memory_updated_at ON agent_memory(updated_at DESC);

-- RLS Policies
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own memory
CREATE POLICY "Users can manage own memory"
  ON agent_memory
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all memory
CREATE POLICY "Service role can manage all memory"
  ON agent_memory
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_agent_memory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_memory_updated_at_trigger
  BEFORE UPDATE ON agent_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_memory_updated_at();

COMMENT ON TABLE agent_memory IS 'Stores user preferences and patterns for each agent type';
COMMENT ON COLUMN agent_memory.key IS 'Memory key (e.g., "preferred_vehicle_type", "favorite_categories")';
COMMENT ON COLUMN agent_memory.value IS 'Memory value as JSON (e.g., {"type": "moto", "reason": "faster"})';
COMMENT ON COLUMN agent_memory.confidence IS 'Confidence score (0.0 to 1.0) for this memory';

