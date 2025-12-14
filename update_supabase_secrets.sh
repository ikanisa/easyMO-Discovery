#!/bin/bash

# ============================================================================
# Supabase Secret Update Script for Google Cloud Secret Manager
# ============================================================================
# This script creates/updates all Supabase-related secrets in Google Cloud
# and grants access to the necessary service accounts.
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="easymoai"
SUPABASE_PROJECT_ID="rghmxgutlbvzrfztxvaq"
SUPABASE_URL="https://rghmxgutlbvzrfztxvaq.supabase.co"
WHATSAPP_SA="easymo-whatsapp-bridge-sa@easymoai.iam.gserviceaccount.com"

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if secret exists
secret_exists() {
    local secret_name=$1
    gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null
    return $?
}

# Create or update secret
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3
    
    if secret_exists "$secret_name"; then
        print_info "Secret '$secret_name' exists, updating..."
        echo -n "$secret_value" | gcloud secrets versions add "$secret_name" \
            --project="$PROJECT_ID" \
            --data-file=-
        print_success "Secret '$secret_name' updated"
    else
        print_info "Creating new secret '$secret_name'..."
        echo -n "$secret_value" | gcloud secrets create "$secret_name" \
            --project="$PROJECT_ID" \
            --replication-policy="automatic" \
            --data-file=-
        
        # Add description if provided
        if [ -n "$description" ]; then
            gcloud secrets update "$secret_name" \
                --project="$PROJECT_ID" \
                --update-labels="description=$description" &>/dev/null || true
        fi
        
        print_success "Secret '$secret_name' created"
    fi
}

# Grant access to service account
grant_access() {
    local secret_name=$1
    local service_account=$2
    
    print_info "Granting access to $service_account..."
    gcloud secrets add-iam-policy-binding "$secret_name" \
        --project="$PROJECT_ID" \
        --member="serviceAccount:$service_account" \
        --role="roles/secretmanager.secretAccessor" \
        &>/dev/null
    print_success "Access granted"
}

# ============================================================================
# Main Script
# ============================================================================

print_header "Supabase Secret Update Script"

echo ""
print_info "This script will create/update the following secrets:"
echo "  1. SUPABASE_URL (URL to Supabase project)"
echo "  2. SUPABASE_ANON_KEY (Public anonymous key)"
echo "  3. SUPABASE_SERVICE_ROLE_KEY (Server-side admin key)"
echo ""
print_warning "You will need to provide the keys from Supabase Dashboard"
echo ""

# Confirm project
print_info "Project ID: $PROJECT_ID"
print_info "Supabase Project: $SUPABASE_PROJECT_ID"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "Aborted by user"
    exit 1
fi

# ============================================================================
# Step 1: SUPABASE_URL
# ============================================================================

echo ""
print_header "Step 1/3: SUPABASE_URL"
echo ""
print_info "Using Supabase URL: $SUPABASE_URL"
create_or_update_secret "SUPABASE_URL" "$SUPABASE_URL" "supabase-url"
grant_access "SUPABASE_URL" "$WHATSAPP_SA"

# ============================================================================
# Step 2: SUPABASE_ANON_KEY
# ============================================================================

echo ""
print_header "Step 2/3: SUPABASE_ANON_KEY"
echo ""
print_info "Get your anon key from:"
print_info "https://supabase.com/dashboard/project/$SUPABASE_PROJECT_ID/settings/api"
echo ""
print_warning "Look for 'Project API keys' → 'anon' → 'public'"
echo ""

# Check if secret already exists
if secret_exists "SUPABASE_ANON_KEY"; then
    print_warning "Secret 'SUPABASE_ANON_KEY' already exists"
    read -p "Update it? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -sp "Enter SUPABASE_ANON_KEY: " ANON_KEY
        echo ""
        if [ -n "$ANON_KEY" ]; then
            create_or_update_secret "SUPABASE_ANON_KEY" "$ANON_KEY" "supabase-anon-key"
            grant_access "SUPABASE_ANON_KEY" "$WHATSAPP_SA"
        else
            print_error "Empty key, skipping"
        fi
    else
        print_info "Skipping anon key update"
    fi
