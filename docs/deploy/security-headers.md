# Cloudflare Pages Security Headers Configuration

This document explains the security headers configured for easyMO Discovery on Cloudflare Pages and how to safely tune the Content Security Policy (CSP) for different environments.

## Overview

Security headers are configured in `apps/pwa/public/_headers`. This file is automatically copied to `apps/pwa/dist/_headers` during the Vite build process. Cloudflare Pages reads this file and applies the headers to all static file responses.

**⚠️ Important:** The `_headers` file **only applies to static files**. If you use:
- **Pages Functions** (files in `functions/` directory)
- **Advanced `_worker.js` mode** (a `_worker.js` file in the output directory)

Then you must **also set headers in your function/worker code**, as the `_headers` file will not apply to function responses.

## Current Headers

### Security Headers (All Routes)

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `SAMEORIGIN` | Prevents clickjacking attacks by controlling embedding |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing attacks |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS protection (still useful for older browsers) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer information sent with requests |
| `Permissions-Policy` | `geolocation=(self), camera=(self), microphone=(), payment=(self)` | Restricts browser features to specified origins |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Forces HTTPS connections (HSTS) |
| `Content-Security-Policy` | See CSP section below | Restricts resource loading to prevent XSS and injection attacks |

### Caching Headers

| Path Pattern | Cache-Control | Reason |
|--------------|---------------|--------|
| `/index.html` | `no-store, no-cache, must-revalidate` | HTML must always be fresh for updates |
| `/service-worker.js` | `no-store, no-cache` | Service worker must be fresh to pick up changes |
| `/manifest.webmanifest` | `public, max-age=3600` | Can be cached for 1 hour |
| `/assets/*` | `public, max-age=31536000, immutable` | Hashed filenames = safe to cache forever |
| `/icons/*`, `/*.png`, etc. | `public, max-age=86400` | Images cached for 1 day |

## Content Security Policy (CSP)

The CSP is the most important and complex security header. It controls what resources (scripts, styles, images, connections, etc.) can be loaded by your application.

### Current CSP Breakdown

```http
Content-Security-Policy: 
  default-src 'self';
  base-uri 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  font-src 'self' data: https:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.workers.dev https://maps.googleapis.com;
  frame-src 'none';
  object-src 'none';
  worker-src 'self' blob:;
  manifest-src 'self'
```

**Directive Explanations:**

- **`default-src 'self'`**: By default, only load resources from the same origin
- **`base-uri 'self'`**: Restrict `<base>` tag to same origin
- **`script-src`**: Allow scripts from:
  - `'self'` - Same origin
  - `'unsafe-inline'` - Inline scripts (needed for Vite/React)
  - `'unsafe-eval'` - `eval()` usage (needed for some React features)
  - `https://maps.googleapis.com` - Google Maps JavaScript API
- **`style-src`**: Allow styles from:
  - `'self'` - Same origin
  - `'unsafe-inline'` - Inline styles (needed for Tailwind CSS)
- **`img-src`**: Allow images from:
  - `'self'` - Same origin
  - `data:` - Data URIs (for inline images)
  - `blob:` - Blob URLs (for generated images)
  - `https:` - Any HTTPS URL (for external images)
- **`font-src`**: Allow fonts from:
  - `'self'` - Same origin
  - `data:` - Data URIs
  - `https:` - External font CDNs
- **`connect-src`**: Allow connections (fetch, XHR, WebSocket) to:
  - `'self'` - Same origin
  - `https://*.supabase.co` - Supabase API and Realtime
  - `wss://*.supabase.co` - Supabase WebSocket connections
  - `https://*.workers.dev` - Cloudflare Workers
  - `https://maps.googleapis.com` - Google Maps API
- **`frame-src 'none'`**: Block all iframes
- **`object-src 'none'`**: Block plugins (Flash, etc.)
- **`worker-src 'self' blob:`**: Allow service workers from same origin and blob URLs
- **`manifest-src 'self'`**: PWA manifest from same origin only

### Required Sources by Feature

