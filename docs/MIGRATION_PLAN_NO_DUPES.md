# Migration Plan: WhatsApp Broadcast (No Duplicates)

**Date:** 2025-01-27  
**Purpose:** Ordered migration steps to implement WhatsApp broadcast without creating duplicate tables.

**Rule:** NO NEW TABLES unless proven missing (see `BROADCAST_DEDUP_MAPPING.md`).

---

## Migration Overview

This migration adds WhatsApp broadcast functionality by:
1. Creating `businesses` table (business directory - **NEW**, justified)
2. Enhancing `broadcasts` table (add user ownership, campaign tracking)
3. Creating `broadcast_targets` table (selected businesses per campaign - **NEW**, justified)
4. Creating `broadcast_messages` table (WhatsApp message logs - **NEW**, justified)
5. Enhancing `broadcast_responses` table (add full message tracking)

**Total New Tables:** 3 (`businesses`, `broadcast_targets`, `broadcast_messages`)  
**Total Modified Tables:** 2 (`broadcasts`, `broadcast_responses`)

---

## Migration Steps

### Step 1: Create `businesses` Table

**File:** `supabase/migrations/YYYYMMDD_broadcast_businesses.sql`

```sql
-- Migration: Create businesses table for WhatsApp broadcast
-- Date: 2025-01-27
-- Description: Business directory for broadcast target selection

BEGIN;

-- Create businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Optional: link to vendor user
  name TEXT NOT NULL,
  category TEXT, -- e.g. 'pharmacy', 'restaurant', 'hardware'
  location GEOGRAPHY(POINT, 4326),
  address TEXT,
  phone TEXT NOT NULL, -- WhatsApp phone number
  whatsapp_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_businesses_location ON businesses USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_businesses_phone ON businesses(phone);
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_businesses_active ON businesses(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public read for active businesses (for discovery)
CREATE POLICY "Public can view active businesses" ON businesses
  FOR SELECT USING (is_active = true);

-- Vendors can manage their own businesses
CREATE POLICY "Vendors can manage own businesses" ON businesses
  FOR ALL USING (
    user_id IS NOT NULL AND auth.uid() = user_id
  ) WITH CHECK (
    user_id IS NOT NULL AND auth.uid() = user_id
  );

-- Service role full access (for Edge Functions)
CREATE POLICY "service_role_businesses_all" ON businesses
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
```

**Risk Checklist:**
- ✅ No breaking changes (new table only)
- ✅ No data migration needed
- ⚠️ **Action Required:** Populate `businesses` table with initial data (via Edge Function or admin script)

---

### Step 2: Enhance `broadcasts` Table

**File:** `supabase/migrations/YYYYMMDD_broadcast_enhance_broadcasts.sql`

```sql
-- Migration: Enhance broadcasts table for WhatsApp broadcast
-- Date: 2025-01-27
-- Description: Add user ownership, campaign tracking, and broadcast parameters

BEGIN;

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
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'whatsapp';
-- Update constraint if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name LIKE '%broadcasts_channel%'
  ) THEN
    ALTER TABLE broadcasts DROP CONSTRAINT IF EXISTS broadcasts_channel_check;
  END IF;
  ALTER TABLE broadcasts ADD CONSTRAINT broadcasts_channel_check 
    CHECK (channel IN ('whatsapp', 'sms', 'email'));
END $$;

-- Update status enum (add 'preview', 'cancelled')
ALTER TABLE broadcasts DROP CONSTRAINT IF EXISTS broadcasts_status_check;
ALTER TABLE broadcasts ADD CONSTRAINT broadcasts_status_check 
  CHECK (status IN ('preview', 'queued', 'sending', 'completed', 'failed', 'cancelled'));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_broadcasts_user_id ON broadcasts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_broadcasts_campaign_id ON broadcasts(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_broadcasts_thread_id ON broadcasts(thread_id) WHERE thread_id IS NOT NULL;

-- Update RLS policies
-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view own broadcasts" ON broadcasts;
DROP POLICY IF EXISTS "Users can create own broadcasts" ON broadcasts;
DROP POLICY IF EXISTS "Users can update own broadcasts" ON broadcasts;

-- Users can view their own broadcasts
CREATE POLICY "Users can view own broadcasts" ON broadcasts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own broadcasts
CREATE POLICY "Users can create own broadcasts" ON broadcasts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own broadcasts
CREATE POLICY "Users can update own broadcasts" ON broadcasts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Keep service_role policy (already exists)
-- Keep authenticated select policy (already exists)

COMMIT;
```

