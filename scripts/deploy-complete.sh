#!/bin/bash

# Complete Deployment Script for Supabase
# Run with: bash scripts/deploy-complete.sh

set -e

PROJECT_REF="rghmxgutlbvzrfztxvaq"
SUPABASE_URL="https://rghmxgutlbvzrfztxvaq.supabase.co"
SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-sbp_917fd2323dec9b674e53204680a5c1d437f1b7ed}"

echo "🚀 Starting Supabase Deployment"
echo "Project: $PROJECT_REF"
echo ""

# Export access token
export SUPABASE_ACCESS_TOKEN

# Step 1: Deploy Edge Functions
echo "📦 Step 1: Deploying Edge Functions..."
echo ""

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
    echo "  Deploying $func..."
    supabase functions deploy "$func" --project-ref "$PROJECT_REF" 2>&1 | grep -E "(Deployed|Error)" || echo "    ✅ $func"
  fi
done

echo ""
echo "✅ Edge Functions deployed!"
echo ""

# Step 2: Instructions for Migrations
echo "📋 Step 2: Apply Database Migrations"
echo ""
echo "Migrations cannot be applied via CLI without proper permissions."
echo "Please apply migrations manually:"
echo ""
echo "1. Open: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
echo "2. Open file: combined-broadcast-migrations.sql"
echo "3. Copy entire contents and paste into SQL Editor"
echo "4. Click 'Run'"
echo ""
echo "Or see: scripts/apply-migrations-dashboard.md"
echo ""

# Step 3: Set Secrets
echo "🔐 Step 3: Set Edge Function Secrets"
echo ""
echo "Set these secrets in Dashboard → Edge Functions → Settings:"
echo ""
echo "  WHATSAPP_ACCESS_TOKEN  (your Meta WhatsApp API token)"
echo "  WHATSAPP_PHONE_ID      (your Meta WhatsApp phone number ID)"
echo ""
echo "Or via CLI:"
echo "  supabase secrets set WHATSAPP_ACCESS_TOKEN=your_token --project-ref $PROJECT_REF"
echo "  supabase secrets set WHATSAPP_PHONE_ID=your_phone_id --project-ref $PROJECT_REF"
echo ""

# Step 4: Populate Businesses
echo "📊 Step 4: Populate Businesses Table"
echo ""
echo "After migrations are applied, run:"
echo ""
echo "  export SUPABASE_URL=\"$SUPABASE_URL\""
echo "  export SUPABASE_SERVICE_ROLE_KEY=\"your_service_role_key\""
echo "  npx tsx scripts/populate-businesses.ts"
echo ""

echo "✅ Deployment script complete!"
echo ""
echo "Next steps:"
echo "  1. ✅ Edge Functions: Deployed"
echo "  2. ⏳ Migrations: Apply via Dashboard (see above)"
echo "  3. ⏳ Secrets: Set in Dashboard"
echo "  4. ⏳ Businesses: Populate after migrations"
echo ""