| Feature | Required CSP Directives | Notes |
|---------|------------------------|-------|
| **Vite/React** | `script-src 'unsafe-inline' 'unsafe-eval'` | Vite uses inline scripts and eval |
| **Tailwind CSS** | `style-src 'unsafe-inline'` | Tailwind generates inline styles |
| **Supabase** | `connect-src https://*.supabase.co wss://*.supabase.co` | API and Realtime connections |
| **Cloudflare Workers** | `connect-src https://*.workers.dev` | Worker API endpoints |
| **Google Maps** | `script-src https://maps.googleapis.com`, `connect-src https://maps.googleapis.com` | Maps JavaScript API |
| **PWA/Service Worker** | `worker-src 'self' blob:` | Service worker registration |
| **External Images** | `img-src https:` | Allow external image URLs |

## Tuning CSP for Different Environments

### Development (Local)

For local development, you might want to relax CSP to avoid blocking issues:

```http
# More permissive for development
Content-Security-Policy: 
  default-src 'self' 'unsafe-inline' 'unsafe-eval';
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.workers.dev https://maps.googleapis.com http://localhost:* ws://localhost:*;
  img-src 'self' data: blob: https: http:;
  font-src 'self' data: https: http:;
```

**Changes:**
- Added `'unsafe-inline' 'unsafe-eval'` to `default-src` for easier debugging
- Added `http://localhost:*` and `ws://localhost:*` to `connect-src` for local dev servers
- Added `http:` to `img-src` and `font-src` for local assets

**⚠️ Warning:** Never use relaxed CSP in production!

### Preview/Staging

Use the same CSP as production but consider:

```http
# Add monitoring/analytics domains if needed
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.workers.dev https://maps.googleapis.com https://your-analytics-domain.com;
```

### Production

Use the strict CSP from `_headers`. Only add additional sources if absolutely necessary.

## Adding New Services

When adding a new third-party service, update the CSP:

### Step 1: Identify Required Resources

Determine what type of resources the service needs:

- **JavaScript**: Add to `script-src`
- **Stylesheets**: Add to `style-src`
- **API calls**: Add to `connect-src`
- **Images**: Add to `img-src`
- **Fonts**: Add to `font-src`
- **Frames/iframes**: Add to `frame-src` (if you need them)

### Step 2: Update `_headers`

Add the domain to the appropriate directive:

```http
# Example: Adding Sentry for error tracking
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.workers.dev https://maps.googleapis.com https://*.sentry.io;
```

### Step 3: Test

