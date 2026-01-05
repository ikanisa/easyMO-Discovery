# WhatsApp Setup Guide

**Date:** 2025-01-27  
**Purpose:** Configure Meta WhatsApp Business API for broadcast functionality

---

## Prerequisites

1. **Meta Business Account**
   - Create at [business.facebook.com](https://business.facebook.com)
   - Verify your business

2. **WhatsApp Business API Access**
   - Apply for WhatsApp Business API access
   - Or use a Meta Business Partner (recommended for faster setup)

3. **Meta App**
   - Create app at [developers.facebook.com](https://developers.facebook.com)
   - Add WhatsApp product to your app

---

## Step 1: Get WhatsApp API Credentials

### 1.1 Access Token

1. Go to [Meta App Dashboard](https://developers.facebook.com/apps)
2. Select your app
3. Go to **WhatsApp** → **API Setup**
4. Copy **Temporary Access Token** (for testing)
   - Or generate **Permanent Access Token** (for production)
   - For production: Use **System User Token** with proper permissions

### 1.2 Phone Number ID

1. In **WhatsApp** → **API Setup**
2. Copy **Phone number ID** (format: `123456789012345`)

### 1.3 Verify Phone Number

1. In **WhatsApp** → **Phone Numbers**
2. Add and verify your WhatsApp Business phone number
3. Note the phone number (format: `+250788123456`)

---

## Step 2: Configure Supabase Edge Function

### 2.1 Set Environment Variables

In Supabase Dashboard:

1. Go to **Edge Functions** → **Settings**
2. Add secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `WHATSAPP_ACCESS_TOKEN` | `YOUR_ACCESS_TOKEN` | Meta WhatsApp API access token |
| `WHATSAPP_PHONE_ID` | `YOUR_PHONE_ID` | Meta WhatsApp phone number ID |

### 2.2 Via Supabase CLI (Alternative)

```bash
# Set secrets
supabase secrets set WHATSAPP_ACCESS_TOKEN=your_token_here
supabase secrets set WHATSAPP_PHONE_ID=your_phone_id_here
```

---

## Step 3: Create WhatsApp Message Template

### 3.1 Template Requirements

WhatsApp requires message templates for outbound messages (not initiated by user).

1. Go to **WhatsApp** → **Message Templates**
2. Click **Create Template**

### 3.2 Template Example

**Template Name:** `stock_inquiry`

**Category:** `UTILITY`

**Language:** `en`

**Body:**
```
Hello! A customer is looking for: {{1}}

Do you have this available? Please reply YES or NO.
```

**Variables:**
- `{{1}}` - Item/need description

### 3.3 Submit for Approval

- Submit template for Meta approval (usually 24-48 hours)
- Once approved, template can be used in production

---

## Step 4: Test WhatsApp Integration

### 4.1 Test via Edge Function

Call the Edge Function with test data:

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/whatsapp-broadcast \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "test-123",
    "user_id": "user-uuid",
    "need": "paracetamol",
    "action": "start",
    "targets": [
      {
        "business_id": "business-uuid",
        "phone": "+250788123456"
      }
    ]
  }'
```

### 4.2 Check Logs

1. Go to **Edge Functions** → **Logs**
2. Check for:
   - ✅ Success: "Sending X messages"
   - ❌ Error: Check error message

### 4.3 Verify Messages

1. Check WhatsApp Business phone
2. Messages should be sent to target businesses
3. Check `broadcast_messages` table for logged messages

---

## Step 5: Webhook Setup (For Inbound Messages)

### 5.1 Configure Webhook

1. Go to **WhatsApp** → **Configuration**
2. Set **Webhook URL:**
   ```
   https://YOUR_PROJECT.supabase.co/functions/v1/whatsapp-status
   ```
3. Set **Verify Token:** (generate random string)
4. Click **Verify and Save**

### 5.2 Update Edge Function

Update `supabase/functions/whatsapp-status/index.ts` to:
- Verify webhook token
- Handle inbound messages
- Update `broadcast_responses` table
- Update `broadcast_targets.status` to 'replied'

### 5.3 Subscribe to Webhook Events

In **WhatsApp** → **Configuration**:
- Enable **messages** event
- Enable **message_status** event

---

## Step 6: Production Checklist

- [ ] Permanent access token configured (not temporary)
- [ ] Message template approved by Meta
- [ ] Webhook configured and verified
- [ ] Test messages sent successfully
- [ ] Inbound messages received and processed
- [ ] Error handling tested (invalid phone, rate limits, etc.)
- [ ] Monitoring set up (check Edge Function logs regularly)

---

## Troubleshooting

### Error: "Invalid OAuth access token"
- Token expired (temporary tokens expire in 24 hours)
- Solution: Generate new token or use permanent token

### Error: "Template not found"
- Template not approved yet
- Template name doesn't match
- Solution: Wait for approval or check template name

### Error: "Rate limit exceeded"
- WhatsApp has rate limits per phone number
- Solution: Implement retry logic with exponential backoff

### Error: "Invalid phone number"
- Phone number not verified
- Phone number format incorrect (must include country code)
- Solution: Verify phone number in Meta Dashboard

### Messages not received
- Check webhook configuration
- Check Edge Function logs
- Verify phone number is subscribed to WhatsApp Business API
- Check if business has blocked your number

---

## Rate Limits

WhatsApp Business API has rate limits:

- **Tier 1:** 1,000 conversations per 24 hours
- **Tier 2:** 10,000 conversations per 24 hours
- **Tier 3:** 100,000+ conversations per 24 hours

Monitor usage in Meta Dashboard → **WhatsApp** → **Analytics**

---

## Security Best Practices

1. **Never commit tokens to git**
   - Use Supabase secrets only
   - Rotate tokens regularly

2. **Validate webhook requests**
   - Verify webhook signature
   - Check verify token

3. **Rate limiting**
   - Implement rate limiting in Edge Function
   - Respect WhatsApp rate limits

4. **Error handling**
   - Log errors securely
   - Don't expose tokens in error messages

---

## Support

- **Meta WhatsApp Business API Docs:** [developers.facebook.com/docs/whatsapp](https://developers.facebook.com/docs/whatsapp)
- **Supabase Edge Functions Docs:** [supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)
- **WhatsApp Business Support:** [business.facebook.com/help](https://business.facebook.com/help)

