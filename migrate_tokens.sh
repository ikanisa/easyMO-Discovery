#!/bin/bash

# Design System Token Migration Script
# Automatically replaces hardcoded Tailwind classes with design tokens

echo "🎨 Design System Token Migration"
echo "================================"
echo ""

cd /Users/jeanbosco/workspace/easyMO-Discovery

# Backup before making changes
echo "📦 Creating backup..."
git add -A
git stash push -m "Pre-migration backup $(date +%Y%m%d_%H%M%S)"

echo ""
echo "🔄 Applying token migrations..."
echo ""

# Function to replace patterns in files
replace_pattern() {
    local pattern=$1
    local replacement=$2
    local description=$3
    
    echo "  → $description"
    find ./components ./pages -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s/$pattern/$replacement/g" {} +
}

# Border Radius Migrations
echo "📐 Migrating border radius..."
replace_pattern "rounded-\[2rem\]" "rounded-pill" "Pill shapes (2rem)"
replace_pattern "rounded-\[1\.25rem\]" "rounded-widget" "Widgets (1.25rem)"
replace_pattern "rounded-3xl" "rounded-card" "Large cards (3xl → card)"
# Note: rounded-2xl is context-dependent (could be card or pill)
# Note: rounded-xl is context-dependent (could be button or card)

# Shadow Migrations  
echo "🌑 Migrating shadows..."
replace_pattern "shadow-xl shadow-slate-200 dark:shadow-black/20" "card-shadow" "Card shadows"
replace_pattern "shadow-lg shadow-slate-200/50 dark:shadow-black/5" "card-shadow" "Lighter card shadows"
replace_pattern "shadow-2xl" "card-shadow" "Extra large shadows"

# Border Migrations
echo "🔲 Migrating borders..."
replace_pattern "border border-slate-200 dark:border-white/10" "soft-border" "Adaptive borders"
replace_pattern "border border-slate-200 dark:border-white/5" "soft-border" "Subtle borders"

# Glass Panel Consolidation
echo "🪟 Consolidating glass panels..."
replace_pattern "bg-white/80 dark:bg-white/5 backdrop-blur-12" "glass-panel" "Glass morphism"
replace_pattern "bg-white dark:bg-slate-900/40" "glass-panel" "Card backgrounds"

# Typography Migrations (be careful with these)
echo "📝 Checking typography..."
# These need manual review - just report them
echo "  ℹ️  Manual review needed for:"
echo "     - text-5xl font-black (should be app-title + text-5xl)"
echo "     - text-slate-500 dark:text-slate-400 (may be app-subtitle)"

# Max Width Migrations
echo "📏 Migrating max-width..."
replace_pattern "max-w-md mx-auto" "max-w-phone mx-auto" "App frame constraints"
replace_pattern "w-full max-w-md" "w-full max-w-phone" "Full width with limit"

echo ""
echo "✅ Pattern replacements complete!"
echo ""
echo "⚠️  IMPORTANT: Manual Review Required"
echo "=================================="
echo ""
echo "The following need contextual judgment:"
echo ""
echo "1. rounded-2xl → Could be:"
echo "   - rounded-card (for cards)"
echo "   - rounded-pill (for nav/pills)"
echo ""
echo "2. rounded-xl → Could be:"
echo "   - rounded-button (for buttons)"
echo "   - rounded-card (for small cards)"
echo ""
echo "3. Typography classes:"
echo "   - Check if headers should use .app-title"
echo "   - Check if subtitles should use .app-subtitle"
echo ""
echo "4. Component-specific styling:"
echo "   - Chat bubbles may need unique radius"
echo "   - Form inputs shouldn't use card tokens"
echo "   - Modals need special treatment"
echo ""
echo "📋 Next Steps:"
echo "1. Review changes with: git diff"
echo "2. Test in browser (light + dark mode)"
echo "3. Commit if satisfied: git add -A && git commit"
echo "4. Or revert: git reset --hard && git stash pop"
echo ""
echo "💡 Tip: Review these files first:"
grep -l "rounded-2xl\|rounded-xl" ./components/**/*.tsx ./pages/*.tsx 2>/dev/null | head -10
echo ""
echo "🔍 Files modified:"
git status --short | grep "M " | wc -l
echo ""
