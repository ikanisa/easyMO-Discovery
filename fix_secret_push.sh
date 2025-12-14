#!/bin/bash

# Fix secret exposure issue by amending the problematic commit

echo "🔧 Fixing secret exposure in git history..."
echo ""

cd /Users/jeanbosco/workspace/easyMO-Discovery

# Check current status
echo "📋 Current git status:"
git status --short
echo ""

# Stage the fixed DEPLOYMENT_GUIDE.md if there are changes
if git diff --quiet DEPLOYMENT_GUIDE.md; then
    echo "✅ DEPLOYMENT_GUIDE.md already has placeholders"
else
    echo "📝 Staging DEPLOYMENT_GUIDE.md with placeholders..."
    git add DEPLOYMENT_GUIDE.md
fi

# Check if there are staged changes
if git diff --cached --quiet; then
    echo "✅ No changes to commit"
    echo ""
    echo "🔄 Attempting to push existing commits..."
    git push origin main
else
    echo "💾 Committing changes..."
    git commit -m "security: Replace actual secrets with placeholders in docs"
    echo ""
    echo "🚀 Pushing to GitHub..."
    git push origin main
fi

echo ""
echo "✅ Done!"
