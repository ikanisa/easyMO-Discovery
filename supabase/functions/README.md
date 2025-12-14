# Supabase Edge Functions

## Overview

These Edge Functions provide serverless API endpoints for WhatsApp bridge operations.

## Functions

### 1. `whatsapp-log-message`
**Purpose:** Log inbound/outbound WhatsApp messages with idempotency

**Endpoint:** `https://[project-ref].supabase.co/functions/v1/whatsapp-log-message`

**Request Body:**
```json
{
  "message_sid": "SM...",
  "direction": "inbound|outbound",
  "from_number": "whatsapp:+250...",
  "to_number": "whatsapp:+250...",
  "body": "Message text",
  "button_text": "Optional quick reply",
  "button_payload": "Optional payload",
  "status": "received|sent|delivered",
  "metadata": {}
}
```

**Features:**
- Duplicate detection (idempotency)
- Automatic thread creation/update
- Message count tracking

---

### 2. `whatsapp-log-webhook-event`
**Purpose:** Log raw webhook events for audit trail

**Endpoint:** `https://[project-ref].supabase.co/functions/v1/whatsapp-log-webhook-event`

**Request Body:**
```json
{
  "event_type": "inbound|status|admin_send",
  "message_sid": "SM...",
  "payload": { ... },
  "signature_valid": true
}
```

---

### 3. `whatsapp-update-status`
**Purpose:** Update message delivery status

**Endpoint:** `https://[project-ref].supabase.co/functions/v1/whatsapp-update-status`

**Request Body:**
```json
{
  "message_sid": "SM...",
  "status": "delivered|read|failed",
  "delivered_at": "2025-12-14T17:00:00Z",
  "read_at": "2025-12-14T17:05:00Z",
  "error_code": "30003",
  "error_message": "Optional error"
}
```

---

### 4. `lead-state-update`
**Purpose:** Update lead status and log funnel events

**Endpoint:** `https://[project-ref].supabase.co/functions/v1/lead-state-update`

**Request Body:**
```json
{
  "lead_id": "uuid",
  "from_state": "new",
  "to_state": "broadcasted",
  "reason": "broadcast_sent",
  "metadata": {}
}
```

---

### 5. `vendor-notify`
**Purpose:** Log vendor responses and update lead quote counts

**Endpoint:** `https://[project-ref].supabase.co/functions/v1/vendor-notify`

**Request Body:**
```json
{
  "lead_id": "uuid",
  "vendor_phone": "whatsapp:+250...",
  "response_type": "have_it|no_stock|stop",
  "message_sid": "SM...",
  "button_text": "I have it ✅"
}
```

**Features:**
- Logs vendor response
- Increments lead quote_count if "have_it"
- Updates lead status to "quoted"

---

## Deployment

### Prerequisites
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login
```

### Deploy All Functions
```bash
# Link to your project
supabase link --project-ref rghmxgutlbvzrfztxvaq

# Deploy all functions
supabase functions deploy whatsapp-log-message
supabase functions deploy whatsapp-log-webhook-event
supabase functions deploy whatsapp-update-status
supabase functions deploy lead-state-update
supabase functions deploy vendor-notify
```

### Set Secrets
```bash
# Required for all functions
supabase secrets set SUPABASE_URL=https://rghmxgutlbvzrfztxvaq.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Test Function
```bash
# Test locally
supabase functions serve whatsapp-log-message

# Test deployed function
curl -X POST \
  https://rghmxgutlbvzrfztxvaq.supabase.co/functions/v1/whatsapp-log-message \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message_sid": "SMtest123",
    "direction": "inbound",
    "from_number": "whatsapp:+250788000000",
    "to_number": "whatsapp:+250788111111",
    "body": "Test message"
  }'
```

---

## Usage from Cloud Run

The WhatsApp Bridge (Cloud Run) can call these functions instead of direct database access for better separation of concerns.

**Example:**
```javascript
// Instead of direct Supabase insert in index.js
const response = await fetch(
  'https://rghmxgutlbvzrfztxvaq.supabase.co/functions/v1/whatsapp-log-message',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message_sid: messageSid,
      direction: 'inbound',
      from_number: from,
      to_number: to,
      body: body
    })
  }
)
```

---

## Monitoring

### View Logs
```bash
# All functions
supabase functions logs

# Specific function
supabase functions logs whatsapp-log-message

# Follow live logs
supabase functions logs whatsapp-log-message --follow
```

### Check Invocations
Go to: https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq/functions

---

## Security

- All functions require authentication (Bearer token)
- Use SUPABASE_SERVICE_ROLE_KEY for full access
- Use SUPABASE_ANON_KEY for RLS-protected access
- CORS enabled for web clients
- Input validation on all endpoints

---

## Cost Optimization

- Edge Functions: **Free tier includes 500K invocations/month**
- After that: **$2 per 1M invocations**
- Functions run close to users (low latency)
- Auto-scaling built-in

---

## Next Steps

1. Deploy functions to Supabase
2. Test each endpoint
3. (Optional) Refactor Cloud Run to use Edge Functions
4. Monitor usage and performance
5. Add more functions as needed (AI integration, analytics, etc.)

---

## Related Documentation

- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
- **Deno Deploy:** https://deno.com/deploy/docs
- **Database Schema:** `../migrations/001_whatsapp_tables.sql`
