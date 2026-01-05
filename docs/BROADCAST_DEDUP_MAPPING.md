# Broadcast Deduplication Mapping

**Date:** 2025-01-27  
**Purpose:** Map WhatsApp broadcast entities to existing Supabase tables to avoid duplicates.

---

## A) Target Entities for WhatsApp Broadcast

We need the following entities for a complete WhatsApp broadcast system:

1. **Broadcast Campaign** - A user's request to broadcast to nearby businesses
2. **Broadcast Targets** - Selected businesses that will receive the broadcast
3. **Outbound WhatsApp Messages** - Log of messages sent to businesses via Meta WhatsApp API
4. **Inbound WhatsApp Responses** - Log of replies from businesses
5. **User-Facing Updates/Notifications** - In-app updates when responses arrive

---

## B) Mapping Table

| Target Entity | Existing Table | Required Changes | Migration Notes |
|--------------|----------------|------------------|-----------------|
| **Broadcast Campaign** | `broadcasts` | ✅ **EXISTS** but needs enhancements:<br>- Add `user_id` UUID (FK to auth.users)<br>- Add `thread_id` UUID (FK to conversations, optional)<br>- Add `radius_km` NUMERIC<br>- Add `max_targets` INTEGER<br>- Add `category` TEXT (optional filter)<br>- Change `request_id` to `campaign_id` TEXT (or keep both for backward compat)<br>- Add `channel` TEXT DEFAULT 'whatsapp'<br>- Update status enum: add 'preview', 'cancelled' | **ALTER TABLE** approach. Keep `request_id` for backward compatibility, add `campaign_id` as primary identifier. |
| **Broadcast Targets** | ❌ **NONE** | **CREATE NEW:** `broadcast_targets`<br>- `id` UUID PRIMARY KEY<br>- `campaign_id` UUID (FK to broadcasts.id, or TEXT FK to broadcasts.campaign_id)<br>- `business_id` UUID (FK to businesses table, see below)<br>- `status` TEXT CHECK ('pending', 'sent', 'delivered', 'read', 'replied', 'failed')<br>- `wa_message_id` TEXT (Meta WhatsApp message ID)<br>- `last_event_at` TIMESTAMPTZ<br>- `error` TEXT<br>- `created_at` TIMESTAMPTZ | **NEW TABLE** required. Cannot reuse existing because:<br>- `broadcast_responses` only stores responses, not target selection<br>- No table tracks which businesses were selected for a campaign |
| **Outbound WhatsApp Messages** | ❌ **NONE** | **CREATE NEW:** `broadcast_messages`<br>- `id` UUID PRIMARY KEY<br>- `campaign_id` UUID (FK to broadcasts)<br>- `target_id` UUID (FK to broadcast_targets)<br>- `business_id` UUID (FK to businesses)<br>- `direction` TEXT CHECK ('outbound', 'inbound')<br>- `wa_message_id` TEXT (Meta WhatsApp message ID)<br>- `text` TEXT (message content)<br>- `raw_payload` JSONB (full Meta API response/request)<br>- `created_at` TIMESTAMPTZ | **NEW TABLE** required. Legacy `whatsapp_messages` may exist but not in migrations. This table logs all WhatsApp API interactions for audit/debugging. |
| **Inbound WhatsApp Responses** | `broadcast_responses` | ✅ **EXISTS** but needs enhancements:<br>- Add `campaign_id` UUID (FK to broadcasts.id, or TEXT FK to broadcasts.campaign_id)<br>- Add `target_id` UUID (FK to broadcast_targets, optional)<br>- Add `wa_message_id` TEXT (Meta WhatsApp message ID)<br>- Add `text` TEXT (full message text, not just `item_found`)<br>- Add `raw_payload` JSONB (full webhook payload)<br>- Keep `business_name`, `business_phone`, `item_found`, `response_type`, `responded_at`<br>- Rename `request_id` to `campaign_id` (or keep both) | **ALTER TABLE** approach. Keep existing columns for backward compatibility, add new fields for full message tracking. |
| **User-Facing Updates** | `conversations` + `messages` | ✅ **EXISTS** - No changes needed<br>- Use `conversations` to track broadcast campaigns per user<br>- Use `messages` to store agent responses with widget updates<br>- Realtime updates via `broadcast_responses` subscription | **NO CHANGES** - Existing conversation/message system handles in-app updates. Realtime subscription on `broadcast_responses` triggers ChatKit widget updates. |

---

## C) Business Directory Entity

### Current State

**No dedicated business directory table exists.**

### Options

#### Option 1: Create New `businesses` Table (RECOMMENDED)

