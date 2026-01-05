# End-to-End Deployment Guide

**Date:** 2025-01-29  
**Status:** Production Ready

---

## Overview

This guide provides complete deployment instructions for the easyMO Discovery platform, including:
- PWA deployment to Cloudflare Pages
- Agent Runtime + MCP Server to Cloudflare Workers
- Supabase migrations and Edge Functions
- Environment variables and secrets
- Rate limiting configuration
- Rollback procedures

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare                            │
│  ┌──────────────────┐  ┌──────────────────────────┐   │
│  │  Cloudflare      │  │  Cloudflare Workers      │   │
│  │  Pages (PWA)     │  │  (Agent Runtime + MCP)   │   │
│  │  - Static assets │  │  - OpenAI Agents SDK      │   │
│  │  - Service Worker│  │  - Tool execution        │   │
│  │  - HTTPS         │  │  - MCP endpoints         │   │
│  └──────────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Supabase                              │
│  - PostgreSQL (with PostGIS)                            │
│  - Authentication                                        │
│  - Row-Level Security (RLS)                             │
│  - Realtime subscriptions                               │
│  - Edge Functions                                        │
└─────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Accounts

- [ ] **Cloudflare Account**
  - Workers & Pages enabled
  - Domain configured (optional, for custom domain)

- [ ] **Supabase Project**
  - PostgreSQL database
  - Authentication enabled
  - Edge Functions enabled

- [ ] **OpenAI Account**
  - API key with sufficient credits

### Required Tools

- [ ] **Node.js 20+** installed
- [ ] **npm** or **yarn** package manager
- [ ] **Git** for version control
- [ ] **Wrangler CLI** (`npm install -g wrangler`)
- [ ] **Supabase CLI** (`npm install -g supabase`)

---

## Step 1: Environment Variables

### 1.1 Complete Environment Variable List

#### Cloudflare Worker Secrets (Required)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `OPENAI_API_KEY` | ✅ | OpenAI API key | `sk-proj-...` |
| `SUPABASE_URL` | ✅ | Supabase project URL | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ | Service role key (for logging) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

#### Cloudflare Worker Secrets (Optional)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GEMINI_API_KEY` | ❌ | Gemini API key (optional tools) | `AIza...` |
| `GOOGLE_MAPS_API_KEY` | ❌ | Google Maps API key (optional tools) | `AIza...` |

#### Cloudflare Worker Environment Variables (Optional)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RATE_LIMIT_MAX_REQUESTS` | ❌ | `100` | Max requests per window |
| `RATE_LIMIT_WINDOW_SECONDS` | ❌ | `60` | Rate limit window (seconds) |

#### Cloudflare Worker Bindings (Optional)

| Binding | Required | Description |
|---------|----------|-------------|
| `KV` | ❌ | KV namespace for rate limiting (recommended) |
| `R2` | ❌ | R2 bucket for file storage (optional) |
| `DB` | ❌ | D1 database (not used, Supabase preferred) |

#### PWA Environment Variables (Client-Safe)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `VITE_WORKER_URL` | ✅ | Worker endpoint URL | `https://worker.workers.dev` |
| `VITE_GOOGLE_MAPS_API_KEY` | ❌ | Google Maps API key (client-safe) | `AIza...` |

---

## Step 2: Supabase Setup

### 2.1 Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in:
   - **Name:** easyMO Discovery
   - **Database Password:** (save securely)
   - **Region:** Choose closest to users
4. Wait for project creation (2-3 minutes)

### 2.2 Get Supabase Credentials

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon/public key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep secret!)

### 2.3 Run Migrations

**Option A: Via Supabase Dashboard (Recommended for Production)**

1. Go to **SQL Editor**
2. For each migration file in `supabase/migrations/`, in order:
   - Open the file
   - Copy contents
   - Paste into SQL Editor
   - Click "Run"

