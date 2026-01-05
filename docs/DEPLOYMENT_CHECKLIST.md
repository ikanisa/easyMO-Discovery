# Deployment Checklist

**Date:** 2025-01-27  
**Status:** Ready for Deployment

---

## Pre-Deployment

### Prerequisites

- [ ] Node.js 20+ installed
- [ ] Cloudflare account created
- [ ] Supabase project created
- [ ] OpenAI API key obtained
- [ ] Git repository set up

---

## Step 1: Deploy Worker

### 1.1 Navigate to Worker Directory

```bash
cd worker
npm install
```

### 1.2 Set Secrets in Cloudflare

**Option A: Via Dashboard (Recommended)**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Workers & Pages → Workers
3. Create new worker:
   - Name: `easymo-agent-worker` (or your preferred name)
   - Click "Create a Worker"
4. Go to Settings → Variables and Secrets
5. Add the following secrets (click "Add variable" → "Encrypted"):

| Secret | Required | Example Format |
|--------|----------|----------------|
| `OPENAI_API_KEY` | ✅ | `sk-proj-...` |
| `SUPABASE_URL` | ✅ | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | ✅ | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `GEMINI_API_KEY` | ❌ | `AIza...` |
| `GOOGLE_MAPS_API_KEY` | ❌ | `AIza...` |

**Option B: Via CLI**

```bash
cd worker

# Login to Cloudflare (first time only)
wrangler login

# Set required secrets
wrangler secret put OPENAI_API_KEY
# Paste your OpenAI API key when prompted

wrangler secret put SUPABASE_URL
# Paste your Supabase URL when prompted (e.g., https://xxxxx.supabase.co)

wrangler secret put SUPABASE_ANON_KEY
# Paste your Supabase anon key when prompted

# Optional secrets
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put GEMINI_API_KEY
wrangler secret put GOOGLE_MAPS_API_KEY
```

### 1.3 Update Worker Name (Optional)

If you want to use a different worker name, edit `worker/wrangler.toml`:

```toml
name = "your-worker-name"
```

### 1.4 Deploy Worker

```bash
cd worker
npm run deploy
```

**Expected Output:**
```
✓ Compiled Worker successfully
✓ Uploaded Worker
✓ Published Worker
  https://your-worker-name.your-subdomain.workers.dev
```

### 1.5 Verify Worker Deployment

**Test the Worker:**

```bash
curl -X POST https://your-worker-name.your-subdomain.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'
```

**Expected Response:**
```json
{
  "message": "Hello! How can I help you today?",
  "agent_type": "support",
  "conversation_id": "..."
}
```

**Note the Worker URL:** `https://your-worker-name.your-subdomain.workers.dev`

### 1.6 Check Worker Logs

1. Go to Cloudflare Dashboard → Workers
2. Click on your worker
3. Go to "Logs" tab
4. Verify requests are being logged

---

## Step 2: Configure Frontend

### 2.1 Environment Variables for Local Development

Create `.env.local` in the root directory:

```bash
# Required
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
VITE_WORKER_URL=https://your-worker-name.your-subdomain.workers.dev

# Optional (for local dev only)
# GEMINI_API_KEY=your-gemini-key (only if using legacy fallback)
```

### 2.2 Verify Configuration

Check `config.ts`:

```typescript
ENABLE_WORKER_AGENT: true,
WORKER_URL: import.meta.env.VITE_WORKER_URL || '',
```

### 2.3 Test Locally

```bash
npm install
npm run dev
```

**Verify:**
1. Open http://localhost:3000
2. Start a chat session
3. Verify OpenAI responses are received
4. Check browser console for errors

---

## Step 3: Deploy Frontend to Cloudflare Pages

### 3.1 Via Dashboard (Recommended)

1. **Push code to GitHub:**
   ```bash
   git add .
   git commit -m "Migrate to OpenAI Agents SDK"
   git push origin main
   ```

