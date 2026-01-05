# Cloudflare Workers Runtime Configuration

This document explains the Cloudflare Workers runtime configuration, including `compatibility_date` and `nodejs_compat` flag.

## Overview

Cloudflare Workers run on the V8 JavaScript engine with a minimal runtime that includes Web Standards APIs (fetch, Request, Response, etc.) but **not** Node.js APIs by default. This document explains how we configure the runtime to meet our needs.

## Compatibility Date

### What It Is

The `compatibility_date` in `wrangler.toml` specifies which version of the Workers runtime to target. Each date corresponds to a snapshot of available features and behaviors.

**Current setting:**
```toml
compatibility_date = "2025-01-27"
```

### Why It Matters

- **Feature availability**: Newer dates unlock new runtime features and APIs
- **Behavior consistency**: Ensures the runtime behaves the same way across deployments
- **Breaking changes**: Cloudflare may introduce breaking changes with new compatibility dates

### Update Policy

**When to update:**
1. **Quarterly reviews**: Update every 3-4 months to get latest features
2. **New features needed**: When you need a feature only available in newer dates
3. **Security updates**: When Cloudflare recommends updating for security fixes
4. **Bug fixes**: If a bug is fixed in a newer compatibility date

**How to update:**
1. Check [Cloudflare Workers release notes](https://developers.cloudflare.com/workers/configuration/compatibility-dates/)
2. Test in a preview environment first
3. Update `compatibility_date` in `wrangler.toml`
4. Test thoroughly before deploying to production

**Current policy:**
- Update quarterly (every 3 months)
- Test in preview/staging before production
- Monitor for breaking changes or new deprecations

### Checking Available Features

1. Visit: https://developers.cloudflare.com/workers/configuration/compatibility-dates/
2. Check changelog for dates after your current date
3. Review what's new and if you need it

### Example Update Process

```bash
# 1. Update compatibility_date in wrangler.toml
compatibility_date = "2025-04-27"  # New date

# 2. Test locally
cd worker
npm run dev

# 3. Test in preview
wrangler deploy --env preview

# 4. Deploy to production
wrangler deploy --env production
```

---

## Node.js Compatibility Flag (`nodejs_compat`)

### What It Is

The `nodejs_compat` compatibility flag enables Node.js API polyfills in the Workers runtime. This allows you to use npm packages that depend on Node.js APIs (like `require()`, `Buffer`, `process`, etc.).

**Current setting:**
```toml
compatibility_flags = ["nodejs_compat"]
```

### Why We Need It

Our Workers use the following dependencies that require Node.js APIs:

1. **OpenAI SDK** (`openai` package): Uses Node.js HTTP client internally
2. **Other npm packages**: May use Node.js APIs like `Buffer`, `crypto`, etc.

### Bundle Impact

**⚠️ Important:** Enabling `nodejs_compat` increases your Worker bundle size.

| Metric | Without nodejs_compat | With nodejs_compat | Impact |
|--------|----------------------|-------------------|--------|
| **Bundle size** | Smaller | ~50-200 KB larger | Depends on Node.js APIs used |
| **Cold start** | Faster | Slightly slower | Minimal impact |
| **Memory usage** | Lower | Slightly higher | Usually negligible |

**Bundle size optimization:**
- Only enable if absolutely necessary (as we do)
- Use Web Standards APIs when possible (URL, fetch, etc.)
- Consider alternative packages that don't require Node.js APIs

### Alternatives

If bundle size is a concern, consider:

1. **Use Web Standards APIs directly**:
   ```typescript
   // Instead of Node.js crypto
   import { crypto } from '@cloudflare/workers-types';
   
   // Use Web Crypto API
   const key = await crypto.subtle.generateKey(...);
   ```

2. **Find alternative packages**:
   - Look for packages specifically built for Workers/Edge
   - Use packages that only use Web Standards APIs

3. **Polyfill only what you need**:
   - Some Node.js APIs can be polyfilled manually
   - Only include what you actually use

**Current approach:**
We use `nodejs_compat` because:
- OpenAI SDK requires it
- Bundle size increase is acceptable (~100-200 KB)
- Simpler than maintaining custom polyfills

### When NOT to Use `nodejs_compat`

Don't enable it if:
- ✅ Your code only uses Web Standards APIs
- ✅ All dependencies are Worker-compatible
- ✅ Bundle size is critical (< 128 KB requirement)
- ✅ You want maximum performance

**Example - Worker without nodejs_compat:**
```typescript
// This works without nodejs_compat
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    return new Response(`Hello from ${url.pathname}`);
  }
};
```

---

## Configuration Files

### Worker Configuration

**Location:** `worker/wrangler.toml`

```toml
name = "easymo-agent-worker"
main = "src/index.ts"
compatibility_date = "2025-01-27"
compatibility_flags = ["nodejs_compat"]
```

**Location:** `services/agent-runtime/wrangler.toml`

```toml
name = "easymo-agent-worker"
main = "src/index.ts"
compatibility_date = "2025-01-27"
compatibility_flags = ["nodejs_compat"]
```

### Environment-Specific Configuration

Both workers support environment-specific settings:

```toml
[env.production]
name = "easymo-agent-worker"

[env.development]
name = "easymo-agent-worker-dev"
```

---

## Testing Runtime Configuration

### Local Testing

```bash
cd worker
npm run dev
# Worker runs with your wrangler.toml configuration
```

### Deploy and Test

```bash
# Deploy to preview
wrangler deploy --env preview

# Test endpoints
curl https://your-worker-preview.workers.dev/

# Deploy to production
wrangler deploy --env production
```

### Verify Runtime Version

Check your Worker's runtime in Cloudflare Dashboard:
1. Go to **Workers & Pages** → Your worker
2. Check **Settings** → **Compatibility date**
3. Verify it matches your `wrangler.toml`

---

## Common Issues

### Issue: "Module not found" or "require is not defined"

**Problem:** Using Node.js APIs without `nodejs_compat`

**Solution:** Enable `nodejs_compat` in `wrangler.toml`:
```toml
compatibility_flags = ["nodejs_compat"]
```

### Issue: Bundle size exceeds limits

**Problem:** Worker bundle is too large

**Solutions:**
1. Check if `nodejs_compat` is needed (see above)
2. Optimize dependencies
3. Use dynamic imports for large modules
4. Consider splitting into multiple Workers

### Issue: Feature not available

**Problem:** Runtime doesn't support a feature you need

**Solution:** Update `compatibility_date` to a newer date that includes the feature

### Issue: Breaking changes after updating compatibility_date

**Problem:** Code breaks after updating the date

**Solution:**
1. Review [changelog](https://developers.cloudflare.com/workers/configuration/compatibility-dates/) for breaking changes
2. Test in preview first
3. Update code to match new behavior

---

## Best Practices

### ✅ DO

- ✅ Keep `compatibility_date` reasonably current (within 3-6 months)
- ✅ Test compatibility date updates in preview first
- ✅ Only enable `nodejs_compat` if absolutely necessary
- ✅ Use Web Standards APIs when possible
- ✅ Document why you need `nodejs_compat` (which packages require it)
- ✅ Monitor bundle size when using `nodejs_compat`

### ❌ DON'T

- ❌ Update `compatibility_date` without testing
- ❌ Enable `nodejs_compat` "just in case"
- ❌ Use very old compatibility dates (may miss security fixes)
- ❌ Use very new dates without testing (may have bugs)

---

## References

- [Cloudflare Workers Compatibility Dates](https://developers.cloudflare.com/workers/configuration/compatibility-dates/)
- [Node.js Compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)
- [Workers Bundles](https://developers.cloudflare.com/workers/platform/limits/#worker-size)
- [Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)

---

## Maintenance Schedule

| Task | Frequency | Next Due |
|------|-----------|----------|
| Review compatibility_date | Quarterly | April 2025 |
| Review nodejs_compat usage | Annually | January 2026 |
| Check bundle size | After adding dependencies | As needed |
| Update documentation | When config changes | As needed |

---

**Last Updated:** 2025-01-27  
**Current Compatibility Date:** 2025-01-27  
**Next Review:** April 2025

