# World-Class Mobile-First PWA Blueprint: Gap Analysis

**Date:** 2025-01-27  
**Blueprint Version:** v1.0  
**Current State:** Pre-production Cloudflare deployment ready

---

## Executive Summary

This document compares the current easyMO Discovery PWA implementation against the world-class mobile-first PWA blueprint. It identifies gaps, priorities, and actionable implementation steps.

**Overall Status:** 🟡 **Partial Implementation** - Strong foundation exists, but several critical mobile-first optimizations are missing.

---

## 1. Core Web Vitals Targets

### Target Requirements (Blueprint)

| Metric | Target | Current Status | Gap |
|--------|--------|----------------|-----|
| **LCP** | ≤ 2.5s (75th percentile field data) | ⚠️ Not measured (field data) | Need RUM integration for field data |
| **INP** | ≤ 200ms (75th percentile field data) | ⚠️ Not measured (field data) | Need RUM integration for field data |
| **CLS** | ≤ 0.1 (75th percentile field data) | ⚠️ Not measured (field data) | Need RUM integration for field data |

### Current Implementation

✅ **Web Vitals instrumentation exists** (`apps/pwa/services/vitals.ts`)
- Uses `web-vitals` library
- Measures LCP, INP, CLS
- Sends to `VITE_RUM_ENDPOINT` if configured

⚠️ **Gaps:**
- No field data collection (only lab data via Lighthouse)
- No RUM endpoint configured
- No CI gates for CWV thresholds
- No performance budgets enforced in CI

---

## 2. Performance Budgets

### Target Requirements

| Resource | Target | Hard Ceiling | Current Status |
|----------|--------|--------------|----------------|
| Initial route JS (gzip) | 150-200KB | 300KB | ⚠️ Unknown (no measurement) |
| CSS initial | - | - | ⚠️ Unknown |
| Images | AVIF/WebP + responsive | Never ship original camera images | ⚠️ No image optimization pipeline |
| Fonts | 1 family max, subset + preload | Prefer system font stack | ⚠️ Multiple font sources likely |

### Current Implementation

✅ **Budget file exists** (`perf/budgets.json`)
- Defines budgets but not enforced
- Not integrated with build or CI

⚠️ **Gaps:**
- No bundle size analysis in CI
- No image optimization pipeline (AVIF/WebP conversion)
- Font optimization not verified
- No performance budget enforcement

---

## 3. Service Worker & Caching Strategy

### Target Requirements

Blueprint requires specific caching strategies:
- **Static assets:** Cache First (hashed bundles)
- **API reads:** Stale-While-Revalidate
- **API writes:** Network Only + offline queue
- **Images/avatars:** Stale-While-Revalidate or Cache First (size limited)

### Current Implementation

✅ **Service Worker exists** (`apps/pwa/pwa/service-worker.ts`)
- Uses Workbox strategies
- Implements:
  - ✅ Cache First for images
  - ✅ Stale-While-Revalidate for assets
  - ✅ Network First for pages
  - ✅ Network Only + BackgroundSync for API writes

⚠️ **Gaps:**
- API reads not explicitly using Stale-While-Revalidate for external APIs (Supabase)
- Image cache size limit not enforced (currently unlimited entries, 7-day expiry)
- No route-specific offline fallbacks (only global `/offline.html`)

---

## 4. Offline-First Minimum

### Target Requirements

- App shell loads offline (navigation + skeleton + cached critical screens)
- Meaningful offline fallback for every route
- Degraded network mode (data saver toggle)

### Current Implementation

✅ **Offline features:**
- Service worker with precache
- Offline queue system (`services/offlineQueue.ts`)
- Offline banner component
- Global offline fallback page

⚠️ **Gaps:**
- No route-specific offline fallbacks (each route needs custom offline state)
- No data saver mode toggle
- Offline shell may not include all critical screens
- No offline-first skeleton screens per route

---

## 5. Mobile UI/UX Patterns

### Target Requirements

**Interaction Design:**
- Bottom navigation + bottom sheets (thumb-first)
- Progressive disclosure
- Micro-interactions (with INP consideration)
- Conversational + agentic UX
- Context-aware UI

**Visual Design:**
- High-contrast, legible typography
- Skeleton loading + optimistic UI

**Forms:**
- One primary action per screen
- Inputmode correctness
- Big tap targets (44px+)
- Inline validation
- Save-and-resume (drafts)

### Current Implementation

✅ **Mobile-friendly patterns:**
- Bottom navigation exists (`components/Layout.tsx`)
- Skeleton loading (`components/LoadingScreen.tsx`)
- Haptic feedback
- Touch-friendly components

⚠️ **Gaps:**
- Bottom navigation may not be consistently used
- Inputmode attributes not verified on all inputs
- Tap target sizes not audited (need 44px minimum)
- No explicit data saver mode
- Forms may have multiple primary actions
- No draft/save-and-resume system

