# Runtime Error Fix - "Cannot access 'p' before initialization"

**Date:** 2025-01-27  
**Error:** `Uncaught ReferenceError: Cannot access 'p' before initialization at vendor-Z2_zqgKv.js:10:403`

---

## Problem

The error occurs in the vendor bundle, suggesting a circular dependency or module initialization order issue.

---

## Potential Causes

1. **Circular Dependencies** - Modules importing each other
2. **Hoisting Issues** - Variables used before declaration
3. **Module Initialization Order** - Dependencies not loaded in correct order
4. **Vite Build Configuration** - Manual chunks causing issues

---

## Solutions

### Solution 1: Check for Circular Dependencies

```bash
# Install dependency checker
npm install --save-dev madge

# Check for circular dependencies
npx madge --circular apps/pwa/src
```

### Solution 2: Review Vite Config

The current `vite.config.ts` has manual chunking. This might cause initialization issues.

**Current config:**
```typescript
manualChunks(id) {
  if (!id.includes('node_modules')) return;
  if (id.includes('react')) return 'react-vendor';
  if (id.includes('framer-motion')) return 'motion-vendor';
  if (id.includes('@supabase')) return 'supabase-vendor';
  if (id.includes('@google/genai')) return 'genai-vendor';
  if (id.includes('html5-qrcode') || id.includes('qrcode')) return 'qrcode-vendor';
  return 'vendor';
}
```

**Try simplifying:**
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: undefined, // Let Vite handle chunking automatically
    },
  },
}
```

### Solution 3: Check Import Order

Ensure imports are in correct order:
1. External dependencies first
2. Internal utilities
3. Components
4. App code

### Solution 4: Use Dynamic Imports

For large dependencies, use dynamic imports:
```typescript
const module = await import('./module');
```

---

## Debugging Steps

1. **Check browser console** for full stack trace
2. **Check Network tab** to see which file is failing
3. **Check Source tab** to see the actual code causing error
4. **Disable manual chunking** temporarily to test
5. **Check for circular dependencies**

---

## Quick Fix

Try removing manual chunking temporarily:

```typescript
build: {
  // Remove rollupOptions temporarily
  // rollupOptions: {
  //   output: {
  //     manualChunks(id) { ... }
  //   }
  // }
}
```

Then rebuild and test.

---

## Next Steps

1. Check browser console for exact error location
2. Identify which module is causing the issue
3. Fix circular dependency or initialization order
4. Test in production build

---

**Status:** Investigation needed - check browser console for exact error

