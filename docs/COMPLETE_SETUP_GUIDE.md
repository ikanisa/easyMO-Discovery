# Complete Setup Guide - Phase 1 & Phase 2

**Date:** 2025-01-27  
**Status:** Ready for Execution

---

## 🎯 Overview

This guide walks you through completing the setup for Phase 1 and Phase 2 features that have been implemented and deployed.

---

## ✅ What's Already Done

- ✅ **Worker Deployed:** https://easymo-agent-worker.ikanisa.workers.dev
- ✅ **Code Implemented:** All Phase 1 & Phase 2 features
- ✅ **Documentation Created:** Complete guides and instructions

---

## 📋 Step-by-Step Execution

### Step 1: Apply Database Migrations

**File:** `supabase/migrations/20250127_phase1_phase2_combined.sql`

#### Method 1: Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Open `supabase/migrations/20250127_phase1_phase2_combined.sql`
5. Copy the entire file contents
6. Paste into SQL Editor
7. Click **Run** (or press Cmd/Ctrl + Enter)

#### Method 2: Supabase CLI

```bash
cd /Volumes/PRO-G40/Projects/repos/easyMO-Discovery
supabase db push
```

#### Verify Success

Run this in Supabase SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('agent_handoffs', 'agent_memory');
```

**Expected:** Should return 2 rows

---

### Step 2: Setup Vector Store (Optional but Recommended)

This enables semantic search for business listings.

#### Quick Setup

```bash
# Generate a secret (or use your own)
CRON_SECRET=$(openssl rand -hex 32)

# Call the setup endpoint
curl -X POST https://easymo-agent-worker.ikanisa.workers.dev/cron/update-vector-store \
  -H "X-Cron-Secret: $CRON_SECRET" \
  -H "Content-Type: application/json"
```

**Note:** If you get "Unauthorized", you need to set `CRON_SECRET` in Cloudflare Dashboard first.

#### Set CRON_SECRET in Cloudflare

1. Go to Cloudflare Dashboard
2. Workers & Pages → Your Worker → Settings → Variables
3. Add Environment Variable:
   - **Name:** `CRON_SECRET`
   - **Value:** Your secret (e.g., from `openssl rand -hex 32`)
4. Save

Then retry the curl command above.

#### Verify Vector Store

After setup, test file search:
```bash
curl -X POST https://easymo-agent-worker.ikanisa.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Find restaurants near me"}],
    "agent_type": "marketplace"
  }'
```

If file search is working, the agent will use semantic search.

---

### Step 3: Test Features

#### Quick Automated Test

```bash
cd /Volumes/PRO-G40/Projects/repos/easyMO-Discovery
./scripts/test-phase1-phase2.sh
```

#### Manual Testing

**Test 1: Web Search**
```
In chat: "What's the weather in Kigali today?"
Expected: Real-time weather information
```

**Test 2: Enhanced Forms**
```
In chat: "I want to register my business"
Expected: Form with validation appears
```

**Test 3: Agent Handoff**
```
In chat (to support): "I need a ride to Kigali"
Expected: Transfers to mobility agent seamlessly
```

**Test 4: File Search** (after vector store setup)
```
In chat (to marketplace): "Find restaurants near me"
Expected: Semantic search results
```

**Test 5: Parallel Tools**
- Check worker logs
- Look for multiple tools starting simultaneously
- Independent tools should execute in parallel

**Test 6: Agent Memory**
```sql
-- Store a preference
INSERT INTO agent_memory (user_id, agent_type, key, value)
VALUES (
  'your-user-id',
  'mobility',
  'preferred_vehicle_type',
  '{"type": "moto", "reason": "faster"}'
);

-- Then test in chat - agent should remember preference
```

---

## 📚 Documentation Reference

### Setup Guides
- **Database Migrations:** `docs/DATABASE_MIGRATION_INSTRUCTIONS.md`
- **Vector Store:** `docs/VECTOR_STORE_SETUP.md`
- **Testing:** `docs/TESTING_GUIDE.md`
- **This Guide:** `docs/COMPLETE_SETUP_GUIDE.md`

### Implementation Details
- **Phase 1:** `docs/PHASE1_IMPLEMENTATION_COMPLETE.md`
- **Phase 2:** `docs/PHASE2_IMPLEMENTATION_COMPLETE.md`
- **Deployment:** `docs/PHASE1_PHASE2_DEPLOYMENT_SUMMARY.md`

### OpenAI Platform
- **Summary:** `docs/OPENAI_PLATFORM_SUMMARY.md`
- **Enhancements:** `docs/OPENAI_ENHANCEMENTS_IMPLEMENTATION.md`
- **Quick Start:** `docs/OPENAI_QUICK_START_IMPLEMENTATIONS.md`

---

## 🔍 Verification

### Database Tables
```sql
-- Check both tables exist
SELECT COUNT(*) FROM agent_handoffs;  -- Should work
SELECT COUNT(*) FROM agent_memory;   -- Should work
```

### Worker Endpoints
```bash
# Test chat endpoint
curl -X POST https://easymo-agent-worker.ikanisa.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}], "agent_type": "support"}'

# Should return JSON response
```

### Vector Store (if set up)
```bash
# Check KV (if configured)
# Or test file search in marketplace agent
```

---

## 🚨 Troubleshooting

### Migration Fails

**"relation already exists"**
- ✅ Safe - tables already exist
- Migration is idempotent

**"permission denied"**
- Check Supabase project access
- Verify you're in the correct project

### Vector Store Fails

**"Unauthorized"**
- Set `CRON_SECRET` in Cloudflare Dashboard
- Use the same secret in curl command

**"No businesses found"**
- Check `businesses` table has data
- Verify businesses have `active = true`

### Features Not Working

**Check Worker Logs:**
- Go to Cloudflare Dashboard
- Workers & Pages → Your Worker → Logs
- Look for errors

**Check Database:**
- Verify migrations applied
- Check tables exist

**Check Environment Variables:**
- `OPENAI_API_KEY` - Required
- `SUPABASE_URL` - Required
- `SUPABASE_SERVICE_KEY` - Required
- `CRON_SECRET` - For vector store updates

---

## ✅ Completion Checklist

- [ ] Database migrations applied
- [ ] `agent_handoffs` table exists
- [ ] `agent_memory` table exists
- [ ] Vector store set up (optional)
- [ ] Web search tested
- [ ] Enhanced forms tested
- [ ] Agent handoff tested
- [ ] File search tested (if vector store set up)
- [ ] Parallel tools verified (check logs)
- [ ] Agent memory tested

---

## 🎉 Success!

Once all steps are complete:
- ✅ All Phase 1 features active
- ✅ All Phase 2 features active
- ✅ Worker fully operational
- ✅ Ready for production use

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review relevant documentation
3. Check worker logs in Cloudflare Dashboard
4. Verify database migrations applied correctly

---

**Ready to proceed! Follow the steps above to complete setup.**