---

## 6. PWA Platform Features

### Installability & Manifest

**Target Requirements:**
- Complete manifest with all required fields
- Multiple icon sizes
- Shortcuts for core tasks
- Screenshots + categories

**Current Status:** ✅ **Mostly Complete**

✅ **Manifest exists** (`apps/pwa/public/manifest.webmanifest`)
- ✅ name, short_name
- ✅ icons (192, 512, maskable, SVG)
- ✅ start_url, scope, display
- ✅ theme_color, background_color
- ✅ shortcuts (Find Ride, MoMo QR, Scan QR)
- ✅ screenshots
- ✅ categories

⚠️ **Minor gaps:**
- Could add more shortcut icons (currently reuses main icon)
- Could add more screenshot variations

---

## 7. iOS Installation & Capabilities

### Target Requirements

- Installable on iOS Safari (16.4+)
- Web Push support (iOS 16.4+)
- Safe area handling (viewport-fit=cover + env insets)
- Touch-optimized scroll behavior

### Current Implementation

✅ **iOS support:**
- Manifest properly configured
- PWA installation possible

⚠️ **Gaps:**
- Safe area insets not explicitly handled (viewport-fit=cover may not be set)
- Touch action optimization not verified
- Scroll restoration per route not verified

---

## 8. Routing & Code Splitting

### Target Requirements

- Route-based code splitting
- Prefetch next-likely routes (on good connections)
- Stream HTML for first paint where possible

### Current Implementation

✅ **Code splitting:**
- React.lazy() for pages
- Route-based splitting exists

⚠️ **Gaps:**
- No prefetching strategy for likely next routes
- No SSR/edge rendering (SPA only)
- Bundle size not optimized for mobile (no explicit mobile bundle)

---

## 9. Image Optimization

### Target Requirements

- Responsive images (srcset/sizes)
- AVIF preferred; WebP fallback
- Blur-up placeholders
- Lazy-loading
- Never ship original camera images

### Current Implementation

⚠️ **Gaps:**
- No image optimization pipeline
- No AVIF/WebP conversion
- No responsive srcset implementation
- No blur-up placeholders
- Images may not be optimized

---

## 10. Font Optimization

### Target Requirements

- 1 family max
- Subset + preload
- Prefer system font stack for ultra-low-end mode

### Current Implementation

⚠️ **Gaps:**
- Font usage not audited
- No font subsetting
- System font fallback not verified
- No font preload strategy

---

## 11. Performance Monitoring

### Target Requirements

- RUM for Web Vitals (field data)
- Lighthouse CI in PR checks
- WebPageTest for real network profiles

### Current Implementation

✅ **Monitoring exists:**
- Web Vitals instrumentation
- Lighthouse script in package.json

⚠️ **Gaps:**
- No RUM endpoint configured (field data not collected)
- No Lighthouse CI (only manual script)
- No WebPageTest integration
- No performance gates in CI

---

## 12. Accessibility

### Target Requirements

- 44px+ touch targets
- Screen reader labels
- Reduced motion support
- Color contrast AA+

### Current Implementation

✅ **Accessibility:**
- Axe-core in Playwright tests
- Some ARIA labels

⚠️ **Gaps:**
- Touch target size audit needed (may not meet 44px minimum)
- Screen reader labels not comprehensive
- Reduced motion support not verified
- Color contrast not audited

---

## 13. Data Saver Mode

### Target Requirements

- Data saver toggle (like Twitter Lite)
- Disable autoplay media
- Lazy-load below the fold
- Reduce images in data saver mode

### Current Implementation

❌ **Not Implemented**
- No data saver mode
- No toggle for data-saving features
- No conditional image loading based on connection

---

## 14. ChatGPT App Store Alignment

### Target Requirements

- MCP server tools with JSON Schema
- Web component UI rendered in ChatGPT (iframe)
- Use Apps SDK widgets (Card/ListView/Form/Text/Markdown)
- Stream Text/Markdown with stable ids
- OAuth for user account linking

### Current Implementation

✅ **ChatGPT App features:**
- MCP server exists (`worker/src/mcp-server.ts`)
- Worker with OpenAI Agents SDK
- OAuth endpoints configured

⚠️ **Gaps:**
- ChatGPT App UI surface not explicitly built
- Widgets from Apps SDK not integrated
- Streaming with stable IDs may not be fully implemented
- UI component inventory not mapped to Apps SDK widgets

---

## 15. Engineering Playbook

### Routing & Rendering

**Gaps:**
- No SSR/edge rendering (SPA only)
- No prefetching strategy

### JS Hygiene

**Gaps:**
- Bundle size not optimized for mobile
- Heavy dependencies may not be split (e.g., Gemini client)
- Web workers not used for heavy tasks