**Justification:** 
- `marketplace_listings` is for listings, not a directory
- `user_profiles` with `role = 'vendor'` lacks business-specific fields
- Need structured business data (name, category, location, WhatsApp phone, verified status)

**Schema:**
```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Optional: link to vendor user
  name TEXT NOT NULL,
  category TEXT, -- e.g. 'pharmacy', 'restaurant', 'hardware'
  location GEOGRAPHY(POINT, 4326),
  address TEXT,
  phone TEXT NOT NULL, -- WhatsApp phone number
  whatsapp_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_businesses_location ON businesses USING GIST(location);
CREATE INDEX idx_businesses_category ON businesses(category) WHERE category IS NOT NULL;
CREATE INDEX idx_businesses_phone ON businesses(phone);
CREATE INDEX idx_businesses_active ON businesses(is_active) WHERE is_active = true;
```

**RLS Policies:**
- Public read for active businesses (for discovery)
- Vendors can manage their own businesses (if `user_id` is set)
- Service role full access (for Edge Functions)

#### Option 2: Extend `marketplace_listings` (NOT RECOMMENDED)

**Why not:**
- `marketplace_listings` is for listings, not businesses
- A business can have multiple listings
- Need business-level data (phone, verified status) separate from listings

#### Option 3: Use `user_profiles` + `presence` (NOT RECOMMENDED)

**Why not:**
- `user_profiles` lacks business-specific fields (category, WhatsApp phone)
- `presence` is ephemeral (TTL-based), not a directory
- Need persistent business directory for discovery

---

## D) Detailed Mapping with SQL Examples

### D.1 Broadcast Campaign → `broadcasts` Table

**Current Schema:**
```sql
CREATE TABLE broadcasts (
  id UUID PRIMARY KEY,
  request_id TEXT UNIQUE NOT NULL,
  need_description TEXT,
  location_label TEXT,
  target_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Required ALTER Statements:**
```sql
-- Add user_id (required for RLS and user ownership)
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add thread_id (optional, for linking to ChatKit conversation)
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES conversations(id) ON DELETE SET NULL;

-- Add campaign_id (primary identifier, keep request_id for backward compat)
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS campaign_id TEXT UNIQUE;
-- Generate campaign_id from id if missing
UPDATE broadcasts SET campaign_id = id::TEXT WHERE campaign_id IS NULL;

-- Add radius_km and max_targets (for target selection)
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS radius_km NUMERIC;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS max_targets INTEGER;

-- Add category filter (optional)
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS category TEXT;

-- Add channel (for future multi-channel support)
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'sms', 'email'));

