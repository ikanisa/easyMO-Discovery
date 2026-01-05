# Empty Screen Debug Guide

**Date:** 2025-01-27  
**Issue:** Empty screen on Cloudflare Pages deployment

---

## Common Causes

### 1. Missing Environment Variables

**Symptoms:** White/empty screen, no errors in console

**Fix:** Set in Cloudflare Pages → Settings → Environment Variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 2. JavaScript Errors

**Symptoms:** Empty screen, errors in browser console

**Check:**
1. Open browser console (F12)
2. Look for red errors
3. Check Network tab for failed requests

### 3. CSP (Content Security Policy) Blocking

**Symptoms:** Resources blocked, console shows CSP violations

**Fix:** Updated `_headers` file to allow:
- `'unsafe-eval'` for Vite builds
- `https://*.workers.dev` for API calls

### 4. Asset Loading Issues

**Symptoms:** 404 errors for assets

**Check:**
1. Verify `apps/pwa/dist` contains:
   - `index.html`
   - `assets/` folder with JS/CSS files
   - `manifest.webmanifest`

2. Verify Cloudflare Pages output directory is set to: `apps/pwa/dist`

---

## Debugging Steps

### Step 1: Check Browser Console

1. Open deployed site
2. Press F12 to open DevTools
3. Check Console tab for errors
4. Check Network tab for failed requests

### Step 2: Verify Build Output

```bash
cd apps/pwa
npm run build
ls -la dist/
```

Should see:
- `index.html`
- `assets/` folder
- `manifest.webmanifest`
- `service-worker.js`

### Step 3: Check Environment Variables

In Cloudflare Pages Dashboard:
1. Go to Settings → Environment Variables
2. Verify:
   - `VITE_SUPABASE_URL` is set
   - `VITE_SUPABASE_ANON_KEY` is set

### Step 4: Test Locally

```bash
cd apps/pwa
npm run build
npm run preview
```

Visit `http://localhost:4173` and check if it works.

---

## Quick Fixes Applied

### 1. Updated CSP Headers
- Added `'unsafe-eval'` for Vite builds
- Added `https://*.workers.dev` to connect-src

### 2. Added Error Handling
- Error handler in `index.tsx`
- Displays error message if root not found
- Logs uncaught errors to console

### 3. Fixed Output Directory
- Updated `wrangler.toml` to `apps/pwa/dist`

---

## Verification Checklist

- [ ] Build succeeds locally
- [ ] `dist/` folder contains all files
- [ ] Environment variables set in Cloudflare
- [ ] No console errors in browser
- [ ] Assets load (check Network tab)
- [ ] CSP not blocking resources

---

## Next Steps

1. **Check Browser Console:**
   - Open deployed site
   - Press F12
   - Look for errors

2. **Verify Environment Variables:**
   - Cloudflare Pages → Settings → Environment Variables
   - Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set

3. **Check Network Tab:**
   - Verify assets are loading (status 200)
   - Check for 404 errors

4. **Test Locally:**
   ```bash
   npm run build
   npm run preview
   ```

---

**Status:** Error handling added, CSP updated  
**Next:** Check browser console for specific errors

