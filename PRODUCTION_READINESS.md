# 🚨 CRITICAL: Production Go-Live Action Plan
**Date:** 2025-12-14  
**Status:** ⚠️ CONDITIONAL APPROVAL (79/100)  
**Timeline:** Immediate actions required before launch

---

## 🔴 IMMEDIATE BLOCKERS (Before Go-Live)

### 1. Security - Rotate Compromised Credentials ⏱️ 15 mins
**Status:** 🔴 CRITICAL - Credentials in git history

**Action:**
```bash
# 1. Go to Supabase Dashboard
open "https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq/settings/api"

# 2. Rotate these keys:
# - Anon Key (public)
# - Service Role Key (secret)
# Note: URL stays the same

# 3. Update Vercel env vars immediately:
vercel env add VITE_SUPABASE_ANON_KEY production
# Enter NEW anon key when prompted

# 4. Update local .env.local with new keys
# 5. Update GitHub secrets (for CI/CD if any)
```

**Why:** Old keys are in public git history. Anyone can access your database.

---

### 2. Vercel Environment Variables ⏱️ 10 mins
**Status:** ⚠️ MUST VERIFY

**Required Variables:**
```bash
# Set in Vercel Dashboard → Settings → Environment Variables
VITE_SUPABASE_URL=https://rghmxgutlbvzrfztxvaq.supabase.co
VITE_SUPABASE_ANON_KEY=<NEW_ROTATED_KEY>
GEMINI_API_KEY=<YOUR_GEMINI_KEY>

# Optional (for WhatsApp features):
TWILIO_ACCOUNT_SID=<if_using_whatsapp>
TWILIO_AUTH_TOKEN=<if_using_whatsapp>
```

**Verification:**
```bash
# After setting, trigger redeploy:
vercel --prod

# Check in browser console:
# Should NOT see "undefined" for Supabase URL
```

---

### 3. Deploy Edge Functions ⏱️ 20 mins
**Status:** ⚠️ REQUIRED FOR FULL FUNCTIONALITY

**Commands:**
```bash
cd /Users/jeanbosco/workspace/easyMO-Discovery

# Already done, but verify deployment:
supabase functions list --project-ref rghmxgutlbvzrfztxvaq

# Expected output: 10 functions deployed
# If missing, redeploy:
# ./deploy_edge_functions.sh (if you have this script)
# Or manually deploy each function
```

**Critical Functions:**
- ✅ chat-gemini (AI proxy)
- ✅ whatsapp-broadcast (vendor notifications)
- ✅ whatsapp-status (response polling)
- ✅ schedule-trip (trip persistence)
- ✅ update-presence (location sync)

---

### 4. WhatsApp Bridge Deployment ⏱️ 30 mins
**Status:** 🔴 HIGH PRIORITY (vendor notifications blocked)

**Quick Deploy:**
```bash
cd services/whatsapp-bridge

# Deploy to Cloud Run
gcloud run deploy easymo-whatsapp-bridge \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --project easymoai

# Set secrets (already configured in GitHub Actions)
# Verify deployment:
curl https://easymo-whatsapp-bridge-<hash>.run.app/health
```

**Alternative:** Use GitHub Actions workflow (already set up)
```bash
# Trigger deployment via git push (already automated)
git push origin main
# Check: .github/workflows/deploy-whatsapp-bridge.yml
```

---

## 🟡 HIGH PRIORITY (Week 1)

### 5. Merge Desktop Layout Fixes ⏱️ 5 mins
**Status:** ✅ DESIGN SYSTEM ALREADY PUSHED

**What We Fixed:**
- ✅ Phone canvas architecture (420px)
- ✅ Desktop centered UI with backdrop
- ✅ Design tokens system
- ✅ Layout rhythm optimized

**Verify on Production:**
1. Open: https://easy-mo-discovery.vercel.app
2. Check desktop view (should be centered, not stretched)
3. Check mobile view (full width)
4. Toggle dark mode (should work consistently)

**PRs to Close:**
- PR #6: Already fixed by our design system
- PR #7: Already fixed by our design system

---

### 6. Enable Supabase Anonymous Auth ⏱️ 5 mins
**Action:**
```bash
# 1. Go to Supabase Dashboard
open "https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq/auth/providers"

# 2. Enable "Anonymous sign-ins"
# 3. Optional: Enable email confirmation for real users
```

**Why:** Guest users can browse without creating accounts.

---

### 7. Rate Limiting on Edge Functions ⏱️ 30 mins
**Status:** 🟡 MEDIUM - Prevent API abuse

