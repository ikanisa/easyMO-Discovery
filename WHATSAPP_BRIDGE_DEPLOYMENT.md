# WhatsApp Bridge Deployment Instructions

## PRE-DEPLOYMENT CHECKLIST

### 1. Apply Supabase Schema (REQUIRED)

Before deploying, you must create the database tables:

**Option A: Supabase Dashboard (Recommended)**
1. Go to: https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq/sql
2. Open: `supabase/migrations/001_whatsapp_tables.sql`
3. Copy entire contents
4. Paste into SQL Editor
5. Click "Run"
6. Verify: Check "Table Editor" for 6 new tables:
   - whatsapp_webhook_events
   - whatsapp_messages
   - whatsapp_threads
   - leads
   - lead_state_events
   - vendor_responses

**Option B: Supabase CLI** (if installed)
```bash
supabase db push
```

### 2. Create SUPABASE_SERVICE_ROLE_KEY Secret (REQUIRED)

```bash
# Get your service_role key from:
# https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq/settings/api
# (under "Project API keys" → service_role key)

# Create secret in Google Secret Manager
echo -n "YOUR_SERVICE_ROLE_KEY_HERE" | gcloud secrets create SUPABASE_SERVICE_ROLE_KEY \
  --project=easymoai \
  --replication-policy="automatic" \
  --data-file=-

# Grant access to Cloud Run service account
gcloud secrets add-iam-policy-binding SUPABASE_SERVICE_ROLE_KEY \
  --project=easymoai \
  --member="serviceAccount:easymo-whatsapp-bridge-sa@easymoai.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## DEPLOYMENT

### Automatic Deployment (GitHub Actions)

```bash
# Commit and push changes
git commit -m "feat: Add Supabase logging to WhatsApp bridge"
git push origin main

# Watch deployment
gh run watch
```

The workflow will:
1. Build Docker image with Supabase integration
2. Push to Artifact Registry
3. Deploy to Cloud Run with all secrets
4. Set production-ready configuration (512Mi memory, 60s timeout, etc.)

### Expected Output

```
✓ Image built: europe-west1-docker.pkg.dev/easymoai/easymo-services/whatsapp-bridge:<sha>
✓ Image pushed
✓ Service deployed: easymo-whatsapp-bridge
✓ URL: https://easymo-whatsapp-bridge-<hash>-ew.a.run.app
```

---

## POST-DEPLOYMENT VERIFICATION

### 1. Health Check
```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe easymo-whatsapp-bridge \
  --region europe-west1 \
  --project easymoai \
  --format='value(status.url)')

# Test health endpoint
curl $SERVICE_URL/health
# Expected: "ok"
```

### 2. Check Logs
```bash
# View live logs
gcloud run services logs read easymo-whatsapp-bridge \
  --region europe-west1 \
  --project easymoai \
  --limit 50

# Should see:
# "Webhook listening on port 8080"
```

### 3. Verify Secrets Loaded
```bash
# Check service configuration
gcloud run services describe easymo-whatsapp-bridge \
  --region europe-west1 \
  --project easymoai \
  --format='value(spec.template.spec.containers[0].env)'

# Should include SUPABASE_SERVICE_ROLE_KEY
```

---

## CONFIGURE TWILIO WEBHOOKS

### Required: Point Twilio to Cloud Run

1. Get your Cloud Run URL:
```bash
gcloud run services describe easymo-whatsapp-bridge \
  --region europe-west1 \
  --project easymoai \
  --format='value(status.url)'
```

2. Configure in Twilio Console:
   - URL: https://console.twilio.com/us1/develop/sms/settings/whatsapp-senders
   - Select your WhatsApp sender
   - Set webhooks:
     - **When a message comes in:** `<SERVICE_URL>/twilio/inbound` (POST)
     - **Status callback URL:** `<SERVICE_URL>/twilio/status` (POST)
   - Click "Save"

---

## TESTING

### Test 1: Send WhatsApp Message

1. Send "Hello" to your Twilio WhatsApp number
2. Expected: Auto-reply asking for item/location/budget
3. Check Supabase:
```sql
-- View inbound message
SELECT * FROM whatsapp_messages WHERE direction = 'inbound' ORDER BY created_at DESC LIMIT 1;