**Migration Order:**
1. `20240522_init.sql` - Initial schema
2. `20241219_broadcast_tables.sql` - Broadcast tables
3. `20250127_conversations_messages.sql` - Conversations
4. `20250127_multi_role_support.sql` - Multi-role support
5. `20250128_ai_first_schema.sql` - AI-first schema
6. `20250129_realtime_presence_ttl.sql` - Realtime & TTL
7. `20250305_secure_rds_and_profiles.sql` - Security updates
8. `20251222_fix_presence_rls.sql` - RLS fixes

**Option B: Via Supabase CLI**

```bash
# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
supabase db push
```

### 2.4 Deploy Edge Functions

```bash
# Login to Supabase
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all functions
supabase functions deploy cleanup-presence
supabase functions deploy cleanup-ride-intents
supabase functions deploy cleanup-rate-limits
```

**Required Secrets for Edge Functions:**

Set in Supabase Dashboard → **Settings** → **Edge Functions** → **Secrets**:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key

### 2.5 Schedule Cleanup Jobs

**Via Supabase Dashboard:**

1. Go to **Edge Functions**
2. For each cleanup function:
   - Click function name
   - Go to **Settings** → **Cron Jobs**
   - Click **Add Cron Job**
   - Configure:

**cleanup-presence:**
- Schedule: `*/5 * * * *` (every 5 minutes)
- HTTP Method: `POST`

**cleanup-ride-intents:**
- Schedule: `*/5 * * * *` (every 5 minutes)
- HTTP Method: `POST`

**cleanup-rate-limits:**
- Schedule: `0 * * * *` (every hour)
- HTTP Method: `POST`

### 2.6 Enable Realtime

1. Go to **Database** → **Replication**
2. Enable replication for:
   - `presence_realtime` (view)
   - `ride_intents_realtime` (view)
3. Configure events: `INSERT`, `UPDATE`, `DELETE`

---

## Step 3: Cloudflare Worker Deployment

### 3.1 Create KV Namespace (Recommended)

**For Rate Limiting:**

```bash
# Create KV namespace
wrangler kv:namespace create "RATE_LIMIT_KV"

# Create preview namespace (for dev)
wrangler kv:namespace create "RATE_LIMIT_KV" --preview
```

**Note the namespace IDs** - you'll need them for `wrangler.toml`

### 3.2 Configure wrangler.toml

**File:** `services/agent-runtime/wrangler.toml`

```toml
name = "easymo-agent-worker"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

# KV namespace for rate limiting (optional but recommended)
[[kv_namespaces]]
binding = "KV"
id = "YOUR_KV_NAMESPACE_ID"
preview_id = "YOUR_PREVIEW_KV_NAMESPACE_ID"

# Production environment
[env.production]
name = "easymo-agent-worker"
routes = [
  { pattern = "api.yourdomain.com", zone_name = "yourdomain.com" }
]

# Development environment
[env.development]
name = "easymo-agent-worker-dev"
```

### 3.3 Set Secrets

**Option A: Via Cloudflare Dashboard (Recommended)**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. **Workers & Pages** → **Workers**
3. Select your worker (`easymo-agent-worker`)
4. **Settings** → **Variables and Secrets**
5. Add each secret (click "Add variable" → "Encrypted"):

**Required:**
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

**Optional:**
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_MAPS_API_KEY`

**Option B: Via CLI**

```bash
cd services/agent-runtime

# Login (first time only)
wrangler login

# Set required secrets
wrangler secret put OPENAI_API_KEY
# Paste when prompted

wrangler secret put SUPABASE_URL
# Paste when prompted

wrangler secret put SUPABASE_ANON_KEY
# Paste when prompted

# Optional secrets
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put GEMINI_API_KEY
wrangler secret put GOOGLE_MAPS_API_KEY
```

### 3.4 Set Environment Variables (Optional)

For rate limiting configuration:

```bash
# Via Dashboard: Settings → Variables and Secrets → Add variable (not encrypted)
# Or via CLI (if supported):
wrangler secret put RATE_LIMIT_MAX_REQUESTS --text "100"
wrangler secret put RATE_LIMIT_WINDOW_SECONDS --text "60"
```

**Note:** These are optional - defaults are 100 requests per 60 seconds.

### 3.5 Deploy Worker

```bash
cd services/agent-runtime

