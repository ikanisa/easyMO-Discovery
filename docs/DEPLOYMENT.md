# Deployment Guide - OpenAI Migration

**Last Updated:** 2025-01-27  
**Status:** Production Ready

---

## Overview

This guide covers deploying easyMO Discovery with OpenAI Agents SDK as the primary chat engine. The architecture uses:

- **Frontend:** Cloudflare Pages (PWA)
- **AI Backend:** Cloudflare Workers (OpenAI Agents SDK)
- **Database:** Supabase (auth, DB, RLS, realtime, storage)
- **Optional Tools:** Gemini/Google Maps (server-side only)

---

## Prerequisites

1. **Node.js 20+** installed
2. **Cloudflare account** (for Workers and Pages)
3. **Supabase project** (for database and auth)
4. **OpenAI API key** (for AI features)
5. **Git repository** (for CI/CD or manual deployment)

---

## Step 1: Deploy Cloudflare Worker

The Worker handles all AI agent orchestration using OpenAI Agents SDK.

### 1.1 Navigate to Worker Directory

```bash
cd worker
npm install
```

### 1.2 Set Secrets in Cloudflare

**Option A: Via Dashboard (Recommended)**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Workers & Pages → Workers
3. Create new worker or select existing
4. Settings → Variables and Secrets
5. Add the following secrets:

| Secret | Required | Description |
|--------|----------|-------------|
| `OPENAI_API_KEY` | ✅ | OpenAI API key (starts with `sk-proj-`) |
| `SUPABASE_URL` | ✅ | Supabase project URL (e.g., `https://xxxxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | ✅ | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | Service role key (for admin operations) |
| `GEMINI_API_KEY` | ❌ | Gemini API key (for optional geocoding) |
| `GOOGLE_MAPS_API_KEY` | ❌ | Google Maps API key (for optional ETA calculations) |

**Option B: Via CLI**

```bash
cd worker
wrangler login
wrangler secret put OPENAI_API_KEY
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
# Optional
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put GEMINI_API_KEY
wrangler secret put GOOGLE_MAPS_API_KEY
```

### 1.3 Deploy Worker

```bash
cd worker
npm run deploy
```

**Note the Worker URL** (e.g., `https://easymo-agent-worker.your-subdomain.workers.dev`)

---

## Step 2: Configure Frontend

### 2.1 Environment Variables

Create `.env.local` for local development:

```bash
# Required
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_WORKER_URL=https://easymo-agent-worker.your-subdomain.workers.dev
```

### 2.2 Verify Configuration

Check `config.ts` has:

```typescript
ENABLE_WORKER_AGENT: true,
WORKER_URL: import.meta.env.VITE_WORKER_URL || '',
```

---

## Step 3: Deploy Frontend to Cloudflare Pages

### 3.1 Via Dashboard (Recommended)

1. Go to [Cloudflare Pages](https://dash.cloudflare.com/pages)
2. Create new project → Connect to Git
3. Select your repository
4. Configure build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node.js version:** 20
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_WORKER_URL`
6. Deploy

### 3.2 Via CLI

```bash
# Build
npm run build

# Deploy
npm run pages:deploy
```

Or manually:

```bash
npx wrangler pages deploy dist --project-name discovery
```

**Set environment variables via Dashboard** (Pages → Settings → Environment Variables)

---

## Step 4: Verify Deployment

### 4.1 Test Worker

```bash
curl -X POST https://your-worker-url.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'
```

Expected: JSON response with `message` and `agent_type` fields.

### 4.2 Test Frontend

1. Open deployed frontend URL
2. Start a chat session
3. Verify OpenAI responses are received
4. Test different agent types (marketplace, support, mobility, payments)

---

## Production Checklist

- [ ] Worker deployed with all required secrets
- [ ] Frontend deployed with environment variables
- [ ] Worker URL configured in frontend
- [ ] All agent types working (marketplace, support, mobility, payments)
- [ ] Streaming responses working
- [ ] Tool results rendering correctly
- [ ] Error handling working
- [ ] No secrets in frontend bundle (verified)

---

## Rollback Plan

If issues occur:

1. **Quick Rollback:**
   - Set `ENABLE_WORKER_AGENT: false` in `config.ts`
   - Redeploy frontend
   - App falls back to legacy GeminiService (if enabled)

2. **Full Rollback:**
   - Revert code changes
   - Redeploy
   - Keep Worker running (doesn't interfere if not used)

---

## Troubleshooting

### Worker Not Responding

1. Check Worker logs: Cloudflare Dashboard → Workers → Logs
2. Verify secrets are set correctly
3. Check CORS headers in Worker response
4. Verify Worker URL is correct in frontend

### Frontend Errors

1. Check browser console for errors
2. Verify environment variables are set
3. Check network tab for Worker requests
4. Verify `VITE_WORKER_URL` is correct

### Authentication Issues

1. Verify Supabase credentials
2. Check RLS policies
3. Verify user authentication flow

---

## Monitoring

### Worker Logs

- Cloudflare Dashboard → Workers → Logs
- Real-time request/response logging
- Error tracking

### Frontend Monitoring

- Browser DevTools → Network tab
- Console logs
- Optional: Add Sentry or similar for error tracking

---

## Security Notes

✅ **DO:**
- Use Cloudflare secrets for Worker (never commit API keys)
- Use environment variables for frontend (VITE_* prefix)
- Keep Supabase service role key secure (Worker only)
- Use RLS policies for database access

❌ **DON'T:**
- Commit API keys to git
- Expose API keys in frontend bundle
- Use service role key in frontend
- Hardcode secrets in code

---

## Next Steps

- Add rate limiting to Worker
- Implement conversation persistence
- Add analytics/logging
- Set up CI/CD pipeline
- Add monitoring/alerting

---

## References

- [Migration Guide](./MIGRATION_TO_OPENAI.md)
- [Worker README](../worker/README.md)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)

