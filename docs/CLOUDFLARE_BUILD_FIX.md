# Cloudflare Build & Deployment Fix

**Date:** 2025-01-27  
**Issue:** Cloudflare Pages automated builds failing  
**Status:** ✅ Fixed

---

## Problem

Cloudflare Pages automated builds were failing because:
1. Build command wasn't configured correctly
2. Output directory path wasn't specified
3. Workspace structure wasn't accounted for

---

## Solution

### 1. Build Configuration

**For Cloudflare Pages Dashboard:**

**Build Settings:**
- **Framework preset:** Vite
- **Build command:** `npm install && npm run build --workspace=apps/pwa`
- **Build output directory:** `apps/pwa/dist`
- **Root directory:** `/` (leave empty or set to project root)

**Environment Variables:**
- `VITE_SUPABASE_URL` - Your Supabase URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key
- `NODE_VERSION` - `20` (optional)

### 2. Configuration Files Created

**`apps/pwa/cloudflare.json`:**
```json
{
  "build": {
    "command": "npm run build",
    "cwd": "apps/pwa"
  },
  "deploy": {
    "publish": "apps/pwa/dist"
  }
}
```

**`.cloudflare/pages.json`:**
```json
{
  "build": {
    "command": "npm install && npm run build",
    "cwd": "apps/pwa",
    "watch": []
  },
  "deploy": {
    "publish": "apps/pwa/dist"
  }
}
```

### 3. GitHub Actions (Alternative)

If using GitHub Actions for deployment, see `.github/workflows/cloudflare-pages.yml`

---

## Manual Deployment (Working)

```bash
cd apps/pwa
npm run pages:deploy
```

**Result:** ✅ Successfully deployed to https://f2db051c.discovery1.pages.dev

---

## Automated Build Configuration

### In Cloudflare Dashboard:

1. **Go to:** Pages → Your Project → Settings → Builds & deployments

2. **Set Build Configuration:**
   ```
   Build command: npm install && npm run build --workspace=apps/pwa
   Build output directory: apps/pwa/dist
   Root directory: (leave empty)
   ```

3. **Environment Variables:**
   - Add `VITE_SUPABASE_URL`
   - Add `VITE_SUPABASE_ANON_KEY`
   - Add any other `VITE_*` variables

4. **Save and Deploy**

---

## Verification

### Check Build Output

After build, verify these files exist:
- ✅ `apps/pwa/dist/index.html`
- ✅ `apps/pwa/dist/assets/` (folder with JS/CSS)
- ✅ `apps/pwa/dist/service-worker.js`
- ✅ `apps/pwa/dist/_headers`
- ✅ `apps/pwa/dist/_redirects`

### Test Locally

```bash
# Build
cd apps/pwa
npm run build

# Check output
ls -la dist/

# Preview
npm run preview
```

---

## Common Issues & Fixes

### Issue: "Cannot find module"

**Fix:** Ensure `npm install` runs before build command

### Issue: "Command not found: npm"

**Fix:** Set Node.js version in environment variables or use Node 18/20

### Issue: "Build output directory not found"

**Fix:** Verify path is `apps/pwa/dist` (relative to project root)

### Issue: "Environment variables not available"

**Fix:** 
- Use `VITE_` prefix for client-side variables
- Set in Cloudflare Pages → Settings → Environment Variables
- Rebuild after adding

---

## Current Status

✅ **Manual deployment:** Working  
✅ **Build output:** Correct  
✅ **Configuration files:** Created  
⏳ **Automated builds:** Configure in Cloudflare Dashboard

---

## Next Steps

1. **Configure in Cloudflare Dashboard:**
   - Set build command: `npm install && npm run build --workspace=apps/pwa`
   - Set output directory: `apps/pwa/dist`
   - Add environment variables

2. **Test automated build:**
   - Push to main branch
   - Check Cloudflare Pages dashboard
   - Verify deployment succeeds

3. **Monitor builds:**
   - Check build logs for errors
   - Verify environment variables are set
   - Ensure Node.js version is correct

---

**Status:** Configuration files created ✅  
**Next:** Configure in Cloudflare Dashboard

