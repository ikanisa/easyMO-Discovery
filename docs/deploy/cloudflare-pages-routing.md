# Cloudflare Pages SPA Routing Configuration

This document explains how client-side routing works for the easyMO Discovery PWA on Cloudflare Pages and how to test it.

## Overview

The application is a **React SPA (Single Page Application)** that uses **query parameters** for navigation (e.g., `/?mode=discovery`). All routes must serve `index.html` to enable client-side routing, while preserving access to actual static files (assets, icons, manifests, etc.).

## How It Works

### 1. Routing Strategy

The app uses **state-based navigation with query parameters**:

- **Home**: `/` or `/?mode=home`
- **Discovery**: `/?mode=discovery` or `/?mode=ride`
- **Services**: `/?mode=services`
- **Business**: `/?mode=business`
- **MoMo Generator**: `/?mode=momo`
- **QR Scanner**: `/?mode=scanner`

The app reads `?mode=` from the URL query string and updates its internal state accordingly.

### 2. `_redirects` File

**Location:** `apps/pwa/public/_redirects`  
**Deployed to:** `apps/pwa/dist/_redirects` (automatically copied by Vite)

```apache
# SPA Fallback - All routes serve index.html for client-side routing
# Cloudflare Pages automatically serves actual files (assets, icons, etc.) first,
# so static assets are preserved. This redirect only applies to non-file paths.

/*    /index.html   200
```

**How it works:**

1. **Static files are served first**: Cloudflare Pages checks if the requested path matches a real file (e.g., `/assets/index.js`, `/icons/icon-192.png`, `/manifest.webmanifest`). If found, it serves the file directly.

2. **Non-file paths redirect**: If no file exists, Cloudflare Pages checks the `_redirects` file. The rule `/*    /index.html   200` matches all paths and serves `index.html` with a 200 status code (not a redirect).

3. **Client-side routing takes over**: The React app loads, reads the URL query parameters, and renders the appropriate view.

**Important:** The `200` status code means "serve this content for this path" rather than "redirect to this URL". This preserves the original URL in the browser, which is essential for deep linking.

### 3. Static Asset Preservation

The following static assets are automatically served (not caught by the redirect):

- `/assets/*` - JavaScript bundles, CSS files
- `/icons/*` - PWA icons (PNG, SVG)
- `/manifest.webmanifest` - PWA manifest
- `/service-worker.js` - Service worker script
- `/offline.html` - Offline fallback page
- `/404.html` - Custom 404 page (if requested directly)
- `/*.svg`, `/*.png`, `/*.webp` - Image files

These are preserved because Cloudflare Pages checks for actual files **before** evaluating redirect rules.

### 4. 404 Handling

**File:** `apps/pwa/public/404.html`

Cloudflare Pages will serve `404.html` in two scenarios:

1. **Direct request to `/404.html`**: Serves the file directly
2. **Path not found AND no redirect matches**: However, since `/*    /index.html   200` matches all paths, this scenario rarely occurs

In practice, the SPA fallback handles all non-file paths, so `404.html` is primarily useful for:
- Direct access to `/404.html`
- Edge cases where redirects might fail
- Better UX if a specific invalid path is requested

The `404.html` page auto-redirects to home after 3 seconds.

## Testing

### Local Testing

#### 1. Build and Preview

```bash
cd apps/pwa
npm run build
npm run preview
```

This starts a local preview server (typically at `http://localhost:4173`).

#### 2. Test Static Assets

```bash
# These should serve actual files (not index.html):
curl -I http://localhost:4173/manifest.webmanifest
curl -I http://localhost:4173/icons/icon-192.png
curl -I http://localhost:4173/assets/index-*.js  # Replace * with actual hash
```

Expected: `200 OK` with appropriate `Content-Type` headers.

#### 3. Test SPA Routes

```bash
# These should serve index.html:
curl -I http://localhost:4173/
curl -I http://localhost:4173/discovery
curl -I http://localhost:4173/any/random/path
```

Expected: `200 OK` with `Content-Type: text/html` (the index.html file).

#### 4. Test Deep Links in Browser

Open the preview server in a browser:

```
http://localhost:4173/?mode=discovery
http://localhost:4173/?mode=business
http://localhost:4173/?mode=momo
http://localhost:4173/any/path/here?mode=scanner
```

**Expected behavior:**
- URL remains as typed (no redirect)
- App loads and reads the `mode` query parameter
- Appropriate view is rendered
- Navigation works when clicking app buttons

#### 5. Test Direct File Access

In the browser, navigate directly to:
```
http://localhost:4173/icons/icon-192.png
http://localhost:4173/manifest.webmanifest
```

