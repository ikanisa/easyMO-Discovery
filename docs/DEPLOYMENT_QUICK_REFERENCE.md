# Deployment Quick Reference

**One-page deployment cheat sheet**

---

## Prerequisites

- Node.js 20+
- Cloudflare account
- Supabase project
- OpenAI API key

---

## 1. Supabase Setup

```bash
# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push

# Deploy Edge Functions
supabase functions deploy cleanup-presence
supabase functions deploy cleanup-ride-intents
supabase functions deploy cleanup-rate-limits
```

**Dashboard Tasks:**
- Enable Realtime for `presence_realtime` and `ride_intents_realtime` views
- Schedule cleanup jobs (every 5 min for presence/intents, hourly for rate limits)

---

## 2. Cloudflare Worker

```bash
cd services/agent-runtime

# Login (first time)
wrangler login

# Set secrets
wrangler secret put OPENAI_API_KEY
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY  # Optional

# Create KV namespace (optional, for rate limiting)
wrangler kv:namespace create "RATE_LIMIT_KV"
# Add namespace ID to wrangler.toml

# Deploy
npm install
npm run deploy
```

**Worker URL:** `https://easymo-agent-worker.your-subdomain.workers.dev`

---

## 3. Cloudflare Pages (PWA)

```bash
cd apps/pwa

# Build
npm install
npm run build

# Deploy
npx wrangler pages deploy dist --project-name discovery
```

**Set Environment Variables in Dashboard:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_WORKER_URL`

**PWA URL:** `https://discovery.pages.dev` (or custom domain)

---

## Environment Variables

### Worker Secrets (Required)
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### PWA Variables (Required)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_WORKER_URL`

---

## Rate Limiting

**Default:** 100 requests per 60 seconds

**Configure:**
- Set `RATE_LIMIT_MAX_REQUESTS` and `RATE_LIMIT_WINDOW_SECONDS` in Worker
- Create KV namespace for distributed rate limiting (recommended)

---

## Rollback

**Worker:**
```bash
wrangler rollback --version VERSION_ID
```

**PWA:**
- Cloudflare Pages Dashboard → Deployments → Rollback

**Supabase:**
- Create rollback migration or restore from backup

---

## Health Checks

```bash
# Worker
curl https://your-worker.workers.dev/mcp/capabilities

# Chat endpoint
curl -X POST https://your-worker.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "test"}]}'
```

---

## Full Guide

See [docs/DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for complete instructions.

