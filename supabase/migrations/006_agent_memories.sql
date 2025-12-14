-- Migration 006: Agent Memories Table
-- Created: 2025-12-14
-- Purpose: Cloud sync for AI agent memory system (cross-device memory)

-- Enable vector extension for future semantic search
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Memory content
  content TEXT NOT NULL,
  category TEXT CHECK (category IN ('preference', 'fact', 'context', 'legal_context')),
  confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Vector embedding for semantic search (future enhancement)
  embedding VECTOR(768),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate memories
  UNIQUE(user_id, content)
);

-- Indexes
CREATE INDEX idx_agent_memories_user ON agent_memories(user_id);
CREATE INDEX idx_agent_memories_category ON agent_memories(category);
CREATE INDEX idx_agent_memories_created ON agent_memories(created_at DESC);

-- Vector index for semantic search (optional, can be enabled later)
-- CREATE INDEX idx_agent_memories_embedding ON agent_memories 
--   USING ivfflat(embedding vector_cosine_ops) 
--   WITH (lists = 100);

-- Enable Row Level Security
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own memories
CREATE POLICY "Users can view own memories"
  ON agent_memories FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can manage own memories
CREATE POLICY "Users can insert own memories"
  ON agent_memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories"
  ON agent_memories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories"
  ON agent_memories FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_agent_memories_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER agent_memories_updated_at
  BEFORE UPDATE ON agent_memories
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_memories_timestamp();

-- Function: Get user memories by category
CREATE OR REPLACE FUNCTION get_user_memories(
  p_user_id UUID,
  p_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  memory_id UUID,
  content TEXT,
  category TEXT,
  confidence NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    am.id,
    am.content,
    am.category,
    am.confidence,
    am.created_at
  FROM agent_memories am
  WHERE am.user_id = p_user_id
    AND (p_category IS NULL OR am.category = p_category)
  ORDER BY am.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Function: Cleanup old low-confidence memories
CREATE OR REPLACE FUNCTION cleanup_old_memories()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete memories older than 90 days with low confidence
  DELETE FROM agent_memories
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND confidence < 0.5;
  
  -- Keep only latest 100 memories per user
  DELETE FROM agent_memories
  WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
      FROM agent_memories
    ) t
    WHERE t.rn > 100
  );
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON agent_memories TO authenticated;

-- Comments for documentation
COMMENT ON TABLE agent_memories IS 'AI agent memory storage for cross-device sync';
COMMENT ON COLUMN agent_memories.embedding IS 'Vector embedding for semantic similarity search (future)';
COMMENT ON FUNCTION get_user_memories IS 'Retrieve user memories optionally filtered by category';
COMMENT ON FUNCTION cleanup_old_memories IS 'Remove old low-confidence memories and keep only recent 100 per user';