**Expected:** Files are served directly (images display, JSON is shown).

### Production Testing on Cloudflare Pages

#### 1. Deploy to Cloudflare Pages

```bash
# Build
cd apps/pwa
npm run build

# Deploy
npx wrangler pages deploy dist --project-name discovery
```

Or use the Cloudflare Dashboard to deploy from Git.

#### 2. Test on Production URL

Replace `your-project.pages.dev` with your actual Cloudflare Pages URL:

```bash
# Test static assets
curl -I https://your-project.pages.dev/manifest.webmanifest
curl -I https://your-project.pages.dev/icons/icon-192.png

# Test SPA routes
curl -I https://your-project.pages.dev/
curl -I https://your-project.pages.dev/discovery
curl -I https://your-project.pages.dev/any/path
```

#### 3. Test Deep Links

Open in browser:
```
https://your-project.pages.dev/?mode=discovery
https://your-project.pages.dev/?mode=business
https://your-project.pages.dev/some/path?mode=scanner
```

#### 4. Verify `_redirects` File

Check that the `_redirects` file is in the deployed output:

```bash
# Download and inspect
curl https://your-project.pages.dev/_redirects
```

**Expected:** You should see the redirect rules, or a 404 if Cloudflare doesn't serve the file directly (which is fine - the rules are still active).

### Testing Checklist

- [ ] Static assets (`/assets/*`, `/icons/*`, `/manifest.webmanifest`) serve correctly
- [ ] Root path (`/`) serves `index.html`
- [ ] Non-file paths (`/any/path`) serve `index.html`
- [ ] Query parameters (`/?mode=discovery`) work and are preserved
- [ ] Direct file access (e.g., `/icons/icon-192.png`) works
- [ ] Deep links work in browser (URL preserved, app navigates)
- [ ] `404.html` is accessible at `/404.html`

## Troubleshooting

### Static Assets Return 404

**Problem:** Files like `/assets/index.js` return 404 instead of serving the file.

**Solutions:**
1. Check that files exist in `apps/pwa/dist/` after build
2. Verify `publicDir: 'public'` in `vite.config.ts` (default, should be set)
3. Ensure build completed successfully
4. Check Cloudflare Pages build output directory is set to `apps/pwa/dist`

### All Routes Serve index.html (Including Static Assets)

**Problem:** Even static files like `/manifest.webmanifest` serve `index.html`.

**Solutions:**
1. This shouldn't happen with Cloudflare Pages (it serves files first)
2. If it does, check that files exist in `dist/` directory
3. Verify build output directory in Cloudflare Pages settings
4. Check `_redirects` file isn't overriding file serving (it shouldn't)

### Deep Links Don't Work

**Problem:** Navigating to `/?mode=discovery` doesn't show the discovery view.

**Solutions:**
1. Check browser console for JavaScript errors
2. Verify the app reads query parameters (see `apps/pwa/App.tsx`)
3. Test locally first to isolate deployment vs. code issues
4. Check that `index.html` is being served (not a 404)

### Query Parameters Are Stripped

**Problem:** URL changes from `/?mode=discovery` to `/` automatically.

**Solutions:**
1. Check `_redirects` uses status code `200`, not `301` or `302`
2. Verify the app isn't calling `window.history.replaceState()` to strip params
3. Check service worker isn't interfering

## How to Add New Routes

Currently, the app uses query parameters. To add a new route:

1. **Update `App.tsx`** to handle the new `mode` value:
   ```typescript
   case 'newmode':
     setMode(AppMode.NEW_MODE);
     break;
   ```

2. **Update `AppMode` enum** if adding a new mode

3. **No changes needed to `_redirects`** - it already handles all paths

If you want to migrate to path-based routing (e.g., `/discovery`, `/business`), consider:

1. Installing React Router or similar
2. Updating `_redirects` to handle path-based routes (already compatible)
3. Updating all navigation logic to use paths instead of query params

## Files Involved

- **`apps/pwa/public/_redirects`** - Redirect rules (copied to `dist/_redirects`)
- **`apps/pwa/public/404.html`** - Custom 404 page (optional)
- **`apps/pwa/vite.config.ts`** - Vite config (ensures `public/` is copied to `dist/`)
- **`apps/pwa/App.tsx`** - Main app component (handles query param routing)

## References

- [Cloudflare Pages Redirects Documentation](https://developers.cloudflare.com/pages/configuration/redirects/)
- [Cloudflare Pages Headers Documentation](https://developers.cloudflare.com/pages/configuration/headers/)
- [Vite Public Directory Documentation](https://vitejs.dev/guide/assets.html#the-public-directory)

