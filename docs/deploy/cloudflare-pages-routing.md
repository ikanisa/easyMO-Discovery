# Cloudflare Pages SPA Routing Configuration

**Last Updated:** 2025-01-29

---

## Overview

This document explains how SPA (Single Page Application) routing works for the easyMO Discovery PWA on Cloudflare Pages, and how to test deep linking.

---

## Current Routing Implementation

### Architecture

The PWA uses **state-based navigation** with query parameters rather than traditional path-based routing:

- **Home**: `/` or `/?mode=home`
- **Discovery**: `/?mode=discovery`
- **Business**: `/?mode=business`
- **Services**: `/?mode=services`
- **Chat**: `/?mode=chat`
- **Settings**: `/?mode=settings`

**Note:** The app does not use React Router. Routes are determined by:
1. Query parameters (`?mode=...`)
2. Internal state management (Zustand)
3. `window.history.pushState` for URL updates

---

## `_redirects` Configuration

**Location:** `apps/pwa/public/_redirects`

**Current Configuration:**
```apache
/*    /index.html   200
```

**How It Works:**
1. Cloudflare Pages serves static files first (assets, icons, etc.)
2. If no matching file exists, the redirect rule applies
3. All non-file paths serve `/index.html` with a 200 status code
4. The React app loads and reads the URL to determine the route

**Why 200 instead of 301/302:**
- 200 status preserves the original URL in the browser
- This enables proper client-side routing
- Search engines can index the URLs
- Browser history works correctly

---

## Testing Deep Links

### Local Testing

1. **Build the app:**
   ```bash
   cd apps/pwa
   pnpm run build
   ```

2. **Preview the build:**
   ```bash
   pnpm run preview
   ```

3. **Test deep links:**
   - Open `http://localhost:4173/?mode=discovery`
   - Open `http://localhost:4173/?mode=business`
   - Verify the app loads and shows the correct mode

4. **Test with hard refresh:**
   - Open a deep link
   - Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
   - Verify the app still loads correctly (no 404)

### Production Testing

1. **Deploy to Cloudflare Pages**
2. **Test deep links:**
   - `https://your-domain.pages.dev/?mode=discovery`
   - `https://your-domain.pages.dev/?mode=business`
   - Verify each loads correctly

3. **Test with hard refresh:**
   - Open a deep link
   - Hard refresh the page
   - Verify no 404 errors

4. **Test from external link:**
   - Share a deep link URL
   - Open it in a new browser/incognito window
   - Verify it loads correctly

---

## 404 Handling

**Location:** `apps/pwa/public/404.html`

**How It Works:**
1. If a truly missing static file is requested (e.g., `/nonexistent.png`), Cloudflare Pages serves `404.html`
2. For SPA routes (e.g., `/?mode=discovery`), the `_redirects` rule applies first, so `404.html` is never served
3. The React app handles client-side 404s internally

**Current Implementation:**
- `404.html` exists and provides a user-friendly error page
- SPA routes are handled by `_redirects` → `index.html`
- Client-side 404s are handled by the React app

---

## Future Enhancements

### If Deep Linking to Paths is Needed

If you want to support paths like `/discovery` instead of `/?mode=discovery`, you would need to:

1. **Install React Router:**
   ```bash
   pnpm add react-router-dom
   ```

2. **Update `_redirects`:**
   ```apache
   # Keep existing rule - it already handles all paths
   /*    /index.html   200
   ```

3. **Implement Router in App:**
   ```typescript
   import { BrowserRouter, Routes, Route } from 'react-router-dom';
   
   <BrowserRouter>
     <Routes>
       <Route path="/" element={<Home />} />
       <Route path="/discovery" element={<Discovery />} />
       <Route path="/business" element={<Business />} />
     </Routes>
   </BrowserRouter>
   ```

**Note:** The current `_redirects` configuration already supports this - no changes needed to the redirect file.

---

## Troubleshooting

### Issue: Deep links return 404

**Symptoms:** Opening `/?mode=discovery` directly returns 404

**Solutions:**
1. Verify `_redirects` file exists in `apps/pwa/public/`
2. Verify `_redirects` is copied to `dist/` during build
3. Check Cloudflare Pages build output includes `_redirects`
4. Verify redirect rule syntax: `/*    /index.html   200`

### Issue: Static assets return 404

**Symptoms:** Images, icons, or other static files return 404

**Solutions:**
1. Cloudflare Pages serves files before applying redirects
2. Verify files exist in `apps/pwa/public/`
3. Verify files are copied to `dist/` during build
4. Check file paths in code match actual file locations

### Issue: Service worker not registering

**Symptoms:** Service worker fails to register on deep links

**Solutions:**
1. Verify service worker scope is `/` (root)
2. Check service worker file exists at `dist/service-worker.js`
3. Verify `_headers` doesn't block service worker registration
4. Check browser console for service worker errors

---

## References

- [Cloudflare Pages Redirects](https://developers.cloudflare.com/pages/configuration/redirects/)
- [Cloudflare Pages Headers](https://developers.cloudflare.com/pages/configuration/headers/)
- [Vite Static Asset Handling](https://vitejs.dev/guide/assets.html)

---

**Last Updated:** 2025-01-29