**Risk Checklist:**
- ✅ No breaking changes (additive only, keep `request_id` for backward compat)
- ⚠️ **Data Migration:** Existing `broadcasts` rows will have `user_id = NULL`. Consider backfilling if possible, or mark as legacy.
- ⚠️ **Backward Compatibility:** `request_id` is kept, `campaign_id` is generated from `id` for existing rows.

---

### Step 3: Create `broadcast_targets` Table

**File:** `supabase/migrations/YYYYMMDD_broadcast_targets.sql`

```sql
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
```

**Risk Checklist:**
- ✅ No breaking changes (new table only)
- ✅ No data migration needed
- ✅ Depends on `broadcasts` and `businesses` (created in Steps 1-2)

---

### Step 4: Create `broadcast_messages` Table

**File:** `supabase/migrations/YYYYMMDD_broadcast_messages.sql`

```sql
-- Migration: Create broadcast_messages table
-- Date: 2025-01-27
-- Description: Log all WhatsApp messages (outbound and inbound) for audit/debugging

BEGIN;

-- Create broadcast_messages table
CREATE TABLE IF NOT EXISTS broadcast_messages (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_campaign_id ON broadcast_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_target_id ON broadcast_messages(target_id) WHERE target_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_business_id ON broadcast_messages(business_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_wa_message_id ON broadcast_messages(wa_message_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_direction ON broadcast_messages(direction);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_created_at ON broadcast_messages(created_at DESC);

-- Enable RLS
ALTER TABLE broadcast_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view messages for their own campaigns
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

COMMIT;
```

**Risk Checklist:**
- ✅ No breaking changes (new table only)
- ✅ No data migration needed
- ✅ Depends on `broadcasts`, `broadcast_targets`, `businesses` (created in Steps 1-3)

---

### Step 5: Enhance `broadcast_responses` Table

**File:** `supabase/migrations/YYYYMMDD_broadcast_enhance_responses.sql`

```sql
-- Migration: Enhance broadcast_responses table
-- Date: 2025-01-27
-- Description: Add full message tracking (campaign_id, target_id, wa_message_id, text, raw_payload)

BEGIN;

-- Add campaign_id (FK to broadcasts.id)
ALTER TABLE broadcast_responses ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES broadcasts(id) ON DELETE CASCADE;

-- Populate campaign_id from request_id if possible
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

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_broadcast_responses_campaign_id ON broadcast_responses(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_broadcast_responses_target_id ON broadcast_responses(target_id) WHERE target_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_broadcast_responses_business_id ON broadcast_responses(business_id) WHERE business_id IS NOT NULL;

-- Update RLS: Add user ownership policy
DROP POLICY IF EXISTS "Users can view own broadcast responses" ON broadcast_responses;
CREATE POLICY "Users can view own broadcast responses" ON broadcast_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM broadcasts 
      WHERE (
        (id = broadcast_responses.campaign_id) OR 
        (request_id = broadcast_responses.request_id)
      )
      AND user_id = auth.uid()
    )
  );

-- Keep existing policies (service_role, authenticated select)

COMMIT;
```

**Risk Checklist:**
- ✅ No breaking changes (additive only, keep existing columns)
- ⚠️ **Data Migration:** Populate `campaign_id` from `request_id` for existing rows
- ⚠️ **Backward Compatibility:** Keep `request_id` FK for existing code

---

## Migration Execution Order

