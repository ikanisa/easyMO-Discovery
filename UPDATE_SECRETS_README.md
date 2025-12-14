# Supabase Secret Update Script

## Quick Start

```bash
# Make executable
chmod +x update_supabase_secrets.sh

# Run the script
./update_supabase_secrets.sh
```

## What This Script Does

This script automates the creation and configuration of all Supabase-related secrets in Google Cloud Secret Manager for the WhatsApp Bridge service.

### Secrets Created/Updated:

1. **SUPABASE_URL** - Your Supabase project URL
2. **SUPABASE_ANON_KEY** - Public anonymous key (client-side)
3. **SUPABASE_SERVICE_ROLE_KEY** - Server-side admin key (WhatsApp bridge)

### Automatic Configuration:

- ✅ Creates secrets if they don't exist
- ✅ Updates existing secrets (prompts for confirmation)
- ✅ Grants access to `easymo-whatsapp-bridge-sa` service account
- ✅ Sets proper replication policy (automatic)
- ✅ Validates all operations

## Prerequisites

1. **gcloud CLI** authenticated with proper permissions
2. **Project access** to `easymoai` project
3. **Supabase keys** from your dashboard

## Where to Get Your Keys

### Supabase Dashboard:
https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq/settings/api

### Required Keys:
- **anon key** (Project API keys → anon → public)
- **service_role key** (Project API keys → service_role → Show → Copy)

⚠️ **IMPORTANT:** Never commit the `service_role` key to git!

## Usage

### Interactive Mode (Recommended):
```bash
./update_supabase_secrets.sh
```

The script will:
1. Prompt for each key
2. Show what it's doing
3. Confirm updates for existing secrets
4. Display summary of all changes

### Verify Secrets Created:
```bash
# List all Supabase secrets
gcloud secrets list --project=easymoai --filter="name:SUPABASE"

# Test access to service_role key
gcloud secrets versions access latest \
  --secret=SUPABASE_SERVICE_ROLE_KEY \
  --project=easymoai
```

### Verify Service Account Permissions:
```bash
gcloud secrets get-iam-policy SUPABASE_SERVICE_ROLE_KEY \
  --project=easymoai
```

## After Running This Script

### 1. Trigger Deployment:
```bash
# Option A: Empty commit
git commit --allow-empty -m "trigger: Deploy with Supabase secrets"
git push origin main

# Option B: Manual workflow trigger
gh workflow run deploy-whatsapp-bridge.yml
```

### 2. Watch Deployment:
```bash
gh run watch
```

### 3. Verify Service Started:
```bash
# Get Cloud Run URL
SERVICE_URL=$(gcloud run services describe easymo-whatsapp-bridge \
  --region europe-west1 \
  --project easymoai \
  --format='value(status.url)')

# Test health endpoint
curl $SERVICE_URL/health
# Expected: "ok"
```

## Troubleshooting

### "Permission denied" error:
```bash
# Ensure you're authenticated
gcloud auth login

# Set correct project
gcloud config set project easymoai
```

### "Secret already exists" error:
The script handles this automatically - it will ask if you want to update.

### Service account cannot access secret:
```bash
# Manually grant access
gcloud secrets add-iam-policy-binding SUPABASE_SERVICE_ROLE_KEY \
  --project=easymoai \
  --member="serviceAccount:easymo-whatsapp-bridge-sa@easymoai.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Security Notes

- ✅ Keys are stored in Google Secret Manager (encrypted at rest)
- ✅ Only specified service accounts have access
- ✅ Keys are never logged or displayed after creation
- ✅ Script prompts for confirmation before updating existing secrets
- ⚠️ Use `service_role` key only in server-side code (Cloud Run)
- ⚠️ Use `anon` key for client-side applications

## Script Features

- 🎨 Color-coded output (success, error, warning, info)
- 🔒 Secure password input (keys hidden while typing)
- ✅ Checks if secrets exist before creating
- 🔄 Updates existing secrets with confirmation
- 📊 Summary of all operations
- 🔍 Verification commands provided
- 📝 Next steps clearly outlined

## Related Documentation

- **Deployment Guide:** `WHATSAPP_BRIDGE_DEPLOYMENT.md`
- **Implementation Summary:** `IMPLEMENTATION_SUMMARY.md`
- **Database Schema:** `supabase/migrations/001_whatsapp_tables.sql`

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Cloud Run logs: `gcloud run services logs read easymo-whatsapp-bridge --region europe-west1 --project easymoai`
3. Verify secret permissions: `gcloud secrets get-iam-policy <SECRET_NAME> --project=easymoai`
