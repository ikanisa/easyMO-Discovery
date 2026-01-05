# Cloudflare Deployment Summary

**Date:** 2025-01-29  
**Deployment Shape:** **Option C - Pages (frontend) + Workers (separate API)**  
**Status:** ✅ **Production-Ready**

---

## Quick Start

### 1. Set Up Cloudflare Pages Project

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages
2. Create new project: **discovery**
3. Connect GitHub repository
4. Configure:
   - **Production branch**: `main`
   - **Root directory**: `apps/pwa`
   - **Build command**: `pnpm run build`
   - **Output directory**: `dist`
   - **Node version**: `20`

### 2. Set Environment Variables

**In Cloudflare Pages Dashboard:**
- Settings → Environment variables → Production
- Add all `VITE_*` variables (see `apps/pwa/.env.example`)

### 3. Deploy Worker

```bash
cd services/agent-runtime

# Set secrets
wrangler secret put OPENAI_API_KEY --env production
wrangler secret put SUPABASE_URL --env production
wrangler secret put SUPABASE_ANON_KEY --env production

# Deploy
wrangler deploy --env production
```

### 4. Configure GitHub Secrets

**In GitHub Repository Settings → Secrets:**
- `CLOUDFLARE_API_TOKEN` - API token with Pages/Workers permissions
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID
- `VITE_SUPABASE_URL` - (optional, can use Pages Dashboard)
- `VITE_SUPABASE_ANON_KEY` - (optional, can use Pages Dashboard)
- `VITE_WORKER_URL` - (optional, can use Pages Dashboard)

### 5. Deploy

**Automatic (via CI/CD):**
- Push to `main` → Auto-deploys Pages + Worker

**Manual:**
```bash
# Deploy Pages
cd apps/pwa
pnpm run build
wrangler pages deploy dist --project-name discovery

# Deploy Worker
cd services/agent-runtime
wrangler deploy --env production
```

---

## Configuration Files

### Pages Configuration

- **`_redirects`**: `apps/pwa/public/_redirects` → SPA routing
- **`_headers`**: `apps/pwa/public/_headers` → Security headers
- **`404.html`**: `apps/pwa/public/404.html` → 404 page

### Worker Configuration

- **`wrangler.toml`**: `services/agent-runtime/wrangler.toml`
- **Compatibility date**: `2025-01-27`
- **Node.js compat**: Enabled (for OpenAI SDK)

---

## Documentation

- **[Cloudflare Readiness Audit](./cloudflare-readiness.md)** - Complete audit and checklist
- **[SPA Routing](./cloudflare-pages-routing.md)** - How routing works
- **[Security Headers](./security-headers.md)** - CSP and security configuration
- **[Workers Runtime](./workers-runtime.md)** - Worker configuration
- **[CI/CD Pipeline](./cicd.md)** - Deployment automation
- **[Environment Variables](../env-matrix.md)** - Complete env var matrix

---

## Verification Checklist

- [ ] Pages project created in Cloudflare Dashboard
- [ ] Environment variables set in Pages Dashboard
- [ ] Worker secrets set via `wrangler secret put`
- [ ] Worker deployed successfully
- [ ] Pages deployed successfully
- [ ] SPA routing works (test deep links)
- [ ] Security headers present (check DevTools)
- [ ] PWA installs correctly
- [ ] Service worker registers
- [ ] Offline functionality works

---

**Last Updated:** 2025-01-29