2. **Go to Cloudflare Pages:**
   - Visit [Cloudflare Pages Dashboard](https://dash.cloudflare.com/pages)
   - Click "Create a project"
   - Select "Connect to Git"
   - Select your Git provider (GitHub, GitLab, etc.)
   - Authorize Cloudflare to access your repositories
   - Select your repository

3. **Configure Build Settings:**
   - **Project name:** `easymo-discovery` (or your preferred name)
   - **Production branch:** `main` (or your main branch)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (root of repository)
   - **Node.js version:** `20` (or `20.x`)

4. **Add Environment Variables:**
   Click "Environment variables" and add:

   | Variable | Value | Environment |
   |----------|-------|-------------|
   | `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | Production, Preview |
   | `VITE_SUPABASE_ANON_KEY` | `your-supabase-anon-key` | Production, Preview |
   | `VITE_WORKER_URL` | `https://your-worker-name.your-subdomain.workers.dev` | Production, Preview |

5. **Deploy:**
   - Click "Save and Deploy"
   - Wait for build to complete
   - Note the deployment URL

### 3.2 Via CLI

```bash
# Build
npm run build

# Deploy
npm run pages:deploy
```

Or manually:

```bash
npx wrangler pages deploy dist --project-name easymo-discovery
```

**Set environment variables via Dashboard** (Pages → Settings → Environment Variables)

---

## Step 4: Post-Deployment Verification

### 4.1 Test Worker Endpoint

```bash
curl -X POST https://your-worker-url.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'
```

**Expected:** JSON response with `message` and `agent_type`

### 4.2 Test Frontend

1. Open deployed frontend URL
2. **Test Home Screen:**
   - Verify ChatHome loads
   - Test quick action chips
   - Verify input field works

3. **Test Chat Sessions:**
   - **Support Agent:** Start chat, ask "Help me"
   - **Marketplace Agent:** Ask "Find nearby restaurants"
   - **Mobility Agent:** Ask "I need a ride"
   - **Payments Agent:** Ask "Generate MoMo QR"

4. **Test Streaming:**
   - Verify responses stream in real-time
   - Check for token-by-token updates
   - Verify smooth streaming experience

5. **Test Tool Results:**
   - Marketplace: Verify business cards render
   - Payments: Verify QR codes generate
   - Mobility: Verify matching results (if implemented)

6. **Test Error Handling:**
   - Disconnect network (simulate offline)
   - Verify error messages display
   - Reconnect and verify recovery

### 4.3 Verify No Secrets in Frontend

**Check deployed bundle:**

1. Open deployed site
2. Open DevTools → Sources
3. Search for "sk-" or "API_KEY" or "SECRET"
4. Verify no API keys found in bundle

### 4.4 Check Logs

**Worker Logs:**
- Cloudflare Dashboard → Workers → Your Worker → Logs
- Verify requests are logged
- Check for errors

**Frontend Logs:**
- Browser DevTools → Console
- Check for errors
- Verify Worker requests succeed (Network tab)

---

## Step 5: Production Verification Checklist

### Functionality

- [ ] Worker responds to requests
- [ ] All agent types work (marketplace, support, mobility, payments)
- [ ] Streaming responses work
- [ ] Tool results render correctly
- [ ] Error handling works
- [ ] Offline detection works

### Security

- [ ] No API keys in frontend bundle
- [ ] Worker secrets are encrypted
- [ ] Environment variables set correctly
- [ ] CORS headers configured correctly

### Performance

- [ ] Worker responds quickly (< 2s)
- [ ] Streaming is smooth
- [ ] No console errors
- [ ] No network errors

### Features

- [ ] Home screen (ChatHome) works
- [ ] Discovery page works
- [ ] Business page works
- [ ] Services page works
- [ ] Settings page works
- [ ] MoMo Generator works
- [ ] QR Scanner works
- [ ] Onboarding works

---

## Troubleshooting

### Worker Not Responding

1. **Check Worker Status:**
   - Cloudflare Dashboard → Workers → Your Worker
   - Verify worker is deployed and active

2. **Check Secrets:**
   - Settings → Variables and Secrets
   - Verify all required secrets are set

3. **Check Logs:**
   - Workers → Logs
   - Look for error messages

4. **Test Worker Directly:**
   ```bash
   curl -X POST https://your-worker-url.workers.dev \
     -H "Content-Type: application/json" \
     -d '{"messages": [{"role": "user", "content": "test"}]}'
   ```

### Frontend Errors

1. **Check Environment Variables:**
   - Cloudflare Pages → Settings → Environment Variables
   - Verify all variables are set

2. **Check Browser Console:**
   - Open DevTools → Console
   - Look for error messages

3. **Check Network Tab:**
   - DevTools → Network
   - Verify Worker requests (filter by your Worker URL)
   - Check response status codes

4. **Verify Worker URL:**
   - Check `VITE_WORKER_URL` is correct
   - Verify Worker URL is accessible

### Authentication Issues

1. **Check Supabase Credentials:**
   - Verify `VITE_SUPABASE_URL` is correct
   - Verify `VITE_SUPABASE_ANON_KEY` is correct

2. **Check RLS Policies:**
   - Supabase Dashboard → Authentication → Policies
   - Verify policies are set correctly

3. **Check User Authentication:**
   - Verify users can sign in
   - Check anonymous auth is enabled

---

## Rollback Plan

If issues occur after deployment:

### Quick Rollback (Worker Only)

1. Set `ENABLE_WORKER_AGENT: false` in `config.ts`
2. Redeploy frontend
3. App falls back to GeminiService (if enabled)

### Full Rollback

1. Revert code changes:
   ```bash
   git revert HEAD
   git push origin main
   ```

2. Redeploy frontend (Cloudflare Pages will auto-deploy)
3. Keep Worker running (doesn't interfere if not used)

---

## Next Steps After Deployment

- [ ] Set up monitoring (Cloudflare Analytics, Sentry, etc.)
- [ ] Set up alerts for errors
- [ ] Monitor Worker usage and costs
- [ ] Review logs regularly
- [ ] Plan for rate limiting (if needed)
- [ ] Plan for enhanced logging (if needed)
- [ ] Consider adding tests (if needed)

---

## Support

- [Migration Guide](./MIGRATION_TO_OPENAI.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Worker README](../worker/README.md)
- [Migration Status](./MIGRATION_STATUS.md)

