# Environment Variables Matrix

This document provides a comprehensive guide to all environment variables used in the easyMO Discovery application across different environments (Development, Preview, Production).

## Overview

Environment variables are separated into two categories:

1. **Public/Client Variables** (`VITE_*` prefix): Safe to expose in browser, bundled at build time
2. **Server/Edge Secrets**: Sensitive credentials, never exposed to client, loaded at runtime

---

## Frontend/Client Environment Variables (Public)

These variables use the `VITE_` prefix and are embedded into the JavaScript bundle at build time. They are safe to expose in the browser but should still not be committed to git.

### Configuration Locations

| Environment | Configuration Method | Location |
|-------------|---------------------|----------|
| **Local Dev** | `.env.local` file | `apps/pwa/.env.local` |
| **Preview** | Cloudflare Pages Dashboard | Settings → Environment variables → Preview |
| **Production** | Cloudflare Pages Dashboard | Settings → Environment variables → Production |

### Variable Matrix

| Variable | Required | Type | Dev | Preview | Production | Description | Where Configured |
|----------|----------|------|-----|---------|------------|-------------|------------------|
| `VITE_SUPABASE_URL` | ✅ Yes | Public | ✅ | ✅ | ✅ | Supabase project URL | Pages Dashboard / `.env.local` |
| `VITE_SUPABASE_ANON_KEY` | ✅ Yes | Public | ✅ | ✅ | ✅ | Supabase anonymous key (public, safe) | Pages Dashboard / `.env.local` |
| `VITE_WORKER_URL` | ⚠️ Conditional | Public | ⚠️ | ⚠️ | ⚠️ | Cloudflare Worker URL (if `ENABLE_WORKER_AGENT=true`) | Pages Dashboard / `.env.local` |
| `VITE_GOOGLE_MAPS_API_KEY` | ❌ Optional | Public | ❌ | ❌ | ❌ | Google Maps API key for map view | Pages Dashboard / `.env.local` |
| `VITE_VAPID_PUBLIC_KEY` | ❌ Optional | Public | ❌ | ❌ | ❌ | VAPID public key for push notifications | Pages Dashboard / `.env.local` |
| `VITE_PUSH_ENDPOINT` | ❌ Optional | Public | ❌ | ❌ | ❌ | Push notification endpoint URL | Pages Dashboard / `.env.local` |
| `VITE_RUM_ENDPOINT` | ❌ Optional | Public | ❌ | ❌ | ❌ | Real User Monitoring endpoint | Pages Dashboard / `.env.local` |

### Setup Instructions

#### Local Development

1. Copy the example file:
   ```bash
   cd apps/pwa
   cp .env.example .env.local
   ```

2. Edit `.env.local` and fill in your values:
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. Restart your dev server:
   ```bash
   npm run dev
   ```

