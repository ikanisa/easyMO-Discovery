# Cloudflare Pages Setup Guide

**Date:** 2025-01-27  
**Purpose:** Configure Cloudflare Pages for automated builds

---

## Current Status

✅ **Manual deployment works:**
```bash
cd apps/pwa
npm run pages:deploy
```

✅ **Deployment URL:** https://f2db051c.discovery1.pages.dev

---

## Cloudflare Pages Configuration

### Option 1: Cloudflare Dashboard Configuration

1. Go to Cloudflare Dashboard → Pages → Create Project
2. Connect your Git repository
3. Configure build settings:

**Build Configuration:**
- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Build output directory:** `apps/pwa/dist`
- **Root directory:** `/` (or leave empty)

**Environment Variables:**
- `VITE_SUPABASE_URL` - Your Supabase URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key
- Any other `VITE_*` variables needed

### Option 2: Using Configuration File

Create `cloudflare.json` in project root:

```json
{
  "build": {
    "command": "npm install && npm run build",
    "cwd": "apps/pwa"
  },
  "deploy": {
    "publish": "apps/pwa/dist"
  }
}
```

---

## Build Command

For Cloudflare Pages, use:

```bash
# From project root
npm install
cd apps/pwa
npm run build
```

Or as a single command:
```bash
npm install && npm run build --workspace=apps/pwa
```

---

## Output Directory

The build output is in: `apps/pwa/dist`

This directory contains:
- `index.html`
- `assets/` (JS, CSS files)
- `service-worker.js`
- `manifest.webmanifest`
- `_headers`
- `_redirects`

---

## Troubleshooting

### Build Fails with "Cannot find module"

**Solution:** Ensure `package.json` has all dependencies and run `npm install` first.

### Build Fails with "Command not found"

**Solution:** Use full path to npm or ensure Node.js is available in build environment.

### Build Succeeds but Site Doesn't Load

**Solution:** 
1. Check `publish` directory is correct (`apps/pwa/dist`)
2. Verify `index.html` exists in dist
3. Check `_redirects` file for SPA routing

### Environment Variables Not Working

**Solution:**
- Use `VITE_` prefix for client-side variables
- Set in Cloudflare Pages → Settings → Environment Variables
- Rebuild after adding variables

---

## Recommended Settings

### Build Settings
- **Node version:** 18 or 20
- **Build command:** `npm install && npm run build --workspace=apps/pwa`
- **Output directory:** `apps/pwa/dist`

### Environment Variables
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `NODE_VERSION` (optional, defaults to 18)

### Custom Domain
- Add custom domain in Pages → Custom domains
- Update DNS records as instructed

---

## Manual Deployment (Current Working Method)

```bash
cd apps/pwa
npm run pages:deploy
```

This builds and deploys to: https://f2db051c.discovery1.pages.dev

---

## Automated Builds

To enable automated builds from Git:

1. Connect repository in Cloudflare Pages
2. Set build configuration as above
3. Push to main branch triggers build
4. Preview deployments for PRs

---

## Files Created

- `apps/pwa/cloudflare.json` - Build configuration
- `.cloudflare/pages.json` - Alternative config location

---

## Next Steps

1. **Test build locally:**
   ```bash
   cd apps/pwa
   npm run build
   ls dist/
   ```

2. **Verify dist contents:**
   - `index.html` exists
   - `assets/` folder has files
   - `service-worker.js` exists

3. **Configure in Cloudflare Dashboard:**
   - Add project
   - Set build settings
   - Add environment variables
   - Deploy

---

**Current Status:** Manual deployment works ✅  
**Next:** Configure automated builds in Cloudflare Dashboard

