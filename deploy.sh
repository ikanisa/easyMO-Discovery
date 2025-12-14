#!/bin/bash
set -e

echo "🔧 Fixing Vercel deployment issues..."
echo ""

cd /Users/jeanbosco/workspace/easyMO-Discovery

echo "📦 Building to verify fixes..."
npm run build

echo ""
echo "✅ Build successful! Files in dist:"
ls -la dist/

echo ""
echo "📝 Committing changes..."
git add vite.config.ts vercel.json
git commit -m "Fix: Copy sw.js, manifest.json, icon.svg to dist folder

- Add Vite plugin to copy static files after build
- Simplify vercel.json configuration
- Ensures service worker and manifest are available in production

Fixes:
- Service worker 404 error
- Manifest 401 error
- PWA functionality"

echo ""
echo "🚀 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Done! Vercel will auto-deploy in ~2 minutes"
echo ""
echo "⚠️  REMEMBER:"
echo "1. Enable anonymous auth in Supabase"
echo "2. Verify all environment variables in Vercel"
