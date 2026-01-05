# Phase 1 Deployment Guide

**Date:** 2025-01-27  
**Status:** Ready for Deployment

---

## Prerequisites

- Supabase project configured
- Cloudflare Workers account
- Environment variables set

---

## Step 1: Database Migration

### Option A: Using Supabase CLI (Recommended)

If you have Supabase CLI linked to your project:

```bash
cd /Volumes/PRO-G40/Projects/repos/easyMO-Discovery
supabase db push
```

### Option B: Manual Migration via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20250127_agent_handoffs.sql`
4. Paste and execute the SQL

### Option C: Using Supabase API

```bash
# Set your Supabase credentials
export SUPABASE_URL="your-project-url"
export SUPABASE_SERVICE_KEY="your-service-key"

# Apply migration
curl -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d @supabase/migrations/20250127_agent_handoffs.sql
```

### Verify Migration

```sql
-- Run in Supabase SQL Editor
SELECT * FROM agent_handoffs LIMIT 1;
-- Should return empty result (table exists, no data yet)
```

---

## Step 2: Deploy Worker

### Build and Deploy

```bash
cd /Volumes/PRO-G40/Projects/repos/easyMO-Discovery

# Build worker
npm run worker:dev  # Test locally first

# Deploy to Cloudflare
npm run worker:deploy
```

### Required Environment Variables

Set these in Cloudflare Workers dashboard:

```
OPENAI_API_KEY=your-openai-api-key
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-supabase-service-key
```

### Verify Deployment

```bash
# Test the worker endpoint
curl -X POST https://your-worker.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is the weather in Kigali?"}],
    "agent_type": "support"
  }'
```

---

## Step 3: Build and Deploy Frontend

### Build PWA

```bash
cd /Volumes/PRO-G40/Projects/repos/easyMO-Discovery
npm run build
```

### Deploy to Cloudflare Pages

```bash
npm run pages:deploy
```

Or use Cloudflare Dashboard:
1. Go to Cloudflare Pages
2. Connect your repository
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_WORKER_URL` (your worker URL)

---

## Step 4: Test Features

### 1. Test Web Search

In the chat interface, try:
- "What's the weather in Kigali today?"
- "Are there any events happening this weekend?"
- "What are the business hours for [business name]?"

**Expected:** Agent should use web search to answer real-time questions.

### 2. Test Enhanced Forms

Trigger business onboarding:
- "I want to register my business"
- Fill out the form with validation
- Test phone number format validation (+250XXXXXXXXX)
- Test required fields

**Expected:** Form should validate inputs and show error messages.

### 3. Test Real-time Widgets

Start a broadcast:
- "Send a broadcast to find 2kg rice"
- Watch the progress widget update in real-time

**Expected:** Widget should update automatically as broadcast status changes.

### 4. Test Agent Handoff

Try:
- Start with support agent: "I need a ride to Kigali"
- Agent should handoff to mobility agent
- Check conversation continues seamlessly

**Expected:** Conversation should transfer to mobility agent with context preserved.

---

## Troubleshooting

### Database Migration Issues

**Error:** "relation already exists"
- Table already exists, migration is idempotent (safe to ignore)

**Error:** "permission denied"
- Check RLS policies are correct
- Verify service_role has access

### Worker Deployment Issues

**Error:** "Missing environment variables"
- Set all required env vars in Cloudflare Dashboard
- Check `wrangler.toml` for configuration

**Error:** "Module not found"
- Run `npm install` in `services/agent-runtime`
- Check all dependencies are installed

### Frontend Build Issues

**Error:** "Cannot find module '@easymo/chatkit-widget-pack'"
- Run `npm install` in root directory
- Build widget pack: `cd packages/chatkit-widget-pack && npm run build`

**Error:** "RealtimeWidget not found"
- Check import path: `apps/pwa/components/Chat/RealtimeWidget.tsx`
- Verify file exists

---

## Verification Checklist

- [ ] Database migration applied successfully
- [ ] `agent_handoffs` table exists
- [ ] Worker deployed and accessible
- [ ] Web search tool works in chat
- [ ] Enhanced forms render correctly
- [ ] Form validation works
- [ ] Real-time widgets subscribe to Supabase
- [ ] Agent handoff works between agents
- [ ] No console errors in browser
- [ ] No errors in worker logs

---

## Rollback Plan

If issues occur:

1. **Database Rollback:**
   ```sql
   DROP TABLE IF EXISTS agent_handoffs CASCADE;
   ```

2. **Worker Rollback:**
   - Deploy previous version from git history
   - Or disable new features via feature flags

3. **Frontend Rollback:**
   - Deploy previous version
   - Or remove RealtimeWidget usage temporarily

---

## Next Steps

After successful deployment:

1. Monitor worker logs for errors
2. Check Supabase Realtime subscriptions
3. Test all features with real users
4. Collect feedback
5. Proceed to Phase 2 (File Search, Parallel Tools, Agent Memory)

---

## Support

If you encounter issues:

1. Check Cloudflare Worker logs
2. Check Supabase logs
3. Check browser console
4. Review `docs/PHASE1_IMPLEMENTATION_COMPLETE.md` for implementation details