**Implementation:**
```typescript
// Add to each Edge Function (example: chat-gemini)
import { RateLimiter } from 'https://deno.land/x/rate_limiter/mod.ts';

const limiter = new RateLimiter({
  windowMs: 60000, // 1 minute
  max: 10 // 10 requests per minute
});

serve(async (req) => {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  
  if (!limiter.check(ip)) {
    return new Response(
      JSON.stringify({ error: 'Too many requests' }),
      { status: 429 }
    );
  }
  
  // ... rest of function
});
```

---

### 8. Restrict CORS Origins ⏱️ 10 mins
**Current:** Wildcard `*` (insecure)  
**Target:** Production domains only

**Fix:**
```typescript
// In each Edge Function, replace:
'Access-Control-Allow-Origin': '*'

// With:
'Access-Control-Allow-Origin': req.headers.get('origin') || 'https://easy-mo-discovery.vercel.app'

// And add check:
const allowedOrigins = [
  'https://easy-mo-discovery.vercel.app',
  'https://easymo.rw', // if you have custom domain
  'http://localhost:5173' // dev only
];

const origin = req.headers.get('origin');
if (allowedOrigins.includes(origin)) {
  headers['Access-Control-Allow-Origin'] = origin;
}
```

---

## 🟢 MEDIUM PRIORITY (Week 2)

### 9. Add E2E Testing ⏱️ 2 hours
**Framework:** Playwright

**Setup:**
```bash
npm install -D @playwright/test
npx playwright install

# Create tests/e2e/critical-flows.spec.ts
```

**Critical Test Flows:**
1. Home → Discovery → Book Ride
2. Home → Search → Bob AI → Get Business Results
3. Home → Services → Legal AI → Get Draft
4. QR Scanner → Scan Code
5. Settings → Toggle Dark Mode

---

### 10. Error Monitoring ⏱️ 1 hour
**Recommended:** Sentry (free tier)

**Setup:**
```bash
npm install @sentry/react @sentry/vite-plugin

# Add to vite.config.ts
import { sentryVitePlugin } from "@sentry/vite-plugin";

plugins: [
  sentryVitePlugin({
    org: "your-org",
    project: "easymo-discovery",
  }),
]
```

---

### 11. Performance Optimization ⏱️ 1 hour
**Run Lighthouse Audit:**
```bash
# In Chrome DevTools → Lighthouse
# Target scores:
# - Performance: 90+
# - Accessibility: 95+
# - Best Practices: 95+
# - SEO: 90+
```

**Quick Wins:**
- ✅ Code splitting (already done with React.lazy)
- ✅ PWA manifest (already configured)
- ⚠️ Add loading skeletons
- ⚠️ Optimize images (use WebP)
- ⚠️ Add caching headers

---

## 📋 Go-Live Verification Checklist

### Pre-Launch (Do Today)
- [ ] Rotate Supabase keys ⏱️ 15m
- [ ] Verify Vercel env vars ⏱️ 10m
- [ ] Deploy WhatsApp Bridge ⏱️ 30m
- [ ] Enable anonymous auth ⏱️ 5m
- [ ] Smoke test on production URL ⏱️ 15m

### Post-Launch (Week 1)
- [ ] Monitor error rates (Sentry)
- [ ] Check performance (Lighthouse)
- [ ] Merge layout PRs (close #6, #7)
- [ ] Add rate limiting
- [ ] Restrict CORS
- [ ] Write E2E tests

### Ongoing (Week 2+)
- [ ] Visual regression tests
- [ ] CI/CD pipeline
- [ ] Analytics integration
- [ ] Documentation updates
- [ ] User feedback collection

---

## 🎯 Success Metrics

**Week 1 Targets:**
- Security Score: 75 → 95
- Testing Score: 65 → 85
- UAT Score: 70 → 90
- **Overall: 79 → 90**

**Launch Criteria:**
- ✅ All critical blockers resolved
- ✅ Core features working on production
- ✅ Security credentials rotated
- ✅ Error monitoring active
- ✅ Smoke tests passing

---

## 🚀 Launch Command

**After completing critical blockers:**
```bash
# 1. Final commit
git add -A
git commit -m "chore: Production readiness - security fixes"
git push origin main

# 2. Vercel auto-deploys (or manual)
vercel --prod

# 3. Smoke test
open https://easy-mo-discovery.vercel.app

# 4. Monitor
# - Check Vercel logs
# - Check Supabase logs
# - Check Sentry (if configured)
```

---

## 📞 Emergency Contacts

**If Production Issues:**
1. Check Vercel deployment logs
2. Check Supabase logs
3. Rollback: `vercel rollback`
4. Post in team Slack/Discord

**Support:**
- Vercel: https://vercel.com/support
- Supabase: https://supabase.com/dashboard/support
- GitHub Issues: Use for bug tracking

---

**⏰ TOTAL TIME TO PRODUCTION READY: ~2 hours**
**🎯 RECOMMENDATION: Complete critical blockers TODAY, launch by end of week**
