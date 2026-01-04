# Release Runbook

## Pre-flight
- Confirm env vars in Cloudflare Pages (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- Run `npm ci` and `npm run build`.
- Run `npm run preview` and sanity check critical flows.

## Deploy
- `npm run pages:deploy`
- Verify latest deployment URL and custom domain.

## Post-deploy
- Hard refresh on mobile (or clear site data) to ensure SW update.
- Verify:
  - App loads and renders.
  - Install prompt is available on supported devices.
  - Offline mode shows cached shell.
  - New service worker activates without stale HTML.

## Rollback
- Re-deploy previous known-good build from CI artifacts.
- Invalidate cache if required (Cloudflare cache purge).
