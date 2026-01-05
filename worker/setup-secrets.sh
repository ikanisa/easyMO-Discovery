#!/bin/bash
# Helper script to set Cloudflare Worker secrets
# Usage: ./setup-secrets.sh [production|development]

ENV=${1:-production}
WORKER_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Setting secrets for environment: $ENV"
echo "Worker directory: $WORKER_DIR"
echo ""

cd "$WORKER_DIR"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Error: wrangler not found. Install with: npm install -g wrangler"
    exit 1
fi

# Secrets to set
# ⚠️ IMPORTANT: Replace these placeholder values with your actual secrets
# Never commit actual secrets to git - this file is for reference only
declare -A SECRETS=(
    ["OPENAI_API_KEY"]="YOUR_OPENAI_API_KEY_HERE"
    ["SUPABASE_URL"]="YOUR_SUPABASE_URL_HERE"
    ["SUPABASE_ANON_KEY"]="YOUR_SUPABASE_ANON_KEY_HERE"
    ["SUPABASE_SERVICE_ROLE_KEY"]="YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE"
)

ENV_FLAG=""
if [ "$ENV" != "production" ]; then
    ENV_FLAG="--env $ENV"
fi

echo "Setting secrets for $ENV environment..."
echo ""

for SECRET_NAME in "${!SECRETS[@]}"; do
    SECRET_VALUE="${SECRETS[$SECRET_NAME]}"
    echo "Setting $SECRET_NAME..."
    
    # Use echo to pipe the secret value to wrangler
    echo -n "$SECRET_VALUE" | wrangler secret put "$SECRET_NAME" $ENV_FLAG
    
    if [ $? -eq 0 ]; then
        echo "✅ $SECRET_NAME set successfully"
    else
        echo "❌ Failed to set $SECRET_NAME"
        exit 1
    fi
    echo ""
done

echo "✅ All secrets set successfully for $ENV environment!"

