# Cloudflare Pages Setup Guide

**Last Updated:** 2025-01-29

---

## Build Configuration

### Correct Build Settings

**In Cloudflare Pages Dashboard → Settings → Builds & deployments:**

1. **Framework preset:** **None** ✅
   - ⚠️ **Important:** Do NOT select "Vite" or any other preset
   - Framework presets are designed for single-app repositories
   - This is a **monorepo** with custom build commands
   - "None" gives you full control over the build process

2. **Root directory:** (leave empty or `/`)
   - Cloudflare Pages will build from the repository root
   - The monorepo structure requires building from root

3. **Build command:** 
   ```bash
   corepack enable && pnpm install --frozen-lockfile && pnpm run build --workspace=apps/pwa
   ```
   
   **Alternative (if corepack is not available):**
   ```bash
   npm install -g pnpm@8 && pnpm install --frozen-lockfile && pnpm run build --workspace=apps/pwa
   ```

4. **Build output directory:** `apps/pwa/dist`

5. **Node version:** `20` (set in Environment variables or use `.nvmrc`)

---

## Why "None" for Framework Preset?

### Framework Presets vs. Monorepo

**Framework presets (Vite, Next.js, etc.) are designed for:**
- Single-app repositories
- Standard project structures
- Auto-detected build commands

**This project is a monorepo, which requires:**
- Custom build commands (`pnpm run build --workspace=apps/pwa`)
- Building from repository root
- Workspace dependency resolution

