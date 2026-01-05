# Security Headers Configuration

**Last Updated:** 2025-01-29

---

## Overview

This document describes the security headers configuration for the easyMO Discovery PWA on Cloudflare Pages and how to tune the Content Security Policy (CSP) per environment.

---

## Current Configuration

**Location:** `apps/pwa/public/_headers`

The `_headers` file is automatically copied to `dist/` during build and applied by Cloudflare Pages to all static file responses.

**Important:** Headers in `_headers` only apply to static files. If you use Pages Functions or `_worker.js`, you must set headers in your function code.

---

## Security Headers Explained

### 1. X-Frame-Options

```
X-Frame-Options: SAMEORIGIN
```

**Purpose:** Prevents clickjacking attacks  
**Value:** `SAMEORIGIN` allows embedding on same origin (useful for iframes)  
**Alternative:** `DENY` if you never embed the app

### 2. X-Content-Type-Options

```
X-Content-Type-Options: nosniff
```

**Purpose:** Prevents MIME type sniffing  
**Value:** `nosniff` forces browsers to respect declared content types

### 3. X-XSS-Protection

```
X-XSS-Protection: 1; mode=block
```

**Purpose:** Legacy XSS protection (modern browsers have better protection)  
**Note:** Still useful for older browsers

### 4. Referrer-Policy

```
Referrer-Policy: strict-origin-when-cross-origin
```

**Purpose:** Controls referrer information sent with requests  
**Value:** Sends full URL for same-origin, origin only for cross-origin HTTPS

### 5. Permissions-Policy

```
Permissions-Policy: geolocation=(self), camera=(self), microphone=(), payment=(self)
```

**Purpose:** Controls which browser features can be used  
**Current:** Allows geolocation, camera, and payment for same origin; blocks microphone

**Tuning:**
- `geolocation=(self)` - App needs location for discovery features
- `camera=(self)` - App needs camera for QR scanning
- `microphone=()` - App doesn't use microphone
- `payment=(self)` - App may use payment APIs

### 6. Strict-Transport-Security (HSTS)

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

**Purpose:** Forces HTTPS connections  
**Warning:** Only enable if all subdomains are HTTPS-ready  
**Current:** Enabled with 2-year max-age

**Recommendation:** Start with shorter max-age (e.g., `max-age=31536000`) until you're confident all subdomains support HTTPS.

### 7. Content-Security-Policy (CSP)

```
Content-Security-Policy: default-src 'self'; base-uri 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.workers.dev https://maps.googleapis.com https://*.sentry.io; frame-src 'none'; object-src 'none'; worker-src 'self' blob:; manifest-src 'self'; upgrade-insecure-requests
```

**Purpose:** Primary defense against XSS attacks  
**Complexity:** Most complex header, requires careful tuning

---

## CSP Directive Breakdown

### default-src 'self'
- Default source for all resource types
- Only allows resources from same origin

### base-uri 'self'
- Restricts `<base>` tag URLs
- Prevents base tag injection attacks

### script-src
```
'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com
```
- **'self'**: Scripts from same origin
- **'unsafe-inline'**: Required for Vite HMR and some libraries
- **'unsafe-eval'**: Required for Vite dev server and some libraries
- **https://maps.googleapis.com**: Google Maps API

**⚠️ Security Note:** `'unsafe-inline'` and `'unsafe-eval'` reduce security. Consider:
- Using nonces for inline scripts (requires build-time generation)
- Removing `'unsafe-eval'` if not needed in production
- Testing thoroughly after removing unsafe directives

### style-src
```
'self' 'unsafe-inline'
```
- **'self'**: Styles from same origin
- **'unsafe-inline'**: Required for Tailwind CSS and component styles

**Note:** Removing `'unsafe-inline'` requires using nonces or hashes, which is complex with Tailwind.

### img-src
```
'self' data: blob: https:
```
- **'self'**: Images from same origin
- **data:**: Data URLs (for inline images)
- **blob:**: Blob URLs (for generated images)
- **https:****: All HTTPS images (for external images)

**Tuning:** If you only use specific image CDNs, replace `https:` with specific domains:
```
img-src 'self' data: blob: https://cdn.example.com https://images.unsplash.com
```

### font-src
```
'self' data: https:
```
- **'self'**: Fonts from same origin
- **data:**: Data URLs (for inline fonts)
- **https:****: All HTTPS fonts

**Note:** App uses system fonts, so external fonts may not be needed.

### connect-src
```
'self' https://*.supabase.co wss://*.supabase.co https://*.workers.dev https://maps.googleapis.com https://*.sentry.io
```
- **'self'**: API calls to same origin
- **https://*.supabase.co**: Supabase API (REST)
- **wss://*.supabase.co**: Supabase WebSocket (realtime)
- **https://*.workers.dev**: Cloudflare Worker API
- **https://maps.googleapis.com**: Google Maps API
- **https://*.sentry.io**: Sentry error tracking

**Tuning:** Add specific domains as needed:
- RUM endpoint: `https://your-rum-endpoint.com`
- Logging endpoint: `https://your-log-endpoint.com`
- Other APIs: Add specific domains

