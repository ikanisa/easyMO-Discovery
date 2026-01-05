-- Migration: Add conversations and messages tables for conversation tracking
-- Date: 2025-01-27
-- Depends on: 20250127_multi_role_support.sql

BEGIN;

-- 1. Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('mobility', 'marketplace', 'payments', 'support', 'router')),
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for faster user queries
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- 2. Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  tool_results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for faster conversation queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- 3. Create trip_intents table (if not exists)
CREATE TABLE IF NOT EXISTS trip_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('passenger', 'driver')),
  origin TEXT,
  destination TEXT,
  origin_location GEOGRAPHY(POINT),
  destination_location GEOGRAPHY(POINT),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'matched', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for spatial queries
CREATE INDEX IF NOT EXISTS idx_trip_intents_origin_location ON trip_intents USING GIST(origin_location);
CREATE INDEX IF NOT EXISTS idx_trip_intents_user_id ON trip_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_intents_status ON trip_intents(status);

-- 4. Create marketplace_listings table (if not exists)
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price NUMERIC,
  currency TEXT DEFAULT 'RWF',
  location GEOGRAPHY(POINT),
  phone_number TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'removed')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for spatial queries
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_location ON marketplace_listings USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_user_id ON marketplace_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category ON marketplace_listings(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);

-- 5. Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies for conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
CREATE POLICY "Users can insert own conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;
CREATE POLICY "Users can delete own conversations" ON conversations
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Create RLS Policies for messages
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE id = messages.conversation_id 
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own messages" ON messages;
CREATE POLICY "Users can insert own messages" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE id = messages.conversation_id 
      AND user_id = auth.uid()
    )
  );

-- 8. Create RLS Policies for trip_intents
DROP POLICY IF EXISTS "Users can view own trip_intents" ON trip_intents;
CREATE POLICY "Users can view own trip_intents" ON trip_intents
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own trip_intents" ON trip_intents;
CREATE POLICY "Users can insert own trip_intents" ON trip_intents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own trip_intents" ON trip_intents;
CREATE POLICY "Users can update own trip_intents" ON trip_intents
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own trip_intents" ON trip_intents;
CREATE POLICY "Users can delete own trip_intents" ON trip_intents
  FOR DELETE USING (auth.uid() = user_id);

-- 9. Create RLS Policies for marketplace_listings
DROP POLICY IF EXISTS "Users can view marketplace_listings" ON marketplace_listings;
CREATE POLICY "Users can view marketplace_listings" ON marketplace_listings
  FOR SELECT USING (status = 'active'); -- Public read for active listings

DROP POLICY IF EXISTS "Users can insert own marketplace_listings" ON marketplace_listings;
CREATE POLICY "Users can insert own marketplace_listings" ON marketplace_listings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own marketplace_listings" ON marketplace_listings;
CREATE POLICY "Users can update own marketplace_listings" ON marketplace_listings
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own marketplace_listings" ON marketplace_listings;
CREATE POLICY "Users can delete own marketplace_listings" ON marketplace_listings
  FOR DELETE USING (auth.uid() = user_id);

-- 10. Enable Realtime for presence and trip_intents (if not already enabled)
-- Note: This requires the tables to exist and be in the publication
-- Run this manually if needed: ALTER PUBLICATION supabase_realtime ADD TABLE presence;
-- Run this manually if needed: ALTER PUBLICATION supabase_realtime ADD TABLE trip_intents;

-- 11. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Create triggers for updated_at
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trip_intents_updated_at ON trip_intents;
CREATE TRIGGER update_trip_intents_updated_at
  BEFORE UPDATE ON trip_intents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_marketplace_listings_updated_at ON marketplace_listings;
CREATE TRIGGER update_marketplace_listings_updated_at
  BEFORE UPDATE ON marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

