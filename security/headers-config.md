# Security Headers

The live headers are defined in `public/_headers`. Highlights:

- `Content-Security-Policy` with `default-src 'self'` and scoped allowances for Supabase.
- `Permissions-Policy` limits geo/camera/mic to self.
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: SAMEORIGIN`

If new third-party services are added, update `connect-src` in CSP and validate
with browser DevTools.
