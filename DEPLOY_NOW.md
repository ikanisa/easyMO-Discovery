# 🚀 Quick Deployment Commands

**Run these commands in your terminal to complete deployment**

---

## ✅ Database Already Deployed!

Your database migrations are already deployed:
- ✅ `presence` table created
- ✅ `scheduled_trips` table created
- ✅ `user_profiles` table created
- ✅ `agent_memories` table created
- ✅ `get_nearby_drivers()` function created

**No database push needed!**

---

## 📦 Deploy Edge Functions

Copy and paste these commands into your terminal:

```bash
cd /Users/jeanbosco/workspace/easyMO-Discovery

# Deploy critical functions (1-5)
supabase functions deploy chat-gemini --no-verify-jwt
supabase functions deploy schedule-trip
supabase functions deploy update-presence
supabase functions deploy whatsapp-broadcast
supabase functions deploy whatsapp-status

# Deploy supporting functions (6-10)
supabase functions deploy whatsapp-log-message
supabase functions deploy whatsapp-log-webhook-event
supabase functions deploy whatsapp-update-status
supabase functions deploy lead-state-update
supabase functions deploy vendor-notify
```

---

## 🔐 Set Secrets

```bash
# Required: Gemini API Key
supabase secrets set GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Twilio (for WhatsApp features)
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token
supabase secrets set TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
supabase secrets set TWILIO_CONTENT_SID_EASYMO_BUSINESS=HXxxxxxxxxxx
```

---

## ✅ Verify Deployment

```bash
# List deployed functions
supabase functions list

# Check secrets (shows names only)
supabase secrets list

# Test chat-gemini function
curl -X POST \
  https://rghmxgutlbvzrfztxvaq.supabase.co/functions/v1/chat-gemini \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello test"}'
```

---

## 🧪 Test the App

```bash
# Build the app
npm run build

# Run locally
npm run dev
```

Then open http://localhost:5173 and test:
- Discovery page → Find nearby drivers
- Schedule a trip → Check if it saves
- AI chat → Verify agents respond

---

## 📋 Deployment Checklist

- [x] Database migrations deployed (already done via psql)
- [ ] Edge functions deployed (run commands above)
- [ ] GEMINI_API_KEY secret set
- [ ] Verify deployment with `supabase functions list`
- [ ] Test app with `npm run dev`

---

## 🆘 If You Get Errors

### "supabase: command not found"
**Install Supabase CLI:**
```bash
brew install supabase/tap/supabase
# or
npm install -g supabase
```

### "Not logged in"
**Login to Supabase:**
```bash
supabase login
```

### "GEMINI_API_KEY not configured"
**Get API key from:**
- https://ai.google.dev
- Then set it: `supabase secrets set GEMINI_API_KEY=your_key`

---

## 🎯 What Happens After Deployment

Once deployed:
- ✅ Discovery page will find real nearby drivers using PostGIS
- ✅ Trip scheduling will save to database
- ✅ AI agents will respond via Gemini
- ✅ User profiles will show real names
- ✅ WhatsApp broadcasts will work (if Twilio configured)

---

## 📞 Quick Commands Reference

```bash
# Deploy single function
supabase functions deploy function-name

# Deploy all at once (copy/paste all 10 lines above)

# View function logs
supabase functions logs function-name --tail

# Update secret
supabase secrets set KEY=value

# Remove secret
supabase secrets unset KEY
```

---

**Estimated Time:** 10 minutes  
**Next:** After running these commands, test the Discovery page!

**Current Status:** Database ✅ | Functions ⏳ | Secrets ⏳ | Testing ⏳
