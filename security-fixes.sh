#!/bin/bash

# Critical Security Fixes - Run IMMEDIATELY before production launch

echo "🔐 Critical Security Fixes for Production"
echo "=========================================="
echo ""

echo "⚠️  CRITICAL: Your Supabase credentials are exposed in git history!"
echo ""
echo "📋 IMMEDIATE ACTIONS REQUIRED:"
echo ""

echo "1️⃣  Rotate Supabase Keys (15 minutes)"
echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   a) Open Supabase Dashboard:"
echo "      https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq/settings/api"
echo ""
echo "   b) Click 'Rotate' next to:"
echo "      • anon / public key"
echo "      • service_role key"
echo ""
echo "   c) Copy NEW keys and update:"
echo ""
echo "   Local (.env.local):"
echo "   ━━━━━━━━━━━━━━━━━━"
echo "   VITE_SUPABASE_ANON_KEY=<NEW_ANON_KEY>"
echo ""
echo "   Vercel (Dashboard → Settings → Environment Variables):"
echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   VITE_SUPABASE_ANON_KEY=<NEW_ANON_KEY>"
echo ""
echo "   Supabase Edge Functions:"
echo "   ━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<NEW_SERVICE_ROLE_KEY>"
echo ""

read -p "Have you rotated the keys? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cannot proceed without rotating keys"
    echo "   Please complete key rotation first"
    exit 1
fi

echo ""
echo "2️⃣  Verify Vercel Environment Variables"
echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Open: https://vercel.com/dashboard"
echo "   Go to: Project Settings → Environment Variables"
echo ""
echo "   Required variables:"
echo "   • VITE_SUPABASE_URL (stays same)"
echo "   • VITE_SUPABASE_ANON_KEY (NEW rotated key)"
echo "   • GEMINI_API_KEY (optional)"
echo ""

read -p "Have you set Vercel env vars? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "⚠️  Vercel env vars not set"
    echo "   App may not work correctly"
fi

echo ""
echo "3️⃣  Enable Supabase Anonymous Auth"
echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   a) Open: https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq/auth/providers"
echo "   b) Enable 'Anonymous sign-ins'"
echo "   c) Save changes"
echo ""

read -p "Have you enabled anonymous auth? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "⚠️  Anonymous auth not enabled"
    echo "   Guest users won't be able to browse"
fi

echo ""
echo "4️⃣  Redeploy to Apply Changes"
echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   After rotating keys, trigger redeploy:"
echo ""
echo "   Option A: Git push (auto-deploys)"
echo "   $ git commit --allow-empty -m 'security: Apply rotated keys'"
echo "   $ git push origin main"
echo ""
echo "   Option B: Manual Vercel deploy"
echo "   $ vercel --prod"
echo ""

echo ""
echo "5️⃣  Security Verification Checklist"
echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   After deployment, verify:"
echo "   □ App loads correctly"
echo "   □ Login/signup works"
echo "   □ Database queries succeed"
echo "   □ No console errors about Supabase"
echo "   □ Edge Functions working"
echo ""

echo ""
echo "=================================================="
echo "📊 SECURITY STATUS"
echo "=================================================="
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "✅ Critical security fixes completed!"
    echo ""
    echo "Next steps:"
    echo "1. Deploy: git push origin main"
    echo "2. Test: https://easy-mo-discovery.vercel.app"
    echo "3. Monitor: Check Vercel + Supabase logs"
    echo ""
    echo "🎯 You are now ready for production launch!"
else
    echo "⚠️  Some steps incomplete"
    echo ""
    echo "Please complete all security fixes before launching"
    echo "Refer to: PRODUCTION_READINESS.md for details"
fi

echo ""
echo "📚 Documentation:"
echo "  • PRODUCTION_READINESS.md - Full checklist"
echo "  • SECURITY.md - Security best practices"
echo ""
