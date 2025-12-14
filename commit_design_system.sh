#!/bin/bash

# Commit and push design system changes

cd /Users/jeanbosco/workspace/easyMO-Discovery

echo "📝 Staging all changes..."
git add -A

echo ""
echo "📋 Changes to commit:"
git status --short

echo ""
echo "💾 Committing..."
git commit -m "feat: Implement mobile-first design system

Phase 1 & 2 Complete:
✅ Phone canvas constraint (420px max-width)
✅ Desktop shows centered mobile UI with backdrop
✅ Design tokens system (border-radius, spacing, shadows)
✅ Component classes (.glass-panel, .card-shadow, etc.)
✅ Typography tokens (.app-title, .app-subtitle, .app-body)
✅ Layout.tsx uses app-frame architecture
✅ HomeWidget uses token-based styling
✅ Fixed nav constrained to phone canvas
✅ Comprehensive DESIGN_SYSTEM.md documentation

Design Principles:
- Mobile-first: Desktop is NOT a stretch
- Token-based: No ad-hoc styling
- Consistent: Same glass language everywhere
- Dark mode: Proper variant handling

Result:
- Desktop = Centered phone UI ✓
- No viewport mismatch ✓
- Fixed elements obey frame ✓
- Components can't drift ✓"

echo ""
echo "🚀 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Done! Design system implemented."
echo ""
echo "🎨 View documentation: DESIGN_SYSTEM.md"