-- View thread created
SELECT * FROM whatsapp_threads ORDER BY created_at DESC LIMIT 1;
```

### Test 2: Check Webhook Events

```sql
-- View all webhook events
SELECT event_type, message_sid, received_at 
FROM whatsapp_webhook_events 
ORDER BY received_at DESC 
LIMIT 10;
```

### Test 3: Vendor Quick Reply (if you have template)

1. Send message with "I have it ✅" button
2. Check vendor_responses table:
```sql
SELECT * FROM vendor_responses ORDER BY created_at DESC LIMIT 1;
```

### Test 4: Message Delivery Status

1. Wait 30 seconds after sending
2. Check status updates:
```sql
SELECT message_sid, status, delivered_at 
FROM whatsapp_messages 
WHERE direction = 'outbound' 
ORDER BY created_at DESC;
```

---

## MONITORING

### Key Metrics to Watch

```bash
# Error rate
gcloud run services logs read easymo-whatsapp-bridge \
  --region europe-west1 \
  --project easymoai \
  --log-filter 'severity>=ERROR'

# Supabase connection errors
gcloud run services logs read easymo-whatsapp-bridge \
  --region europe-west1 \
  --project easymoai \
  --log-filter 'textPayload:"Failed to log"'
```

### Supabase Monitoring Queries

```sql
-- Message volume (last hour)
SELECT COUNT(*), direction 
FROM whatsapp_messages 
WHERE created_at > NOW() - INTERVAL '1 hour' 
GROUP BY direction;

-- Active threads (last 24h)
SELECT COUNT(*) 
FROM whatsapp_threads 
WHERE last_message_at > NOW() - INTERVAL '24 hours';

-- Failed messages
SELECT * FROM whatsapp_messages 
WHERE status = 'failed' 
ORDER BY created_at DESC;

-- Vendor responses today
SELECT response_type, COUNT(*) 
FROM vendor_responses 
WHERE created_at >= CURRENT_DATE 
GROUP BY response_type;
```

---

## TROUBLESHOOTING

### Issue: "Missing SUPABASE_SERVICE_ROLE_KEY"

**Fix:**
1. Verify secret exists:
```bash
gcloud secrets describe SUPABASE_SERVICE_ROLE_KEY --project=easymoai
```

2. Verify service account has access:
```bash
gcloud secrets get-iam-policy SUPABASE_SERVICE_ROLE_KEY --project=easymoai
```

3. Redeploy to pick up new secret.

### Issue: Twilio signature validation fails

**Fix:**
1. Check PUBLIC_BASE_URL is set correctly (no trailing slash)
2. Verify Twilio webhook URL matches exactly

### Issue: Messages not appearing in Supabase

**Symptoms:** Logs show "Failed to log inbound message"

**Fix:**
1. Check Cloud Run logs for exact error
2. Verify RLS policies allow service_role:
```sql
SELECT * FROM pg_policies WHERE tablename = 'whatsapp_messages';
```
3. Verify service_role key is valid (test in Supabase Dashboard)

### Issue: Duplicate messages

**Expected behavior:** Idempotency check prevents duplicates
**If duplicates persist:** Check logs for "Duplicate message detected" - should skip processing

---

## ROLLBACK

If deployment fails or has issues:

```bash
# List revisions
gcloud run revisions list \
  --service easymo-whatsapp-bridge \
  --region europe-west1 \
  --project easymoai

# Rollback to previous
gcloud run services update-traffic easymo-whatsapp-bridge \
  --region europe-west1 \
  --project easymoai \
  --to-revisions <PREVIOUS_REVISION>=100
```

---

## SUCCESS CRITERIA ✅

Deployment is successful when:

- [ ] `/health` returns 200 OK
- [ ] Send WhatsApp message → receive auto-reply
- [ ] Inbound message logged to `whatsapp_messages`
- [ ] Thread created/updated in `whatsapp_threads`
- [ ] Webhook events logged to `whatsapp_webhook_events`
- [ ] Delivery status updates received (check after 30s)
- [ ] Vendor quick reply logged to `vendor_responses`
- [ ] No errors in Cloud Run logs

---

## NEXT STEPS (Post-Production)

1. **AI Integration:** Connect Gemini for intelligent buyer conversations
2. **Lead Extraction:** Parse item/location/budget from messages
3. **Broadcast Automation:** Trigger vendor notifications
4. **Quote Collection:** Gather and present vendor responses
5. **Analytics Dashboard:** Real-time metrics and funnel visualization

---

**Estimated Time to Deploy:** 15-20 minutes (including Supabase setup)
**Estimated Time to Test:** 10 minutes
**Total:** ~30 minutes to production-ready WhatsApp bridge
