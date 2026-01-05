# Cloudflare Workers Runtime Configuration

**Last Updated:** 2025-01-29

---

## Overview

This document explains the Cloudflare Workers runtime configuration for the easyMO Discovery agent-runtime Worker, including compatibility dates, Node.js compatibility, and update policies.

---

## Current Configuration

**Location:** `services/agent-runtime/wrangler.toml`

```toml
name = "easymo-agent-worker"
main = "src/index.ts"
compatibility_date = "2025-01-27"
compatibility_flags = ["nodejs_compat"]
```

---

## Compatibility Date

### What It Is

The `compatibility_date` determines which Workers runtime features and behaviors are available. It acts as a "snapshot" of the Workers runtime at that date.

### Current Value

```
compatibility_date = "2025-01-27"
```

### Update Policy

**Recommended:** Update quarterly or when new features are needed.

**When to Update:**
1. **New runtime features needed** (check Cloudflare Workers changelog)
2. **Security updates** (Cloudflare may require newer compatibility dates)
3. **Quarterly maintenance** (every 3 months)

**How to Update:**
1. **Check Cloudflare docs** for latest recommended date
2. **Update `compatibility_date`** in `wrangler.toml`
3. **Test thoroughly** in development environment
4. **Deploy to preview** and test again
5. **Deploy to production** after verification

**Example:**
```toml
# Update to latest (check Cloudflare docs for current recommended date)
compatibility_date = "2025-04-01"
```

**⚠️ Warning:** Updating compatibility date can change runtime behavior. Always test before production deployment.

---

## Node.js Compatibility

### What It Is

The `nodejs_compat` flag enables Node.js API compatibility in the Workers runtime. This allows using Node.js modules and APIs that aren't natively supported.

### Current Configuration

```toml
compatibility_flags = ["nodejs_compat"]
```

### Why It's Needed

The Worker uses:
- **OpenAI SDK**: Requires Node.js APIs
- **Other Node.js dependencies**: May require Node.js compatibility

### Bundle Impact

**⚠️ Important:** `nodejs_compat` adds polyfills and increases bundle size.

**Estimated Impact:**
- Without `nodejs_compat`: ~100-200 KB
- With `nodejs_compat`: ~300-500 KB (varies by dependencies)

**Alternatives:**
1. **Use Workers-native alternatives** (if available)
2. **Remove Node.js dependencies** (if possible)
3. **Keep `nodejs_compat`** (if Node.js APIs are required)

### When to Remove

Consider removing `nodejs_compat` if:
1. **All dependencies are Workers-compatible**
2. **No Node.js APIs are used**
3. **Bundle size is a concern**

**How to Test:**
1. **Remove `nodejs_compat`** from `wrangler.toml`
2. **Run `wrangler dev`** locally
3. **Check for errors** related to Node.js APIs
4. **If errors occur**, keep `nodejs_compat`

---

## Runtime Assumptions

### ✅ Supported

- **Workers runtime APIs** (Request, Response, Fetch, etc.)
- **Cloudflare-specific APIs** (KV, Durable Objects, etc.)
- **Node.js APIs** (with `nodejs_compat` flag)
- **Web Standards** (URL, TextEncoder, etc.)

### ❌ Not Supported

- **File system access** (no `fs` module)
- **Native modules** (no native bindings)
- **Process APIs** (limited `process.env` support)
- **Long-running processes** (Workers have execution time limits)

---

## Environment Configuration

### Development

```toml
[env.development]
name = "easymo-agent-worker-dev"
```

**Usage:**
```bash
wrangler dev --env development
wrangler deploy --env development
```

### Production

```toml
[env.production]
name = "easymo-agent-worker"
```

**Usage:**
```bash
wrangler deploy --env production
```

---

## Required Configuration

### Minimum Required Fields

```toml
name = "worker-name"           # Required: Worker name
main = "src/index.ts"          # Required: Entry point
compatibility_date = "YYYY-MM-DD"  # Required: Compatibility date
```

### Optional Fields

```toml
compatibility_flags = ["nodejs_compat"]  # Optional: Node.js compatibility
[vars]                                    # Optional: Non-secret variables
[env.production]                          # Optional: Environment-specific config
```

---

## Testing Runtime Compatibility

### Local Testing

```bash
cd services/agent-runtime
wrangler dev
```

**Check for:**
- ✅ Worker starts without errors
- ✅ API endpoints respond correctly
- ✅ No Node.js API errors (if `nodejs_compat` is enabled)

### Production Testing

```bash
wrangler deploy --env production
```

**Check for:**
- ✅ Worker deploys successfully
- ✅ API endpoints work in production
- ✅ No runtime errors in logs

---

## Troubleshooting

### Issue: "Compatibility date is too old"

**Error:** Worker fails to deploy with compatibility date error

**Solution:**
1. Update `compatibility_date` to a recent date
2. Test thoroughly before production
3. Check Cloudflare docs for recommended date

### Issue: "Node.js API not found"

**Error:** `ReferenceError: process is not defined` or similar

**Solution:**
1. Add `nodejs_compat` to `compatibility_flags`
2. Or refactor to use Workers-native APIs
3. Check if dependency requires Node.js compatibility

### Issue: Bundle size too large

**Symptoms:** Worker bundle exceeds size limits

**Solutions:**
1. Remove `nodejs_compat` if not needed
2. Use Workers-native alternatives
3. Split Worker into multiple Workers
4. Use dynamic imports for large dependencies

---

## Best Practices

### 1. Keep Compatibility Date Current

- Update quarterly
- Test before production
- Document changes

### 2. Minimize Node.js Compatibility

- Only enable `nodejs_compat` if needed
- Prefer Workers-native APIs
- Monitor bundle size

### 3. Test Thoroughly

- Test locally with `wrangler dev`
- Test in preview environment
- Test in production after deployment

### 4. Document Changes

- Update this document when changing compatibility
- Note why changes were made
- Document any breaking changes

---

## References

- [Cloudflare Workers Compatibility Dates](https://developers.cloudflare.com/workers/platform/compatibility-dates/)
- [Node.js Compatibility](https://developers.cloudflare.com/workers/platform/compatibility-dates/nodejs-compatibility/)
- [Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)

---

**Last Updated:** 2025-01-29