### frame-src 'none'
- Blocks all iframes
- Prevents clickjacking

**Tuning:** If you embed content, allow specific sources:
```
frame-src 'self' https://chat.openai.com
```

### object-src 'none'
- Blocks plugins (Flash, etc.)
- Modern browsers don't use plugins, so this is safe

### worker-src
```
'self' blob:
```
- **'self'**: Service workers from same origin
- **blob:****: Blob URLs for service workers

### manifest-src 'self'
- PWA manifest from same origin

### upgrade-insecure-requests
- Automatically upgrades HTTP to HTTPS
- Useful for mixed content scenarios

---

## Environment-Specific CSP Tuning

### Development

**Relaxed CSP for HMR:**
```apache
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.workers.dev https://maps.googleapis.com http://localhost:* ws://localhost:*; img-src 'self' data: blob: https:; font-src 'self' data: https:; frame-src 'none'; object-src 'none'; worker-src 'self' blob:; manifest-src 'self'
```

**Changes:**
- Added `http://localhost:*` and `ws://localhost:*` to `connect-src` for Vite HMR

### Preview

**Production-like CSP:**
Use the same CSP as production, but test thoroughly.

### Production

**Strict CSP:**
```apache
Content-Security-Policy: default-src 'self'; base-uri 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.workers.dev https://maps.googleapis.com https://*.sentry.io; frame-src 'none'; object-src 'none'; worker-src 'self' blob:; manifest-src 'self'; upgrade-insecure-requests
```

**Future Enhancement:** Consider removing `'unsafe-eval'` if not needed:
1. Test thoroughly
2. Use nonces for inline scripts if possible
3. Remove `'unsafe-eval'` and test again

---

## How to Tune CSP

### Step 1: Identify Required Resources

1. **Open browser DevTools** → Console
2. **Load the app** and check for CSP violations
3. **Note blocked resources** in console errors

### Step 2: Add Required Sources

1. **Edit `apps/pwa/public/_headers`**
2. **Add blocked domains** to appropriate directives
3. **Rebuild and test**

### Step 3: Test Thoroughly

1. **Test all features** that might be affected
2. **Check browser console** for CSP violations
3. **Verify external resources load** (maps, analytics, etc.)

### Step 4: Deploy to Preview

1. **Deploy to Cloudflare Pages preview**
2. **Test again** in preview environment
3. **Verify CSP works** before production

---

## Common CSP Violations

### Issue: Inline scripts blocked

**Error:** `Refused to execute inline script because it violates CSP`

**Solution:**
- Keep `'unsafe-inline'` in `script-src` (required for Vite)
- Or use nonces (complex, requires build-time generation)

### Issue: External API blocked

**Error:** `Refused to connect to 'https://api.example.com' because it violates CSP`

**Solution:**
- Add domain to `connect-src`: `https://api.example.com`
- Or use wildcard: `https://*.example.com`

### Issue: External images blocked

**Error:** `Refused to load image from 'https://cdn.example.com/image.jpg'`

**Solution:**
- Add domain to `img-src`: `https://cdn.example.com`
- Or keep `https:` for all HTTPS images (less secure)

### Issue: Google Maps blocked

**Error:** Maps not loading

**Solution:**
- Verify `https://maps.googleapis.com` is in `script-src` and `connect-src`
- Check browser console for specific CSP violations

---

## Testing Security Headers

### Browser DevTools

1. **Open DevTools** → Network tab
2. **Load a page**
3. **Click on any request** → Headers tab
4. **Verify security headers** are present

### Online Tools

1. **SecurityHeaders.com**: https://securityheaders.com
2. **Mozilla Observatory**: https://observatory.mozilla.org
3. **Enter your domain** and check headers

### Command Line

```bash
curl -I https://your-domain.pages.dev | grep -i "x-frame-options\|x-content-type-options\|content-security-policy"
```

---

## Headers for Pages Functions

**Important:** If you add Pages Functions (`apps/pwa/functions/`), `_headers` will NOT apply to function responses. You must set headers in your function code:

```typescript
// apps/pwa/functions/api.ts
export async function onRequest(context) {
  const response = await fetch(...);
  
  // Set security headers
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Content-Security-Policy', 'default-src \'self\'');
  
  return response;
}
```

---

## Recommendations

### Immediate (Before Production)

1. ✅ **Test CSP in preview environment**
2. ✅ **Verify all external resources are allowed**
3. ✅ **Check for CSP violations in browser console**
4. ⚠️ **Consider removing `'unsafe-eval'` if not needed**

### Future Enhancements

1. **Use nonces for inline scripts** (requires build-time generation)
2. **Remove `'unsafe-inline'` from `script-src`** (use nonces instead)
3. **Restrict `img-src` to specific domains** (instead of `https:`)
4. **Add reporting endpoint** for CSP violations:
   ```
   Content-Security-Policy: ...; report-uri https://your-csp-report-endpoint.com
   ```

---

## References

- [Cloudflare Pages Headers](https://developers.cloudflare.com/pages/configuration/headers/)
- [MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)

---

**Last Updated:** 2025-01-29