### Local Storage & IndexedDB

✅ **Storage:**
- Offline queue uses IndexedDB-like patterns
- Local storage used for state

⚠️ **Gaps:**
- IndexedDB wrapper (Dexie/idb) not explicitly used
- Cache clearing strategy not documented

---

## 16. Testing & QA

### Target Requirements

- Playwright for mobile E2E
- Lighthouse CI in PR checks
- WebPageTest for real network profiles
- E2E tests on low-end Android + iOS

### Current Implementation

✅ **Testing:**
- Playwright tests exist (`tests/e2e/pwa.spec.ts`)
- Lighthouse script exists

⚠️ **Gaps:**
- No Lighthouse CI (only manual)
- No WebPageTest integration
- No mobile device testing in CI
- Crash-free session target not monitored

---

## Priority Implementation Plan

### Phase 1: Critical Mobile Performance (High Priority)

1. **Enforce Performance Budgets**
   - Add bundle size analysis to CI
   - Set up Lighthouse CI gates
   - Enforce 200KB target for initial JS

2. **Image Optimization Pipeline**
   - Set up AVIF/WebP conversion
   - Implement responsive srcset
   - Add blur-up placeholders
   - Lazy-load images

3. **Font Optimization**
   - Audit font usage
   - Subset fonts
   - Add font preload
   - System font fallback

4. **RUM Integration**
   - Configure RUM endpoint
   - Start collecting field data
   - Set up CWV dashboards

### Phase 2: Offline & Data Saver (Medium Priority)

5. **Route-Specific Offline Fallbacks**
   - Create offline states for each route
   - Test offline navigation

6. **Data Saver Mode**
   - Add data saver toggle
   - Conditional image loading
   - Disable autoplay in data saver mode

7. **Enhanced Caching**
   - Add Stale-While-Revalidate for API reads
   - Enforce image cache size limits
   - Optimize cache strategies

### Phase 3: UX Polish (Medium Priority)

8. **Touch Target Audit**
   - Verify 44px+ targets
   - Fix undersized targets

9. **Input Optimization**
   - Add inputmode attributes
   - Verify form UX (one primary action)

10. **Safe Area Support**
    - Add viewport-fit=cover
    - Implement safe area insets

### Phase 4: ChatGPT App Surface (Lower Priority)

11. **ChatGPT App UI**
    - Build Apps SDK widget-based UI
    - Integrate streaming with stable IDs
    - Test in ChatGPT App environment

---

## Quick Wins (Can Implement Immediately)

1. ✅ **Update performance budgets** - Align `perf/budgets.json` with blueprint targets
2. ✅ **Add Lighthouse CI** - Integrate into GitHub Actions
3. ✅ **Add bundle size analysis** - CI script to check bundle sizes
4. ✅ **Safe area CSS** - Add viewport-fit=cover and safe area insets
5. ✅ **Inputmode attributes** - Add to all form inputs
6. ✅ **Touch target audit** - Verify 44px minimum

---

## Files to Create/Update

### New Files Needed

1. `docs/pwa-performance-plan.md` - Performance optimization roadmap
2. `.github/workflows/lighthouse-ci.yml` - Lighthouse CI workflow
3. `scripts/check-bundle-size.js` - Bundle size analysis script
4. `scripts/optimize-images.js` - Image optimization script
5. `apps/pwa/components/DataSaverToggle.tsx` - Data saver mode component

### Files to Update

1. `apps/pwa/vite.config.ts` - Add bundle size limits, image optimization
2. `apps/pwa/pwa/service-worker.ts` - Enhance caching strategies
3. `apps/pwa/App.tsx` - Add data saver mode, safe area support
4. `perf/budgets.json` - Align with blueprint targets
5. `apps/pwa/public/manifest.webmanifest` - Verify all fields complete

---

## Measurement & Success Criteria

### Before Implementation

- Measure current bundle sizes
- Run Lighthouse on mobile profile
- Audit current CWV (lab + field if possible)
- Document current touch target sizes
- Audit font usage

### After Implementation

- LCP ≤ 2.5s (field data)
- INP ≤ 200ms (field data)
- CLS ≤ 0.1 (field data)
- Initial JS ≤ 200KB (gzip)
- All touch targets ≥ 44px
- Lighthouse PWA score ≥ 90
- Crash-free sessions ≥ 99.8%

---

## References

- Blueprint: World-Class Mobile-First PWA Blueprint (v1.0)
- Current Implementation: See `docs/world-class-pwa-report.md`
- Performance Budgets: `perf/budgets.json`
- Service Worker: `apps/pwa/pwa/service-worker.ts`

---

**Next Steps:** See Priority Implementation Plan above. Start with Phase 1 for maximum impact.