#### Cloudflare Pages (Preview/Production)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to: **Pages** → Your project → **Settings** → **Environment variables**
3. Add variables for each environment:
   - Select environment: **Preview** or **Production**
   - Add variable: `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
   - Add variable: `VITE_SUPABASE_ANON_KEY` = `your-anon-key-here`
   - (Optional) Add other `VITE_*` variables as needed
4. Save and redeploy

**Note:** Changes to environment variables require a new deployment to take effect.

---

## Worker/Edge Environment Variables (Server Secrets)

These variables are used in Cloudflare Workers and are **never exposed to the client**. They are loaded at runtime via the `env` parameter.

### Configuration Locations

| Environment | Configuration Method | Location |
|-------------|---------------------|----------|
| **Local Dev** | `.dev.vars` file | `worker/.dev.vars` |
| **Preview** | `wrangler secret put` or Dashboard | Cloudflare Dashboard → Workers → Secrets |
| **Production** | `wrangler secret put` or Dashboard | Cloudflare Dashboard → Workers → Secrets |

### Secrets (Encrypted)

These should **always** be set via `wrangler secret put` or Cloudflare Dashboard (never in `wrangler.toml`).

| Variable | Required | Type | Dev | Preview | Production | Description | Where Configured |
|----------|----------|------|-----|---------|------------|-------------|------------------|
| `OPENAI_API_KEY` | ✅ Yes | Secret | ✅ | ✅ | ✅ | OpenAI API key for GPT models | `wrangler secret put` / Dashboard |
| `SUPABASE_URL` | ✅ Yes | Secret | ✅ | ✅ | ✅ | Supabase project URL | `wrangler secret put` / Dashboard |
| `SUPABASE_ANON_KEY` | ✅ Yes | Secret | ✅ | ✅ | ✅ | Supabase anonymous key | `wrangler secret put` / Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ Optional | Secret | ❌ | ❌ | ❌ | Supabase service role key (admin operations) | `wrangler secret put` / Dashboard |
| `GEMINI_API_KEY` | ❌ Optional | Secret | ❌ | ❌ | ❌ | Google Gemini API key (optional geocoding) | `wrangler secret put` / Dashboard |
| `GOOGLE_MAPS_API_KEY` | ❌ Optional | Secret | ❌ | ❌ | ❌ | Google Maps API key (server-side ETA) | `wrangler secret put` / Dashboard |
| `SERPAPI_API_KEY` | ❌ Optional | Secret | ❌ | ❌ | ❌ | SerpAPI key (web search tools) | `wrangler secret put` / Dashboard |
| `OAUTH_CLIENT_SECRET` | ❌ Optional | Secret | ❌ | ❌ | ❌ | OAuth client secret (ChatGPT Apps) | `wrangler secret put` / Dashboard |
| `CRON_SECRET` | ❌ Optional | Secret | ❌ | ❌ | ❌ | Secret for authenticating cron jobs | `wrangler secret put` / Dashboard |

### Non-Secret Variables (Plain Text)

These can be set in `wrangler.toml` `[vars]` section or via Dashboard. They are not encrypted but also not sensitive.

| Variable | Required | Type | Default | Dev | Preview | Production | Description | Where Configured |
|----------|----------|------|---------|-----|---------|------------|-------------|------------------|
| `RATE_LIMIT_MAX_REQUESTS` | ❌ Optional | Plain | `100` | ⚠️ | ⚠️ | ⚠️ | Max requests per window | `wrangler.toml` `[vars]` / Dashboard |
| `RATE_LIMIT_WINDOW_SECONDS` | ❌ Optional | Plain | `60` | ⚠️ | ⚠️ | ⚠️ | Rate limit window (seconds) | `wrangler.toml` `[vars]` / Dashboard |
| `OAUTH_CLIENT_ID` | ❌ Optional | Plain | - | ❌ | ❌ | ❌ | OAuth client ID | `wrangler.toml` `[vars]` / Dashboard |
| `OAUTH_REDIRECT_URI` | ❌ Optional | Plain | - | ❌ | ❌ | ❌ | OAuth redirect URI | `wrangler.toml` `[vars]` / Dashboard |
| `OAUTH_AUTHORIZATION_URL` | ❌ Optional | Plain | - | ❌ | ❌ | ❌ | OAuth authorization URL | `wrangler.toml` `[vars]` / Dashboard |
| `OAUTH_TOKEN_URL` | ❌ Optional | Plain | - | ❌ | ❌ | ❌ | OAuth token URL | `wrangler.toml` `[vars]` / Dashboard |
| `WORKER_URL` | ❌ Optional | Plain | - | ❌ | ❌ | ❌ | Self-referential Worker URL | `wrangler.toml` `[vars]` / Dashboard |

### Setup Instructions

#### Local Development

1. Copy the example file:
   ```bash
   cd worker
   cp .dev.vars.example .dev.vars
   ```

2. Edit `.dev.vars` and fill in your values:
   ```bash
   OPENAI_API_KEY=sk-proj-your-key-here
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. Run worker locally:
   ```bash
   npm run dev
   ```

**Note:** `.dev.vars` is automatically git-ignored. Never commit actual secrets.

#### Cloudflare Workers (Preview/Production)

##### Setting Secrets

Use `wrangler secret put`:

```bash
cd worker

# Required secrets
wrangler secret put OPENAI_API_KEY
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY

# Optional secrets
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put GEMINI_API_KEY
wrangler secret put GOOGLE_MAPS_API_KEY
```

Or use Cloudflare Dashboard:
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to: **Workers & Pages** → Your worker → **Settings** → **Variables and Secrets**
3. Add secrets for each environment (Production/Preview)

##### Setting Non-Secret Variables

Edit `worker/wrangler.toml`:

```toml
[vars]
RATE_LIMIT_MAX_REQUESTS = "100"
RATE_LIMIT_WINDOW_SECONDS = "60"

[env.production.vars]
RATE_LIMIT_MAX_REQUESTS = "200"  # Higher limit for production
```

Or set via Cloudflare Dashboard (same location as secrets).

---

## Environment-Specific Values

### Development (Local)

