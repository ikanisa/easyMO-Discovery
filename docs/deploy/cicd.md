# CI/CD Pipeline for Cloudflare Deployment

**Last Updated:** 2025-01-29

---

## Overview

This document describes the CI/CD pipeline for deploying the easyMO Discovery application to Cloudflare Pages (frontend) and Cloudflare Workers (backend).

**Deployment Shape:** Option C - Pages (frontend) + Workers (separate API)

---

## Pipeline Architecture

### Workflow Files

1. **`.github/workflows/ci.yml`** - Pre-deployment checks (lint, test, build)
2. **`.github/workflows/deploy-cloudflare.yml`** - Cloudflare deployment
3. **`.github/workflows/lighthouse-ci.yml`** - Performance auditing

### Deployment Flow

```
┌─────────────────┐
│  Push to main   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   CI Checks     │
│ (lint, test)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Build PWA      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌─────────────────┐
│ Deploy Worker   │      │ Deploy Pages    │
│ (separate API)  │      │ (frontend)      │
└─────────────────┘      └─────────────────┘
```

---

## Production Branch

**Branch:** `main`

**Deployment Trigger:**
- Push to `main` → Deploy to production
- Pull request → Deploy to preview

**Configuration:**
- Set in Cloudflare Pages Dashboard: Settings → Builds & deployments → Production branch

---

## Preview Deployments

### Automatic Preview Deployments

**Trigger:** Pull requests to `main`

**Behavior:**
- Cloudflare Pages automatically creates preview deployments for PRs
- Preview URL: `https://<project-name>-<pr-number>.pages.dev`
- Uses preview environment variables (if configured)

### Manual Preview Deployments

**Via GitHub Actions:**
```bash
# Triggered on PRs
gh workflow run deploy-cloudflare.yml
```

**Via Wrangler:**
```bash
cd apps/pwa
pnpm run build
wrangler pages deploy dist --project-name discovery
```

---

## Deployment Workflow

### Step 1: Pre-Deployment Checks

**Workflow:** `.github/workflows/ci.yml`

**Jobs:**
1. **Lint and Type Check**
   - Linting
   - TypeScript type checking

2. **Security Checks**
   - Dependency vulnerability scanning
   - Secrets scanning
   - OWASP checks

3. **Tests**
   - Unit tests
   - Integration tests
   - Coverage upload

4. **E2E Tests**
   - Playwright tests
   - Multiple browsers/devices
   - Test artifacts

5. **Build Verification**
   - Build PWA
   - Build Worker
   - Bundle size checks

**Status:** All jobs must pass before deployment

### Step 2: Deploy Worker

**Workflow:** `.github/workflows/deploy-cloudflare.yml` → `deploy-worker` job

**Steps:**
1. Checkout code
2. Setup Node.js 20
3. Install pnpm
4. Install dependencies
5. Deploy Worker: `wrangler deploy --env production`

**Secrets Required:**
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

**Worker Secrets:**
- Set via `wrangler secret put` (not in workflow)
- Or via Cloudflare Dashboard

### Step 3: Deploy Pages

**Workflow:** `.github/workflows/deploy-cloudflare.yml` → `deploy-pages` job

**Steps:**
1. Checkout code
2. Setup Node.js 20
3. Install pnpm
4. Install dependencies
5. Build PWA: `pnpm run build --workspace=apps/pwa`
6. Deploy to Cloudflare Pages: `cloudflare/pages-action@v1`

**Secrets Required:**
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `GITHUB_TOKEN` (for PR comments)

**Environment Variables:**
- Set in Cloudflare Pages Dashboard
- Or via workflow secrets (for build-time vars)

---

## Required GitHub Secrets

### Cloudflare Secrets

| Secret | Description | Where to Get |
|--------|-------------|--------------|
| `CLOUDFLARE_API_TOKEN` | API token with Pages/Workers permissions | Cloudflare Dashboard → My Profile → API Tokens |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID | Cloudflare Dashboard → Right sidebar |

### Frontend Build Secrets (Optional)

| Secret | Description | Usage |
|--------|-------------|-------|
| `VITE_SUPABASE_URL` | Supabase project URL | Build-time env var |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Build-time env var |
| `VITE_WORKER_URL` | Worker URL | Build-time env var |

**Note:** These can also be set in Cloudflare Pages Dashboard (recommended).

### Preview Environment Secrets (Optional)

