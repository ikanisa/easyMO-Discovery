#!/bin/bash

# ============================================================================
# Deploy Supabase Edge Functions
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Supabase Edge Functions Deployment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

PROJECT_REF="rghmxgutlbvzrfztxvaq"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}⚠ Supabase CLI not found. Installing...${NC}"
    npm install -g supabase
fi

echo -e "${GREEN}✓ Supabase CLI found${NC}"
echo ""

# Link to project
echo -e "${BLUE}Linking to Supabase project...${NC}"
supabase link --project-ref $PROJECT_REF

echo ""
echo -e "${BLUE}Deploying Edge Functions...${NC}"
echo ""

# Deploy each function
FUNCTIONS=(
    "whatsapp-log-message"
    "whatsapp-log-webhook-event"
    "whatsapp-update-status"
    "lead-state-update"
    "vendor-notify"
)

for func in "${FUNCTIONS[@]}"; do
    echo -e "${BLUE}Deploying ${func}...${NC}"
    supabase functions deploy $func --no-verify-jwt
    echo -e "${GREEN}✓ ${func} deployed${NC}"
    echo ""
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ All Edge Functions Deployed!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Function URLs:"
for func in "${FUNCTIONS[@]}"; do
    echo "  • https://${PROJECT_REF}.supabase.co/functions/v1/${func}"
done

echo ""
echo "View in dashboard:"
echo "  https://supabase.com/dashboard/project/${PROJECT_REF}/functions"
echo ""