| Category | Variable | Typical Value | Notes |
|----------|----------|---------------|-------|
| Frontend | `VITE_SUPABASE_URL` | `https://your-dev-project.supabase.co` | Dev Supabase project |
| Frontend | `VITE_SUPABASE_ANON_KEY` | `eyJhbG...` | Dev project anon key |
| Frontend | `VITE_WORKER_URL` | `http://localhost:8787` or empty | Local worker or disabled |
| Worker | `OPENAI_API_KEY` | `sk-proj-...` | Your OpenAI key |
| Worker | `SUPABASE_URL` | Same as frontend | Dev project |
| Worker | `SUPABASE_ANON_KEY` | Same as frontend | Dev project |

### Preview (Cloudflare Pages Preview Branches)

| Category | Variable | Typical Value | Notes |
|----------|----------|---------------|-------|
| Frontend | `VITE_SUPABASE_URL` | `https://your-preview-project.supabase.co` | Preview Supabase project (or same as dev) |
| Frontend | `VITE_SUPABASE_ANON_KEY` | `eyJhbG...` | Preview project anon key |
| Frontend | `VITE_WORKER_URL` | `https://your-worker-preview.workers.dev` | Preview worker URL |
| Worker | `OPENAI_API_KEY` | `sk-proj-...` | Same as production (or test key) |
| Worker | `SUPABASE_URL` | Same as frontend | Preview project |
| Worker | `SUPABASE_ANON_KEY` | Same as frontend | Preview project |

### Production

| Category | Variable | Typical Value | Notes |
|----------|----------|---------------|-------|
| Frontend | `VITE_SUPABASE_URL` | `https://your-prod-project.supabase.co` | Production Supabase project |
| Frontend | `VITE_SUPABASE_ANON_KEY` | `eyJhbG...` | Production project anon key |
| Frontend | `VITE_WORKER_URL` | `https://your-worker-prod.workers.dev` | Production worker URL |
| Worker | `OPENAI_API_KEY` | `sk-proj-...` | Production OpenAI key |
| Worker | `SUPABASE_URL` | Same as frontend | Production project |
| Worker | `SUPABASE_ANON_KEY` | Same as frontend | Production project |
| Worker | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | Production service role key |

---

## Security Best Practices

### ✅ DO

- ✅ Use `VITE_` prefix for all client-side variables
- ✅ Keep secrets in `.dev.vars` (git-ignored) for local dev
- ✅ Use `wrangler secret put` for Worker secrets in production
- ✅ Use separate Supabase projects for dev/preview/production
- ✅ Rotate secrets regularly
- ✅ Use `.env.example` files (no secrets) for documentation

### ❌ DON'T

- ❌ Commit `.env.local`, `.dev.vars`, or any file with secrets
- ❌ Put secrets in `wrangler.toml` (use `wrangler secret put` instead)
- ❌ Expose service role keys to the client
- ❌ Use production secrets in development
- ❌ Hardcode API keys in source code

---

## Troubleshooting

### Frontend Variables Not Working

**Problem:** `import.meta.env.VITE_*` returns `undefined`

**Solutions:**
1. Check variable name starts with `VITE_`
2. Restart dev server after changing `.env.local`
3. Verify file is named `.env.local` (not `.env`)
4. For production: Ensure variables are set in Cloudflare Pages Dashboard and redeploy

### Worker Secrets Not Loading

**Problem:** `env.OPENAI_API_KEY` is undefined

**Solutions:**
1. Check secrets are set: `wrangler secret list`
2. Verify you're using the correct environment: `wrangler secret put --env production`
3. For local dev: Ensure `.dev.vars` exists and has the variable
4. Redeploy worker after adding secrets

### Environment Variable Conflicts

**Problem:** Variables work locally but not in production

**Solutions:**
1. Check environment-specific settings in Cloudflare Dashboard
2. Verify variable names match exactly (case-sensitive)
3. Ensure Preview/Production environments have their own variables set
4. Check for typos in variable names

---

## Reference Files

- **Frontend example**: `.env.example` (root) and `apps/pwa/.env.example`
- **Worker example**: `worker/.dev.vars.example` and `services/agent-runtime/.dev.vars.example`
- **Worker config**: `worker/wrangler.toml` and `services/agent-runtime/wrangler.toml`
- **Git ignore**: `.gitignore` (ensures env files aren't committed)

---

## Quick Reference

### Local Development Setup

```bash
# Frontend
cd apps/pwa
cp .env.example .env.local
# Edit .env.local with your values

# Worker
cd worker
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your secrets
```

### Production Deployment

```bash
# Set Worker secrets
cd worker
wrangler secret put OPENAI_API_KEY --env production
wrangler secret put SUPABASE_URL --env production
wrangler secret put SUPABASE_ANON_KEY --env production

# Frontend: Set variables in Cloudflare Pages Dashboard
# Go to: Pages → Settings → Environment variables → Production
```

---

**Last Updated:** 2025-01-27