-- Update status enum
ALTER TABLE broadcasts DROP CONSTRAINT IF EXISTS broadcasts_status_check;
ALTER TABLE broadcasts ADD CONSTRAINT broadcasts_status_check 
  CHECK (status IN ('preview', 'queued', 'sending', 'completed', 'failed', 'cancelled'));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_broadcasts_user_id ON broadcasts(user_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_campaign_id ON broadcasts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_thread_id ON broadcasts(thread_id) WHERE thread_id IS NOT NULL;

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view own broadcasts" ON broadcasts;
CREATE POLICY "Users can view own broadcasts" ON broadcasts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own broadcasts" ON broadcasts;
CREATE POLICY "Users can create own broadcasts" ON broadcasts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### D.2 Broadcast Targets → NEW `broadcast_targets` Table

**Schema:**
```sql
CREATE TABLE broadcast_targets (
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

CREATE INDEX idx_broadcast_targets_campaign_id ON broadcast_targets(campaign_id);
CREATE INDEX idx_broadcast_targets_business_id ON broadcast_targets(business_id);
CREATE INDEX idx_broadcast_targets_status ON broadcast_targets(status);
CREATE INDEX idx_broadcast_targets_wa_message_id ON broadcast_targets(wa_message_id) WHERE wa_message_id IS NOT NULL;

ALTER TABLE broadcast_targets ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view targets for their own campaigns
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
```

### D.3 Outbound WhatsApp Messages → NEW `broadcast_messages` Table

**Schema:**
```sql
CREATE TABLE broadcast_messages (
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

CREATE INDEX idx_broadcast_messages_campaign_id ON broadcast_messages(campaign_id);
CREATE INDEX idx_broadcast_messages_target_id ON broadcast_messages(target_id) WHERE target_id IS NOT NULL;
CREATE INDEX idx_broadcast_messages_business_id ON broadcast_messages(business_id);
CREATE INDEX idx_broadcast_messages_wa_message_id ON broadcast_messages(wa_message_id);
CREATE INDEX idx_broadcast_messages_direction ON broadcast_messages(direction);
CREATE INDEX idx_broadcast_messages_created_at ON broadcast_messages(created_at DESC);

ALTER TABLE broadcast_messages ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view messages for their own campaigns
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
```

### D.4 Inbound WhatsApp Responses → `broadcast_responses` Table

**Current Schema:**
```sql
CREATE TABLE broadcast_responses (
  id UUID PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES broadcasts(request_id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_phone TEXT NOT NULL,
  item_found TEXT,
  response_type TEXT DEFAULT 'available' CHECK (response_type IN ('available', 'unavailable', 'pending')),
  responded_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Required ALTER Statements:**
```sql
-- Add campaign_id (FK to broadcasts.id or broadcasts.campaign_id)
ALTER TABLE broadcast_responses ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES broadcasts(id) ON DELETE CASCADE;
-- Populate from request_id if possible
UPDATE broadcast_responses br
SET campaign_id = b.id
FROM broadcasts b
WHERE br.request_id = b.request_id AND br.campaign_id IS NULL;

-- Add target_id (FK to broadcast_targets, optional)
ALTER TABLE broadcast_responses ADD COLUMN IF NOT EXISTS target_id UUID REFERENCES broadcast_targets(id) ON DELETE SET NULL;

-- Add business_id (FK to businesses, optional for now)
ALTER TABLE broadcast_responses ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;

-- Add wa_message_id (Meta WhatsApp message ID)
ALTER TABLE broadcast_responses ADD COLUMN IF NOT EXISTS wa_message_id TEXT;
CREATE INDEX IF NOT EXISTS idx_broadcast_responses_wa_message_id ON broadcast_responses(wa_message_id) WHERE wa_message_id IS NOT NULL;

-- Add text (full message text, not just item_found)
ALTER TABLE broadcast_responses ADD COLUMN IF NOT EXISTS text TEXT;

-- Add raw_payload (full webhook payload)
ALTER TABLE broadcast_responses ADD COLUMN IF NOT EXISTS raw_payload JSONB;

-- Keep existing columns: business_name, business_phone, item_found, response_type, responded_at

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_broadcast_responses_campaign_id ON broadcast_responses(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_broadcast_responses_target_id ON broadcast_responses(target_id) WHERE target_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_broadcast_responses_business_id ON broadcast_responses(business_id) WHERE business_id IS NOT NULL;

-- Update RLS: Keep service_role and authenticated select, add user ownership
DROP POLICY IF EXISTS "Users can view own broadcast responses" ON broadcast_responses;
CREATE POLICY "Users can view own broadcast responses" ON broadcast_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM broadcasts 
      WHERE (id = broadcast_responses.campaign_id OR request_id = broadcast_responses.request_id)
      AND user_id = auth.uid()
    )
  );
```

### D.5 User-Facing Updates → `conversations` + `messages` (NO CHANGES)

**No changes needed.** Existing system handles:
- `conversations` tracks user's broadcast campaigns (via `thread_id` in `broadcasts`)
- `messages` stores agent responses with widget updates
- Realtime subscription on `broadcast_responses` triggers ChatKit widget updates via `chatKit.sendAction()`

---

## E) Summary: New Tables Required

| Table | Status | Reason |
|-------|--------|--------|
| `businesses` | **NEW** | No business directory exists |
| `broadcast_targets` | **NEW** | No table tracks selected targets per campaign |
| `broadcast_messages` | **NEW** | No table logs outbound/inbound WhatsApp messages |

---

## F) Summary: Tables to Modify

| Table | Changes | Breaking Changes? |
|-------|---------|-------------------|
| `broadcasts` | Add `user_id`, `thread_id`, `campaign_id`, `radius_km`, `max_targets`, `category`, `channel`, update status enum | ❌ No (additive only, keep `request_id` for backward compat) |
| `broadcast_responses` | Add `campaign_id`, `target_id`, `business_id`, `wa_message_id`, `text`, `raw_payload` | ❌ No (additive only, keep existing columns) |

---

## G) Migration Strategy

1. **Create `businesses` table first** (no dependencies)
2. **Modify `broadcasts` table** (add columns, keep backward compat)
3. **Create `broadcast_targets` table** (depends on `broadcasts` and `businesses`)
4. **Create `broadcast_messages` table** (depends on `broadcasts`, `broadcast_targets`, `businesses`)
5. **Modify `broadcast_responses` table** (add columns, populate `campaign_id` from `request_id`)

See `MIGRATION_PLAN_NO_DUPES.md` for detailed migration steps.

