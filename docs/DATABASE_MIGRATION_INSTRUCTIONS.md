# Database Migration Instructions

**Date:** 2025-01-27  
**Migrations:** Phase 1 & Phase 2 Combined

---

## Quick Start

### Option 1: Supabase CLI (Recommended)

```bash
cd /Volumes/PRO-G40/Projects/repos/easyMO-Discovery
supabase db push
```

### Option 2: Supabase Dashboard (Manual)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open `supabase/migrations/20250127_phase1_phase2_combined.sql`
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **Run**

### Option 3: Individual Migrations

If you prefer to apply separately:

1. **Phase 1:** `supabase/migrations/20250127_agent_handoffs.sql`
2. **Phase 2:** `supabase/migrations/20250127_agent_memory.sql`

---

## What Gets Created

### Tables
1. **`agent_handoffs`** - Tracks agent-to-agent handoffs
2. **`agent_memory`** - Stores user preferences per agent

### Indexes
- `idx_agent_handoffs_conversation_id`
- `idx_agent_handoffs_created_at`
- `idx_agent_memory_user_agent`
- `idx_agent_memory_key`
- `idx_agent_memory_updated_at`

### RLS Policies
- Users can view/manage their own data
- Service role has full access

### Triggers
- `update_agent_memory_updated_at_trigger` - Auto-updates `updated_at`

---

## Verification

After applying migrations, verify in Supabase SQL Editor:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('agent_handoffs', 'agent_memory');

-- Check indexes
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('agent_handoffs', 'agent_memory');

-- Check policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('agent_handoffs', 'agent_memory');
```

Expected results:
- 2 tables
- 5 indexes
- 4 policies

---

## Troubleshooting

### Error: "relation already exists"
- Tables already exist - safe to ignore
- Migration is idempotent (uses `IF NOT EXISTS`)

### Error: "permission denied"
- Check you're using the correct Supabase project
- Verify service_role key for RLS policies

### Error: "function already exists"
- Trigger function already exists - safe to ignore
- Migration handles this with `CREATE OR REPLACE`

---

## Rollback (If Needed)

```sql
-- Drop tables (WARNING: This deletes all data)
DROP TABLE IF EXISTS agent_memory CASCADE;
DROP TABLE IF EXISTS agent_handoffs CASCADE;
DROP FUNCTION IF EXISTS update_agent_memory_updated_at() CASCADE;
```

---

## Next Steps

After migrations are applied:
1. ✅ Verify tables exist
2. ✅ Test agent handoff feature
3. ✅ Test agent memory feature
4. ✅ Setup vector store (optional)

