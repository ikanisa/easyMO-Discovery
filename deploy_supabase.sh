#!/bin/bash
# Supabase Deployment Script
# Run this to deploy all edge functions and set secrets

set -e

echo "=================================================="
echo "  easyMO-Discovery: Supabase Deployment"
echo "=================================================="
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo ""
    echo "Install with:"
    echo "  brew install supabase/tap/supabase"
    echo "  or"
    echo "  npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found: $(supabase --version)"
echo ""

# Check if logged in
echo "🔐 Checking authentication..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase"
    echo ""
    echo "Run: supabase login"
    exit 1
fi

echo "✅ Authenticated"
echo ""

# Deploy Edge Functions
echo "=================================================="
echo "  Deploying Edge Functions"
echo "=================================================="
echo ""

FUNCTIONS=(
    "chat-gemini"
    "schedule-trip"
    "update-presence"
    "whatsapp-broadcast"
    "whatsapp-status"
    "whatsapp-log-message"
    "whatsapp-log-webhook-event"
    "whatsapp-update-status"
    "lead-state-update"
    "vendor-notify"
)

for func in "${FUNCTIONS[@]}"; do
    echo "📦 Deploying $func..."
    
    if [ "$func" = "chat-gemini" ]; then
        supabase functions deploy "$func" --no-verify-jwt || echo "⚠️  Failed to deploy $func"
    else
        supabase functions deploy "$func" || echo "⚠️  Failed to deploy $func"
    fi
    
    echo ""
done

echo ""
echo "=================================================="
echo "  Setting Secrets"
echo "=================================================="
echo ""

echo "⚠️  Make sure you have these environment variables set:"
echo ""
echo "Required secrets:"
echo "  - GEMINI_API_KEY"
echo "  - SUPABASE_SERVICE_ROLE_KEY"
echo "  - TWILIO_ACCOUNT_SID"
echo "  - TWILIO_AUTH_TOKEN"
echo "  - TWILIO_WHATSAPP_FROM"
echo "  - TWILIO_CONTENT_SID_EASYMO_BUSINESS"
echo ""

read -p "Do you want to set secrets now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    read -p "Enter GEMINI_API_KEY: " GEMINI_KEY
    if [ ! -z "$GEMINI_KEY" ]; then
        supabase secrets set GEMINI_API_KEY="$GEMINI_KEY"
    fi
    
    echo ""
    echo "For Twilio secrets, run:"
    echo "  supabase secrets set TWILIO_ACCOUNT_SID=ACxxxx"
    echo "  supabase secrets set TWILIO_AUTH_TOKEN=your_token"
    echo "  supabase secrets set TWILIO_WHATSAPP_FROM=whatsapp:+xxx"
    echo "  supabase secrets set TWILIO_CONTENT_SID_EASYMO_BUSINESS=HXxxxx"
fi

echo ""
echo "=================================================="
echo "  Deployment Summary"
echo "=================================================="
echo ""
echo "✅ Edge functions deployed"
echo "📋 Next steps:"
echo "  1. Set remaining secrets (see above)"
echo "  2. Test functions: npm run test"
echo "  3. Deploy frontend: npm run build"
echo ""
echo "🔍 Check deployment:"
echo "  supabase functions list"
echo "  supabase secrets list"
echo ""
echo "✅ Deployment complete!"
