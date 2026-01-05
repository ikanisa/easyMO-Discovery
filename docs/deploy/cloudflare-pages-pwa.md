# Cloudflare Pages PWA Deployment

This guide covers deploying the easyMO Discovery PWA to Cloudflare Pages.

## Cloudflare Pages Configuration

### Project Settings

| Setting | Value |
|---------|-------|
| **Root directory** | `apps/pwa` |
| **Build command** | `npm ci && npm run build` |
| **Build output directory** | `dist` |
| **Node.js version** | 18.x or 20.x |

### Required Environment Variables

Add these in **Settings → Environment Variables** for **Production**:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL (e.g., `https://xxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |

> **Important**: The build will fail if these variables are not set. This is intentional to prevent deploying broken apps.

## How Environment Variables Work

1. **Build time**: `verify-public-env.mjs` checks that all required env vars exist
2. **Build output**: `generate-env.mjs` writes `dist/env.js` with runtime config
3. **Runtime**: The app loads `env.js` before the main bundle
4. **Fallback**: If Vite injection fails, `window.__APP_ENV__` provides values

## Troubleshooting

### Blank Page in Production

1. Check browser console for errors
2. Verify `env.js` exists in deployed output
3. Confirm environment variables are set in Cloudflare dashboard
4. Trigger a redeploy after adding/changing env vars

### "Configuration Missing" Screen

This means the app loaded but env vars are not set. Check:
- Cloudflare Pages environment variables
- That you redeployed after adding variables

### Stale Cache Issues

The `_headers` file ensures `index.html` and `env.js` are never cached. If issues persist:
1. Clear your browser cache
2. Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
3. The service worker will auto-update on next visit

## Caching Strategy

| Path | Cache Policy | Reason |
|------|--------------|--------|
| `/index.html` | `no-store` | Always fresh |
| `/env.js` | `no-store` | Runtime config |
| `/service-worker.js` | `no-store` | SW updates |
| `/assets/*` | 1 year, immutable | Hashed filenames |

## CI/CD Integration

For automated deployments, ensure your CI pipeline:

1. Sets environment variables before build
2. Runs from the monorepo root or `apps/pwa` directory
3. Uses `npm ci && npm run build` as the build command

Example GitHub Actions:
```yaml
env:
  VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```