# Install dependencies
npm install

# Deploy to production
npm run deploy

# Or deploy to specific environment
wrangler deploy --env production
```

**Expected Output:**
```
✓ Compiled Worker successfully
✓ Uploaded Worker
✓ Published Worker
  https://easymo-agent-worker.your-subdomain.workers.dev
```

### 3.6 Verify Deployment

```bash
# Test MCP capabilities
curl https://easymo-agent-worker.your-subdomain.workers.dev/mcp/capabilities

# Test tools list
curl https://easymo-agent-worker.your-subdomain.workers.dev/mcp/tools

# Test chat endpoint
curl -X POST https://easymo-agent-worker.your-subdomain.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'
```

---

## Step 4: PWA Deployment (Cloudflare Pages)

### 4.1 Build PWA

```bash
cd apps/pwa

# Install dependencies
npm install

# Build for production
npm run build
```

**Verify:** `dist/` directory created with built assets

### 4.2 Set Environment Variables

**Via Cloudflare Pages Dashboard:**

1. Go to **Workers & Pages** → **Pages**
2. Select your project (or create new)
3. **Settings** → **Environment Variables**
4. Add:

**Production:**
- `VITE_SUPABASE_URL` = Your Supabase URL
- `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key
- `VITE_WORKER_URL` = Your Worker URL
- `VITE_GOOGLE_MAPS_API_KEY` = (optional) Google Maps API key

**Preview:**
- Same variables (or different for testing)

### 4.3 Deploy to Cloudflare Pages

**Option A: Via CLI**

```bash
cd apps/pwa

# Build
npm run build

# Deploy
npx wrangler pages deploy dist --project-name discovery
```

**Option B: Via Git Integration (Recommended)**

1. Go to **Workers & Pages** → **Pages**
2. Click **Create a project**
3. Connect your Git repository
4. Configure:
   - **Project name:** `discovery`
   - **Production branch:** `main`
   - **Build command:** `npm install && npm run build --workspace=apps/pwa`
   - **Build output directory:** `apps/pwa/dist`
   - **Root directory:** (leave empty or set to repo root)
5. Add environment variables (see 4.2)
6. Click **Save and Deploy**

**Option C: Via Dashboard Upload**

1. Go to **Workers & Pages** → **Pages**
2. Select project
3. Click **Upload assets**
4. Upload `apps/pwa/dist` directory contents

### 4.4 Configure Custom Domain (Optional)

1. Go to **Workers & Pages** → **Pages** → Your project
2. **Custom domains** → **Set up a custom domain**
3. Follow DNS configuration instructions

---

## Step 5: Rate Limiting Configuration

### 5.1 Worker-Level Rate Limiting

**Configuration:**

Default: **100 requests per 60 seconds** per user/IP

**Customize via Environment Variables:**

```bash
# Set via Cloudflare Dashboard or wrangler.toml
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_SECONDS=60
```

**With KV Namespace (Recommended):**

1. Create KV namespace (see Step 3.1)
2. Add to `wrangler.toml`:
   ```toml
   [[kv_namespaces]]
   binding = "KV"
   id = "YOUR_KV_NAMESPACE_ID"
   ```
3. Rate limiting will use distributed KV storage

**Without KV (Fallback):**

- Rate limiting still works but is per-worker instance
- Less accurate for distributed traffic
- Still functional for single-instance deployments

### 5.2 Tool-Level Rate Limiting

**Google Maps API:**
- Default: **100 requests per hour** per user/IP
- Configured in `services/agent-runtime/src/utils/toolRateLimit.ts`

**Gemini API:**
- Default: **50 requests per hour** per user/IP
- Configured in `services/agent-runtime/src/utils/toolRateLimit.ts`

