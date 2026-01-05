#!/bin/bash

# Deploy Supabase Edge Functions
# Run with: bash scripts/deploy-edge-functions.sh

set -e

SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-sbp_917fd2323dec9b674e53204680a5c1d437f1b7ed}"
PROJECT_REF="rghmxgutlbvzrfztxvaq"

echo "🚀 Deploying Supabase Edge Functions..."
echo "Project: $PROJECT_REF"
echo ""

# Set access token
export SUPABASE_ACCESS_TOKEN

# Deploy each function
FUNCTIONS=(
  "whatsapp-broadcast"
  "whatsapp-status"
  "cleanup-presence"
  "cleanup-ride-intents"
  "cleanup-rate-limits"
  "log-request"
)

for func in "${FUNCTIONS[@]}"; do
  if [ -d "supabase/functions/$func" ]; then
    echo "📦 Deploying $func..."
    supabase functions deploy "$func" --project-ref "$PROJECT_REF" || {
      echo "⚠️  Failed to deploy $func (may already be deployed)"
    }
    echo ""
  else
    echo "⚠️  Function $func not found, skipping..."
  fi
done

echo "✅ Edge Functions deployment complete!"
echo ""
echo "Next steps:"
echo "1. Set secrets in Supabase Dashboard:"
echo "   - WHATSAPP_ACCESS_TOKEN"
echo "   - WHATSAPP_PHONE_ID"
echo ""
echo "2. Test functions in Dashboard → Edge Functions → Logs"