else
    read -sp "Enter SUPABASE_ANON_KEY: " ANON_KEY
    echo ""
    if [ -n "$ANON_KEY" ]; then
        create_or_update_secret "SUPABASE_ANON_KEY" "$ANON_KEY" "supabase-anon-key"
        grant_access "SUPABASE_ANON_KEY" "$WHATSAPP_SA"
    else
        print_error "Empty key, skipping"
    fi
fi

# ============================================================================
# Step 3: SUPABASE_SERVICE_ROLE_KEY
# ============================================================================

echo ""
print_header "Step 3/3: SUPABASE_SERVICE_ROLE_KEY"
echo ""
print_info "Get your service_role key from:"
print_info "https://supabase.com/dashboard/project/$SUPABASE_PROJECT_ID/settings/api"
echo ""
print_warning "Look for 'Project API keys' → 'service_role' → Show → Copy"
print_warning "⚠️  This is a SENSITIVE key with full database access!"
echo ""

# Check if secret already exists
if secret_exists "SUPABASE_SERVICE_ROLE_KEY"; then
    print_warning "Secret 'SUPABASE_SERVICE_ROLE_KEY' already exists"
    read -p "Update it? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -sp "Enter SUPABASE_SERVICE_ROLE_KEY: " SERVICE_ROLE_KEY
        echo ""
        if [ -n "$SERVICE_ROLE_KEY" ]; then
            create_or_update_secret "SUPABASE_SERVICE_ROLE_KEY" "$SERVICE_ROLE_KEY" "supabase-service-role"
            grant_access "SUPABASE_SERVICE_ROLE_KEY" "$WHATSAPP_SA"
        else
            print_error "Empty key, skipping"
        fi
    else
        print_info "Skipping service_role key update"
    fi
else
    read -sp "Enter SUPABASE_SERVICE_ROLE_KEY: " SERVICE_ROLE_KEY
    echo ""
    if [ -n "$SERVICE_ROLE_KEY" ]; then
        create_or_update_secret "SUPABASE_SERVICE_ROLE_KEY" "$SERVICE_ROLE_KEY" "supabase-service-role"
        grant_access "SUPABASE_SERVICE_ROLE_KEY" "$WHATSAPP_SA"
    else
        print_error "Empty key, skipping"
    fi
fi

# ============================================================================
# Summary
# ============================================================================

echo ""
print_header "Summary"
echo ""

print_success "All Supabase secrets have been processed!"
echo ""
print_info "Secrets created/updated in project: $PROJECT_ID"
echo ""

# List all secrets
print_info "Current Supabase secrets:"
echo ""
gcloud secrets list --project="$PROJECT_ID" --filter="name:SUPABASE" --format="table(name,createTime,labels)"

echo ""
print_info "Service accounts with access:"
echo "  • $WHATSAPP_SA"
echo ""

# Verification
echo ""
print_header "Verification"
echo ""
print_info "To verify secrets are accessible by Cloud Run:"
echo ""
echo "  gcloud secrets versions access latest --secret=SUPABASE_SERVICE_ROLE_KEY --project=$PROJECT_ID"
echo ""
print_info "To verify service account permissions:"
echo ""
echo "  gcloud secrets get-iam-policy SUPABASE_SERVICE_ROLE_KEY --project=$PROJECT_ID"
echo ""

print_header "Next Steps"
echo ""
print_info "1. Trigger deployment to use new secrets:"
echo "   git commit --allow-empty -m 'trigger: Use updated Supabase secrets'"
echo "   git push origin main"
echo ""
print_info "2. Or manually trigger workflow:"
echo "   gh workflow run deploy-whatsapp-bridge.yml"
echo ""
print_success "Done! 🎉"
echo ""