**Database-Level Rate Limiting:**
- Ride intents: **5 per 10 minutes** (enforced in RPC)
- Match queries: **20 per minute** (enforced in RPC)

### 5.3 Rate Limit Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706534400
Retry-After: 30 (when limit exceeded)
```

---

## Step 6: Secrets Handling

### 6.1 Security Best Practices

**✅ DO:**
- Use Cloudflare Workers secrets for all sensitive data
- Use `VITE_*` prefix for client-safe environment variables
- Rotate secrets regularly
- Use different secrets for production and development
- Store secrets in secure password manager

**❌ DON'T:**
- Commit secrets to git
- Expose server-side secrets to client
- Share secrets in plain text
- Use production secrets in development

### 6.2 Secret Rotation

**If a secret is compromised:**

1. **Immediately rotate the secret:**
   ```bash
   # Generate new secret
   # Update in Cloudflare Dashboard or via CLI
   wrangler secret put OPENAI_API_KEY
   ```

2. **Update all references:**
   - Cloudflare Worker secrets
   - Supabase Edge Function secrets (if applicable)
   - Environment variables

3. **Monitor for abuse:**
   - Check Cloudflare Workers logs
   - Check Supabase logs
   - Review access patterns

4. **Notify affected users** (if user data compromised)

### 6.3 Secret Storage

**Production:**
- Cloudflare Workers: Use **Encrypted Secrets** in Dashboard
- Supabase: Use **Edge Function Secrets** in Dashboard
- Never store in code or config files

**Development:**
- Use `.dev.vars` file (git-ignored)
- Never commit to repository
- Use different secrets than production

---

## Step 7: Rollback Strategy

### 7.1 Worker Rollback

**Via Cloudflare Dashboard:**

1. Go to **Workers & Pages** → **Workers**
2. Select your worker
3. Go to **Deployments** tab
4. Find previous deployment
5. Click **Rollback**

**Via CLI:**

```bash
cd services/agent-runtime

# List deployments
wrangler deployments list

# Rollback to specific version
wrangler rollback --version VERSION_ID
```

**Manual Rollback:**

```bash
# Checkout previous version
git checkout PREVIOUS_COMMIT

# Deploy
npm run deploy
```

### 7.2 PWA Rollback

**Via Cloudflare Pages Dashboard:**

1. Go to **Workers & Pages** → **Pages**
2. Select your project
3. Go to **Deployments** tab
4. Find previous deployment
5. Click **Retry deployment** or **Rollback**

**Via Git:**

```bash
# Revert to previous commit
git revert HEAD
git push

# Cloudflare Pages will auto-deploy
```

### 7.3 Supabase Migration Rollback

**Option A: Create Rollback Migration**

```sql
-- Create new migration file: supabase/migrations/YYYYMMDD_rollback.sql
-- Reverse the changes from the problematic migration
```

**Option B: Manual SQL Rollback**

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Write SQL to reverse changes
3. Execute carefully
4. Test thoroughly

**Option C: Restore from Backup**

1. Go to **Supabase Dashboard** → **Database** → **Backups**
2. Select backup point
3. Restore database (⚠️ This will overwrite current data)

### 7.4 Rollback Checklist

**Before Rollback:**
- [ ] Identify the issue
- [ ] Locate last known good deployment
- [ ] Backup current state (if possible)
- [ ] Notify team/users (if production)

**During Rollback:**
- [ ] Rollback Worker (if needed)
- [ ] Rollback PWA (if needed)
- [ ] Rollback migrations (if needed)
- [ ] Verify functionality

**After Rollback:**
- [ ] Test critical paths
- [ ] Monitor error logs
- [ ] Document issue and fix
- [ ] Plan forward fix

---

## Step 8: Post-Deployment Verification

### 8.1 Health Checks

**Worker Health:**
```bash
# Test MCP capabilities
curl https://your-worker.workers.dev/mcp/capabilities