1. **Build and deploy** to a preview environment
2. **Open browser DevTools** → Console
3. **Look for CSP violations** in the console (they'll show as errors)
4. **Fix any violations** by updating the CSP

### Common New Service Patterns

#### Analytics (e.g., Google Analytics, Plausible)

```http
# For analytics that load via script tag
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://www.googletagmanager.com;
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.workers.dev https://maps.googleapis.com https://www.google-analytics.com;
```

#### Error Tracking (e.g., Sentry)

```http
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.workers.dev https://maps.googleapis.com https://*.sentry.io;
```

#### CDN for Static Assets

```http
img-src 'self' data: blob: https: https://cdn.example.com;
font-src 'self' data: https: https://cdn.example.com;
```

#### Real User Monitoring (RUM)

```http
# If you add RUM endpoint
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.workers.dev https://maps.googleapis.com https://your-rum-endpoint.com;
```

## Testing CSP

### Browser DevTools

1. Open DevTools (F12)
2. Go to **Console** tab
3. Look for CSP violation errors (they look like):
   ```
   Refused to load the script 'https://example.com/script.js' because it violates 
   the following Content Security Policy directive: "script-src 'self'".
   ```
4. Update CSP in `_headers` and redeploy

### Online CSP Evaluators

- [CSP Evaluator](https://csp-evaluator.withgoogle.com/) - Google's CSP evaluation tool
- [Content-Security-Policy.com](https://content-security-policy.com/) - CSP reference and testing

### Manual Testing Checklist

- [ ] App loads correctly
- [ ] All scripts execute
- [ ] Styles apply correctly
- [ ] Images load
- [ ] Fonts load
- [ ] API calls work (Supabase, Workers)
- [ ] WebSocket connections work (Supabase Realtime)
- [ ] Google Maps loads (if enabled)
- [ ] Service worker registers
- [ ] No CSP violations in console

## Removing 'unsafe-inline' and 'unsafe-eval'

The current CSP uses `'unsafe-inline'` and `'unsafe-eval'` which reduce security. To remove them:

### 1. Remove 'unsafe-inline' from script-src

**Current:**
```http
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com;
```

**Improved (using nonces):**
```http
script-src 'self' 'nonce-{random-nonce}' 'strict-dynamic' https://maps.googleapis.com;
```

**Implementation:**
- Generate a random nonce per request
- Add `nonce="..."` attribute to all inline scripts
- Use `'strict-dynamic'` to allow scripts loaded by trusted scripts

**⚠️ Note:** This requires server-side rendering or a Pages Function to inject nonces.

### 2. Remove 'unsafe-eval'

**Current:**
```http
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com;
```

**Improved:**
```http
script-src 'self' 'unsafe-inline' https://maps.googleapis.com;
```

**Testing:**
- Remove `'unsafe-eval'`
- Test the app thoroughly
- If errors occur, identify what code uses `eval()` or `Function()` constructor
- Consider alternatives (webpack configuration, code refactoring)

**⚠️ Note:** React and some build tools may require `'unsafe-eval'`. Test carefully.

### 3. Remove 'unsafe-inline' from style-src

**Current:**
```http
style-src 'self' 'unsafe-inline';
```

**Improved (using nonces):**
```http
style-src 'self' 'nonce-{random-nonce}';
```

**Implementation:**
- Similar to script nonces
- Add nonce to inline `<style>` tags

**⚠️ Note:** Tailwind CSS generates inline styles. You may need to extract critical CSS or use a different approach.

## Pages Functions / Workers

If you use Pages Functions or a `_worker.js` file, you must set headers in your function code because `_headers` only applies to static files.

### Example: Setting Headers in Pages Function

```typescript
// functions/api/hello.ts
export async function onRequest(context) {
  const response = await context.next();
  
  // Add security headers
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'"
  );
  
  return response;
}
```

### Example: Setting Headers in Worker

```typescript
// _worker.js
export default {
  async fetch(request, env) {
    const response = await fetch(request);
    
    // Clone response to modify headers
    const newResponse = new Response(response.body, response);
    
    // Add security headers
    newResponse.headers.set('X-Frame-Options', 'SAMEORIGIN');
    newResponse.headers.set('X-Content-Type-Options', 'nosniff');
    
    return newResponse;
  }
};
```

## Troubleshooting

### CSP Violations in Console

**Problem:** Browser console shows CSP violation errors.

**Solution:**
1. Identify the blocked resource from the error message
2. Add the domain to the appropriate CSP directive
3. Rebuild and redeploy

### Styles Not Loading

**Problem:** Tailwind CSS styles don't apply.

**Possible causes:**
- Missing `'unsafe-inline'` in `style-src`
- CSP too restrictive

**Solution:** Ensure `style-src 'self' 'unsafe-inline'` is in CSP.

### Scripts Not Executing

**Problem:** JavaScript doesn't run.

**Possible causes:**
- Missing `'unsafe-inline'` or `'unsafe-eval'` in `script-src`
- External script domain not allowed

**Solution:**
- For Vite/React: Keep `'unsafe-inline' 'unsafe-eval'` (or use nonces)
- For external scripts: Add domain to `script-src`

### API Calls Failing

**Problem:** Fetch/XHR requests return errors or are blocked.

**Possible causes:**
- Domain not in `connect-src`
- WebSocket connections need `wss://` explicitly

**Solution:** Add domain to `connect-src`:
```http
connect-src 'self' https://your-api-domain.com wss://your-api-domain.com;
```

### Service Worker Not Registering

**Problem:** Service worker fails to register.

**Possible causes:**
- `worker-src` too restrictive
- Missing `blob:` for service workers

**Solution:** Ensure `worker-src 'self' blob:` is in CSP.

## References

- [Cloudflare Pages Headers Documentation](https://developers.cloudflare.com/pages/configuration/headers/)
- [MDN Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy)
- [CSP Evaluator (Google)](https://csp-evaluator.withgoogle.com/)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [HSTS Preload List](https://hstspreload.org/)

## File Locations

- **Headers configuration**: `apps/pwa/public/_headers`
- **Deployed to**: `apps/pwa/dist/_headers` (automatic via Vite)
- **Documentation**: `docs/deploy/security-headers.md` (this file)

