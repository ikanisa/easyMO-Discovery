# Next Steps - Execution Guide

**Date:** 2025-01-27  
**Status:** Ready to Execute

---

## Step 1: Apply Database Migrations ✅

### Quick Method (Combined Migration)

**File:** `supabase/migrations/20250127_phase1_phase2_combined.sql`

**Option A: Supabase CLI**
```bash
cd /Volumes/PRO-G40/Projects/repos/easyMO-Discovery
supabase db push
```

**Option B: Supabase Dashboard**
1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Open `supabase/migrations/20250127_phase1_phase2_combined.sql`
4. Copy entire contents
5. Paste into SQL Editor
6. Click **Run**

**Option C: Individual Migrations**
```bash
# Apply Phase 1
# Copy/paste: supabase/migrations/20250127_agent_handoffs.sql

# Apply Phase 2
# Copy/paste: supabase/migrations/20250127_agent_memory.sql
```

### Verify Migration

Run in Supabase SQL Editor:
```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('agent_handoffs', 'agent_memory');

-- Should return 2 rows
```

---

## Step 2: Setup Vector Store (Optional) 🔍

### Quick Setup

```bash
# Set your cron secret (generate one if needed)
export CRON_SECRET="your-secret-here"

# Call the endpoint
curl -X POST https://easymo-agent-worker.ikanisa.workers.dev/cron/update-vector-store \
  -H "X-Cron-Secret: $CRON_SECRET" \
  -H "Content-Type: application/json"
```

### Expected Response
```json
{
  "success": true,
  "vector_store_id": "vs_abc123...",
  "duration_ms": 5000
}
```

### Verify Setup

Check Cloudflare KV (if configured):
- Key: `business_vector_store_id`
- Value: Should contain vector store ID

Or test file search:
```bash
curl -X POST https://easymo-agent-worker.ikanisa.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Find restaurants near me"}],
    "agent_type": "marketplace"
  }'
```

---

## Step 3: Test Features 🧪

### Quick Test Script

```bash
# Run automated tests
./scripts/test-phase1-phase2.sh
```

### Manual Testing

#### Test 1: Web Search
```
User: "What's the weather in Kigali today?"
Expected: Real-time weather information
```

#### Test 2: Enhanced Forms
```
User: "I want to register my business"
Expected: Form with validation appears
```

#### Test 3: Agent Handoff
```
User: "I need a ride to Kigali" (to support agent)
Expected: Transfers to mobility agent
```

#### Test 4: File Search
```
User: "Find restaurants near me" (to marketplace agent)
Expected: Semantic search results (if vector store set up)
```

#### Test 5: Parallel Tools
```
Check worker logs for multiple tools executing simultaneously
Expected: Independent tools start at same time
```

#### Test 6: Agent Memory
```sql
-- Store memory
INSERT INTO agent_memory (user_id, agent_type, key, value)
VALUES ('test-user', 'mobility', 'preferred_vehicle_type', '{"type": "moto"}');

-- Test retrieval in next conversation
-- Should appear in agent system prompt
```

---

## Verification Checklist

### Database ✅
- [ ] `agent_handoffs` table exists
- [ ] `agent_memory` table exists
- [ ] Indexes created
- [ ] RLS policies active

### Vector Store (Optional) 🔍
- [ ] Vector store created
- [ ] Vector store ID in KV (if configured)
- [ ] Businesses uploaded
- [ ] File search works

### Features ✅
- [ ] Web search works
- [ ] Enhanced forms render
- [ ] Agent handoff works
- [ ] File search works (if set up)
- [ ] Parallel tools execute
- [ ] Agent memory stores/retrieves

---

## Troubleshooting

### Migration Issues

**Error: "relation already exists"**
- ✅ Safe to ignore - tables already exist
- Migration uses `IF NOT EXISTS`

**Error: "permission denied"**
- Check Supabase project access
- Verify service_role key

### Vector Store Issues

**Error: "Unauthorized"**
- Set `CRON_SECRET` in Cloudflare Dashboard
- Or pass `X-Cron-Secret` header

**Error: "No businesses found"**
- Check `businesses` table has data
- Verify `active = true` filter

### Feature Issues

**Web Search Not Working:**
- Check OpenAI API key
- Verify tool in agent tools array

**Handoff Not Working:**
- Verify `agent_handoffs` table exists
- Check conversation_id provided

**Memory Not Working:**
- Verify `agent_memory` table exists
- Check user_id provided

---

## Quick Reference

### Migration Files
- Combined: `supabase/migrations/20250127_phase1_phase2_combined.sql`
- Phase 1: `supabase/migrations/20250127_agent_handoffs.sql`
- Phase 2: `supabase/migrations/20250127_agent_memory.sql`

### Worker Endpoints
- Chat: `https://easymo-agent-worker.ikanisa.workers.dev/api/chat`
- Vector Store: `https://easymo-agent-worker.ikanisa.workers.dev/cron/update-vector-store`

### Documentation
- Migration: `docs/DATABASE_MIGRATION_INSTRUCTIONS.md`
- Vector Store: `docs/VECTOR_STORE_SETUP.md`
- Testing: `docs/TESTING_GUIDE.md`

---

## Success Criteria

After completing all steps:
- ✅ Database migrations applied
- ✅ Vector store set up (optional)
- ✅ All features tested and working
- ✅ No errors in logs
- ✅ Performance improvements visible

---

**Ready to execute! Follow the steps above to complete setup and testing.**