# Test chat endpoint
curl -X POST https://your-worker.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "test"}]}'
```

**PWA Health:**
- [ ] Open PWA URL in browser
- [ ] Check console for errors
- [ ] Test authentication
- [ ] Test tool execution

**Supabase Health:**
- [ ] Test database connection
- [ ] Verify RLS policies
- [ ] Test Edge Functions
- [ ] Check Realtime subscriptions

### 8.2 Monitoring

**Cloudflare Workers:**
- Go to **Workers & Pages** → **Workers** → Your worker
- **Analytics** tab: Request count, errors, duration
- **Logs** tab: Real-time logs

**Supabase:**
- Go to **Dashboard** → **Logs**
- Monitor: API requests, database queries, errors

**PWA:**
- Use browser DevTools
- Check Network tab for failed requests
- Monitor Console for errors

### 8.3 Performance Metrics

**Key Metrics to Monitor:**
- Request latency (p50, p95, p99)
- Error rate
- Rate limit violations
- Tool execution time
- Database query time

---

## Step 9: Production Checklist

### Pre-Deployment

- [ ] All environment variables set
- [ ] All secrets configured
- [ ] Migrations tested locally
- [ ] Worker tested locally
- [ ] PWA built and tested locally
- [ ] Rate limiting configured
- [ ] KV namespace created (if using)

### Deployment

- [ ] Supabase migrations applied
- [ ] Supabase Edge Functions deployed
- [ ] Cleanup jobs scheduled
- [ ] Realtime enabled
- [ ] Worker deployed
- [ ] PWA deployed
- [ ] Custom domain configured (if applicable)

### Post-Deployment

- [ ] Health checks passed
- [ ] Authentication working
- [ ] Tools executing correctly
- [ ] Realtime subscriptions working
- [ ] Rate limiting functioning
- [ ] Error monitoring active
- [ ] Performance acceptable

---

## Troubleshooting

### Worker Deployment Fails

**Problem:** Build errors
- **Solution:** Check TypeScript errors locally first
- **Command:** `cd services/agent-runtime && npm run typecheck`

**Problem:** Secret not found
- **Solution:** Verify secrets are set in Cloudflare Dashboard
- **Check:** `wrangler secret list`

### PWA Deployment Fails

**Problem:** Build fails
- **Solution:** Check for missing dependencies
- **Command:** `cd apps/pwa && npm install && npm run build`

**Problem:** Environment variables not working
- **Solution:** Verify variables are set in Cloudflare Pages
- **Check:** Dashboard → Settings → Environment Variables

### Supabase Issues

**Problem:** Migration fails
- **Solution:** Check SQL syntax, run migrations in order
- **Check:** Supabase Dashboard → SQL Editor → History

**Problem:** Edge Functions not deploying
- **Solution:** Verify Supabase CLI is logged in
- **Command:** `supabase login`

---

## Quick Reference

### Deployment Commands

```bash
# Worker
cd services/agent-runtime
npm install
npm run deploy

# PWA
cd apps/pwa
npm install
npm run build
npx wrangler pages deploy dist --project-name discovery

# Supabase Migrations
supabase db push

# Supabase Functions
supabase functions deploy cleanup-presence
supabase functions deploy cleanup-ride-intents
supabase functions deploy cleanup-rate-limits
```

### Environment Variables

**Worker Secrets (Required):**
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

**PWA Variables (Required):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_WORKER_URL`

### URLs

- **Worker:** `https://easymo-agent-worker.your-subdomain.workers.dev`
- **PWA:** `https://discovery.pages.dev` (or custom domain)
- **MCP Server:** `https://easymo-agent-worker.your-subdomain.workers.dev/mcp`

---

## Support

For deployment issues:
- Check Cloudflare Workers logs
- Check Supabase logs
- Review error messages
- Consult troubleshooting section

---

## Next Steps

After successful deployment:
1. Set up monitoring and alerts
2. Configure custom domain (if needed)
3. Set up CI/CD for automated deployments
4. Document any custom configurations
5. Train team on deployment procedures