**If you select "Vite" preset:**
- ❌ Cloudflare will try to auto-detect build settings
- ❌ It won't understand the monorepo structure
- ❌ Build command will be wrong (won't use `--workspace` flag)
- ❌ Workspace dependencies won't be installed
- ❌ Build will fail

**With "None" preset:**
- ✅ Full control over build command
- ✅ Can use custom pnpm workspace commands
- ✅ Works correctly with monorepo structure
- ✅ Environment variables work as expected

---

## Environment Variables

### Required Variables

**Set in Cloudflare Pages Dashboard → Settings → Environment variables → Production:**

| Variable | Type | Description |
|----------|------|-------------|
| `VITE_SUPABASE_URL` | Plaintext | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Plaintext | Supabase anonymous key |

### Optional Variables

| Variable | Type | Description |
|----------|------|-------------|
| `VITE_WORKER_URL` | Plaintext | Cloudflare Worker URL |
| `VITE_GOOGLE_MAPS_API_KEY` | Plaintext | Google Maps API key |
| `VITE_SENTRY_DSN` | Plaintext | Sentry DSN for error tracking |
| `VITE_RUM_ENDPOINT` | Plaintext | Real User Monitoring endpoint |
| `VITE_LOG_ENDPOINT` | Plaintext | Structured logging endpoint |

**Important:** 
- All `VITE_*` variables are embedded at **build time**
- They must be set in the **Production** environment for production builds
- Set them in **Preview** environment for preview deployments

---

## Complete Configuration Summary

**Your Cloudflare Pages settings should be:**

```
Framework preset: None
Root directory: / (or leave empty)
Build command: corepack enable && pnpm install --frozen-lockfile && pnpm run build --workspace=apps/pwa
Build output directory: apps/pwa/dist
Node version: 20 (via .nvmrc or environment variable)
```

---

## Common Issues

### Issue: "Missing Supabase credentials" Error

**Symptoms:**
```
Missing Supabase credentials. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.
```

**Causes:**
1. Environment variables not set in Cloudflare Pages Dashboard
2. Variables set in wrong environment (e.g., Preview instead of Production)
3. Build command not using pnpm (npm doesn't work with pnpm workspaces)
4. Variables not available at build time

**Solutions:**

1. **Verify variables are set:**
   - Go to Cloudflare Pages Dashboard → Settings → Environment variables
   - Ensure variables are set for **Production** environment
   - Check variable names match exactly: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

2. **Verify build command uses pnpm:**
   ```bash
   # Correct:
   corepack enable && pnpm install --frozen-lockfile && pnpm run build --workspace=apps/pwa
   
   # Incorrect:
   npm install && npm run build --workspace=apps/pwa
   ```

3. **Check build logs:**
   - Go to Cloudflare Pages Dashboard → Deployments
   - Click on failed deployment → View build logs
   - Look for environment variable errors

4. **Rebuild after setting variables:**
   - After setting environment variables, trigger a new deployment
   - Go to Deployments → Retry deployment

### Issue: Build Fails with "Cannot find module"

**Symptoms:**
```
Error: Cannot find module '@easymo/shared'
```

**Cause:** Build command not using pnpm, so workspace dependencies aren't installed

**Solution:** Use the correct build command with pnpm (see above)

### Issue: Build Output Not Found

**Symptoms:**
```
Build output directory 'apps/pwa/dist' not found
```

**Causes:**
1. Build command failed
2. Wrong output directory specified
3. Root directory misconfigured

**Solutions:**
1. Check build logs for errors
2. Verify output directory: `apps/pwa/dist`
3. Ensure root directory is empty or `/`

---

## Step-by-Step Setup

### 1. Create Pages Project

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages
2. Click "Create a project"
3. Connect GitHub repository: `ikanisa/easyMO-Discovery`
4. Click "Begin setup"

### 2. Configure Build Settings

**Project name:** `discovery`

**Build configuration:**
- **Framework preset:** **None** ✅ (DO NOT select Vite)
- **Root directory:** (leave empty or `/`)
- **Build command:** 
  ```bash
  corepack enable && pnpm install --frozen-lockfile && pnpm run build --workspace=apps/pwa
  ```
- **Build output directory:** `apps/pwa/dist`

### 3. Set Environment Variables

1. Go to Settings → Environment variables
2. Select **Production** environment
3. Add variables:
   - `VITE_SUPABASE_URL` = `https://rghmxgutlbvzrfztxvaq.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
4. Click "Save"

### 4. Configure Node Version (Optional)

**Option 1: Via Environment Variable**
- Add `NODE_VERSION` = `20` in Environment variables

**Option 2: Via .nvmrc**
- The repository has `.nvmrc` with `20`
- Cloudflare Pages should detect it automatically

### 5. Deploy

1. Click "Save and Deploy"
2. Wait for build to complete
3. Check deployment logs for any errors
4. Visit the deployment URL to verify

---

## Verification

After deployment, verify:

1. **App loads without errors:**
   - Open deployment URL
   - Check browser console for errors
   - Should not see "Missing Supabase credentials" error

2. **Environment variables are embedded:**
   - Open browser DevTools → Sources
   - Check `index-*.js` file
   - Search for `VITE_SUPABASE_URL`
   - Should see the actual URL value (not `undefined`)

3. **Supabase connection works:**
   - App should be able to authenticate
   - No Supabase errors in console

---

## Build Command Breakdown

```bash
corepack enable && pnpm install --frozen-lockfile && pnpm run build --workspace=apps/pwa
```

**Explanation:**
- `corepack enable` - Enables pnpm via Node.js corepack (if available)
- `pnpm install --frozen-lockfile` - Installs dependencies using lockfile
- `pnpm run build --workspace=apps/pwa` - Builds the PWA app

**Alternative if corepack fails:**
```bash
npm install -g pnpm@8 && pnpm install --frozen-lockfile && pnpm run build --workspace=apps/pwa
```

---

## Troubleshooting

### Check Build Logs

1. Go to Cloudflare Pages Dashboard → Deployments
2. Click on deployment
3. View build logs
4. Look for:
   - Environment variable errors
   - Module not found errors
   - Build failures

### Test Build Locally

```bash
# From repository root
corepack enable
pnpm install --frozen-lockfile
pnpm run build --workspace=apps/pwa

# Verify output
ls -la apps/pwa/dist
```

### Verify Environment Variables

```bash
# In Cloudflare Pages build, add this to build command temporarily:
echo "VITE_SUPABASE_URL=$VITE_SUPABASE_URL"
echo "VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY"
```

**Note:** Remove these echo statements after debugging (they expose secrets in logs)

---

## References

- [Cloudflare Pages Build Configuration](https://developers.cloudflare.com/pages/platform/build-configuration/)
- [Environment Variables in Cloudflare Pages](https://developers.cloudflare.com/pages/platform/build-configuration/#environment-variables)
- [pnpm Workspaces](https://pnpm.io/workspaces)

---

**Last Updated:** 2025-01-29