| Secret | Description | Usage |
|--------|-------------|-------|
| `VITE_SUPABASE_URL_PREVIEW` | Preview Supabase URL | Preview deployments |
| `VITE_SUPABASE_ANON_KEY_PREVIEW` | Preview Supabase key | Preview deployments |
| `VITE_WORKER_URL_PREVIEW` | Preview Worker URL | Preview deployments |

---

## Direct Upload Deployment

### When to Use

**Use Direct Upload if:**
- Monorepo with custom build steps
- Need more control over build process
- Want to use custom CI/CD logic

**Current Implementation:**
- Uses `cloudflare/pages-action@v1` (recommended)
- Supports monorepo via `directory` parameter

### Alternative: Wrangler Direct Upload

```yaml
- name: Deploy to Cloudflare Pages
  run: |
    cd apps/pwa
    pnpm run build
    wrangler pages deploy dist --project-name discovery
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

---

## Rollback Procedure

### Pages Rollback

**Via Cloudflare Dashboard:**
1. Go to Pages project → Deployments
2. Find previous deployment
3. Click "..." → "Retry deployment"
4. Or "Promote to production"

**Via Wrangler:**
```bash
# List deployments
wrangler pages deployment list --project-name discovery

# Rollback to specific deployment
wrangler pages deployment rollback <deployment-id> --project-name discovery
```

### Worker Rollback

**Via Cloudflare Dashboard:**
1. Go to Workers & Pages → Workers
2. Select worker
3. Go to Versions tab
4. Rollback to previous version

**Via Wrangler:**
```bash
# List versions
wrangler versions list

# Rollback to previous version
wrangler versions rollback <version-id>
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All CI checks passing
- [ ] Environment variables set in Cloudflare Dashboard
- [ ] Worker secrets set via `wrangler secret put`
- [ ] Build tested locally: `pnpm run build --workspace=apps/pwa`
- [ ] Worker tested locally: `wrangler dev`

### Deployment

- [ ] Worker deployed: `wrangler deploy --env production`
- [ ] Worker URL verified
- [ ] Pages deployed (via Dashboard or CI/CD)
- [ ] Preview deployment tested (if PR)

### Post-Deployment

- [ ] Smoke test: Fresh load + hard refresh
- [ ] Test SPA routing (deep links)
- [ ] Test auth flow
- [ ] Test core features
- [ ] Verify PWA installation
- [ ] Check error monitoring (Sentry)
- [ ] Verify performance metrics

---

## Monitoring & Alerts

### Deployment Notifications

**GitHub Actions:**
- Deployment status in PR comments
- Deployment URL in PR comments
- Failure notifications (if configured)

**Cloudflare Dashboard:**
- Deployment history
- Deployment status
- Build logs

### Error Monitoring

**Sentry:**
- Frontend errors (if `VITE_SENTRY_DSN` configured)
- Worker errors (if Sentry SDK added to Worker)

**Cloudflare Logs:**
- Worker logs via `wrangler tail`
- Pages logs via Cloudflare Dashboard

---

## Troubleshooting

### Issue: Deployment Fails

**Symptoms:** GitHub Actions workflow fails

**Solutions:**
1. Check build logs in GitHub Actions
2. Verify environment variables are set
3. Check Node.js version matches (20)
4. Verify pnpm lockfile is up to date

### Issue: Worker Deployment Fails

**Symptoms:** `wrangler deploy` fails

**Solutions:**
1. Check `wrangler.toml` configuration
2. Verify secrets are set: `wrangler secret list`
3. Check compatibility date is valid
4. Verify bundle size is within limits

### Issue: Pages Deployment Fails

**Symptoms:** Pages deployment fails or returns errors

**Solutions:**
1. Check build output includes `dist/` directory
2. Verify `_redirects` and `_headers` are in output
3. Check environment variables in Pages Dashboard
4. Verify root directory is set correctly (`apps/pwa`)

---

## Best Practices

### 1. Always Test in Preview First

- Use preview deployments for PRs
- Test thoroughly before merging
- Verify environment variables work

### 2. Monitor Deployments

- Check deployment status
- Monitor error rates
- Review performance metrics

### 3. Keep Secrets Secure

- Never commit secrets to git
- Use GitHub Secrets for CI/CD
- Use `wrangler secret put` for Workers
- Use Cloudflare Dashboard for Pages

### 4. Document Changes

- Update deployment docs when changing workflow
- Document new environment variables
- Note any breaking changes

---

## References

- [Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/platform/deploy-with-direct-upload/)
- [GitHub Actions for Cloudflare](https://github.com/cloudflare/pages-action)
- [Wrangler Deployment](https://developers.cloudflare.com/workers/wrangler/commands/#deploy)

---

**Last Updated:** 2025-01-29