1. ✅ **Step 1:** Create `businesses` table (no dependencies)
2. ✅ **Step 2:** Enhance `broadcasts` table (depends on `conversations` - already exists)
3. ✅ **Step 3:** Create `broadcast_targets` table (depends on `broadcasts`, `businesses`)
4. ✅ **Step 4:** Create `broadcast_messages` table (depends on `broadcasts`, `broadcast_targets`, `businesses`)
5. ✅ **Step 5:** Enhance `broadcast_responses` table (depends on `broadcasts`, `broadcast_targets`, `businesses`)

**Total Migration Files:** 5

---

## Risk Checklist Summary

### Breaking Changes
- ❌ **None** - All changes are additive or new tables

### Data Compatibility
- ⚠️ **Existing `broadcasts` rows:** Will have `user_id = NULL`. Consider backfilling or marking as legacy.
- ⚠️ **Existing `broadcast_responses` rows:** `campaign_id` will be populated from `request_id` automatically.

### Backward Compatibility
- ✅ **`broadcasts.request_id`:** Kept for backward compatibility
- ✅ **`broadcast_responses.request_id`:** Kept for backward compatibility
- ✅ **All existing RLS policies:** Kept, new policies added

### Required Actions Post-Migration
1. **Populate `businesses` table:** Initial data load (via Edge Function, admin script, or manual import)
2. **Backfill `broadcasts.user_id`:** If possible, link existing broadcasts to users (or mark as legacy)
3. **Enable Realtime:** Enable Supabase Realtime for `broadcast_responses` table (if not already enabled)
4. **Update Edge Functions:** Update `whatsapp-broadcast` function to use new schema

### Testing Checklist
- [ ] Create a broadcast campaign (new schema)
- [ ] Select targets (new `broadcast_targets` table)
- [ ] Send WhatsApp messages (new `broadcast_messages` table)
- [ ] Receive webhook responses (enhanced `broadcast_responses` table)
- [ ] Verify RLS policies (users can only see their own campaigns)
- [ ] Verify realtime subscriptions (broadcast_responses updates trigger ChatKit widgets)

---

## Edge Function Updates Required

### `whatsapp-broadcast/index.ts`

**Current:** Uses `broadcasts` and `broadcast_responses` with old schema  
**Required Changes:**
1. Use `campaign_id` instead of `request_id` (or support both)
2. Insert into `broadcast_targets` when selecting businesses
3. Insert into `broadcast_messages` when sending WhatsApp messages
4. Update `broadcast_targets.status` when messages are sent/delivered/read
5. Link `broadcast_responses` to `campaign_id` and `target_id`

### `whatsapp-status/index.ts` (if exists)

**Required Changes:**
1. Update `broadcast_targets.status` based on webhook status events
2. Insert into `broadcast_messages` for status webhooks (optional)

---

## Realtime Configuration

### Enable Realtime for `broadcast_responses`

**Action Required:** In Supabase Dashboard:
1. Go to Database → Realtime
2. Enable Realtime for `broadcast_responses` table
3. Configure filters if needed (e.g., only `campaign_id` changes)

### Client-Side Subscription

```typescript
// Subscribe to broadcast_responses for current user's campaigns
const channel = supabase
  .channel('broadcast-responses')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'broadcast_responses',
    filter: `campaign_id=in.(${userCampaignIds.join(',')})`, // Filter by user's campaigns
  }, (payload) => {
    // Trigger ChatKit action
    chatKit.sendAction({
      type: 'easymo.v1.broadcast.inbound_response',
      payload: payload.new,
    });
  })
  .subscribe();
```

---

## Summary

- **New Tables:** 3 (`businesses`, `broadcast_targets`, `broadcast_messages`)
- **Modified Tables:** 2 (`broadcasts`, `broadcast_responses`)
- **Breaking Changes:** None
- **Data Migration:** Minimal (populate `campaign_id` from `request_id`)
- **Backward Compatibility:** Maintained (keep `request_id` columns)

This migration plan ensures no duplicate tables are created and all changes are backward compatible.

