# Quick Deployment Guide

**Quick reference for deploying easyMO Discovery with OpenAI Agents SDK**

---

## Prerequisites

- Cloudflare account
- Supabase project
- OpenAI API key
- Node.js 20+

---

## Step 1: Deploy Worker (5 minutes)

```bash
# 1. Navigate to worker directory
cd worker

# 2. Install dependencies
npm install

# 3. Login to Cloudflare (first time only)
wrangler login

# 4. Set secrets (paste values when prompted)
wrangler secret put OPENAI_API_KEY
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY

# 5. Deploy
npm run deploy
```

**Note the Worker URL** from the output (e.g., `https://easymo-agent-worker.xyz.workers.dev`)

---

## Step 2: Configure Frontend

### Local Development

Create `.env.local` in the root directory:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_WORKER_URL=https://easymo-agent-worker.xyz.workers.dev
```

### Production (Cloudflare Pages)

1. Go to [Cloudflare Pages Dashboard](https://dash.cloudflare.com/pages)
2. Create/Select project → Settings → Environment Variables
3. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_WORKER_URL` (from Step 1)

---

## Step 3: Deploy Frontend

### Option A: Via Dashboard (Recommended)

1. Push code to GitHub
2. Cloudflare Pages → Create project → Connect to Git
3. Build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Node version: `20`
4. Add environment variables (Step 2)
5. Deploy

### Option B: Via CLI

```bash
# From project root
npm run pages:deploy
```

---

## Step 4: Verify

### Test Worker

```bash
curl -X POST https://your-worker-url.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

### Test Frontend

1. Open deployed URL
2. Start a chat session
3. Verify responses are received
4. Test different agents (marketplace, support, mobility, payments)

---

## Troubleshooting

**Worker not responding?**
- Check secrets in Cloudflare Dashboard
- Check Worker logs
- Verify Worker URL is correct

**Frontend errors?**
- Check environment variables are set
- Check browser console
- Verify Worker URL is correct in `VITE_WORKER_URL`

**Need more details?**
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for full guide
- See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for detailed checklist

