# Deployment Notes

## Why it was blank
- The app was sometimes served an older `index.html` from a cached service worker, which referenced a different React build than the current JS bundle.
- React and ReactDOM versions were mixed previously (CDN/importmap vs node_modules), triggering React error #527 and halting rendering.
- Tailwind styles were loaded from a CDN in legacy markup, so builds and caches could diverge from the Vite bundle.

## How to deploy safely (Cloudflare Pages)
- Ensure `npm run build` completes with no runtime errors and the output is in `dist/`.
- Verify `_redirects` and `_headers` are present in `dist/` (Vite copies from `public/`).
- Confirm `index.html` is not cached (use `Cache-Control: no-cache`) and `/assets/*` is long-lived.
- Deploy with `wrangler pages deploy dist --project-name easymo-discovery`.
- If users see a blank page after deploy, hard-refresh and unregister the service worker to clear stale caches.
