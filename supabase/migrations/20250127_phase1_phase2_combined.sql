-- Combined Migration: Phase 1 & Phase 2
-- Date: 2025-01-27
-- Includes: Agent Handoffs (Phase 1) + Agent Memory (Phase 2)

-- ============================================================================
-- PHASE 1: Agent Handoffs
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_agent_handoffs_conversation_id ON agent_handoffs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_handoffs_created_at ON agent_handoffs(created_at DESC);

-- RLS Policies for agent_handoffs
ALTER TABLE agent_handoffs ENABLE ROW LEVEL SECURITY;

-- Users can view handoffs for their own conversations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'agent_handoffs' 
    AND policyname = 'Users can view own handoffs'
  ) THEN
    CREATE POLICY "Users can view own handoffs"
      ON agent_handoffs
      FOR SELECT
      TO authenticated
      USING (
        conversation_id IN (
          SELECT id FROM conversations WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Service role can manage all handoffs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'agent_handoffs' 
    AND policyname = 'Service role can manage all handoffs'
  ) THEN
    CREATE POLICY "Service role can manage all handoffs"
      ON agent_handoffs
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE agent_handoffs IS 'Tracks agent-to-agent handoffs in conversations';
COMMENT ON COLUMN agent_handoffs.context IS 'JSON context passed to the new agent';
COMMENT ON COLUMN agent_handoffs.reason IS 'Reason for the handoff (e.g., "User needs a ride")';

-- ============================================================================
-- PHASE 2: Agent Memory
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_agent_memory_user_agent ON agent_memory(user_id, agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_memory_key ON agent_memory(key);
CREATE INDEX IF NOT EXISTS idx_agent_memory_updated_at ON agent_memory(updated_at DESC);

-- RLS Policies for agent_memory
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;

-- Users can manage their own memory
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'agent_memory' 
    AND policyname = 'Users can manage own memory'
  ) THEN
    CREATE POLICY "Users can manage own memory"
      ON agent_memory
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Service role can manage all memory
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'agent_memory' 
    AND policyname = 'Service role can manage all memory'
  ) THEN
    CREATE POLICY "Service role can manage all memory"
      ON agent_memory
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Trigger to update updated_at for agent_memory
CREATE OR REPLACE FUNCTION update_agent_memory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_agent_memory_updated_at_trigger ON agent_memory;
CREATE TRIGGER update_agent_memory_updated_at_trigger
  BEFORE UPDATE ON agent_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_memory_updated_at();

COMMENT ON TABLE agent_memory IS 'Stores user preferences and patterns for each agent type';
COMMENT ON COLUMN agent_memory.key IS 'Memory key (e.g., "preferred_vehicle_type", "favorite_categories")';
COMMENT ON COLUMN agent_memory.value IS 'Memory value as JSON (e.g., {"type": "moto", "reason": "faster"})';
COMMENT ON COLUMN agent_memory.confidence IS 'Confidence score (0.0 to 1.0) for this memory';

