#!/bin/bash

# Make all scripts executable

cd /Users/jeanbosco/workspace/easyMO-Discovery

echo "🔧 Making scripts executable..."
chmod +x *.sh

echo "✅ Done!"
echo ""
echo "📜 Available scripts:"
echo ""
echo "  ./QUICKSTART_DESIGN_SYSTEM.sh  - View complete guide"
echo "  ./fix_secret_push.sh           - Fix GitHub secret blocking"
echo "  ./deploy_design_system.sh      - Deploy to production"
echo "  ./migrate_tokens.sh            - Batch update components"
echo "  ./commit_design_system.sh      - Commit changes"
echo ""
echo "👉 Start with: ./QUICKSTART_DESIGN_SYSTEM.sh"
