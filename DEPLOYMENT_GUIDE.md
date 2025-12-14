# 🚀 easyMO Discovery - Deployment Guide

## ✅ Pre-Deployment Checklist

All services are ready for production deployment:

- ✅ **Database:** All migrations pushed to Supabase
- ✅ **WhatsApp Bridge:** Deployed on Google Cloud Run
- ✅ **Twilio:** Webhook configured and online
- ✅ **Code:** All fixes applied, tests passing
- ✅ **Build:** Optimized (21KB CSS, production-ready)

---

## 🎯 Frontend Deployment - Vercel (Recommended)

### Step 1: Connect to Vercel

1. Go to: https://vercel.com
2. Click "Sign in with GitHub"
3. Authorize Vercel to access your repositories

### Step 2: Import Project

1. Click "New Project" or "Add New..."
2. Find and select: `ikanisa/easyMO-Discovery`
3. Click "Import"

### Step 3: Configure Project

Vercel will auto-detect settings:
- ✅ Framework: Vite
- ✅ Build Command: `npm run build`
- ✅ Output Directory: `dist`
- ✅ Install Command: `npm install`

**Do NOT change these - they're correct!**

### Step 4: Add Environment Variables

Click "Environment Variables" and add these **8 variables**:

```bash
# Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Twilio WhatsApp
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+your_number_here
TWILIO_CONTENT_SID_EASYMO_BUSINESS=your_content_sid_here

# Admin
ADMIN_API_KEY=your_admin_api_key_here
```

**Copy the actual values from your local .env.local file**

**Important:** Set all variables to **Production** environment!

### Step 5: Deploy!

1. Click "Deploy"
2. Wait 2-3 minutes for build to complete
3. Your app will be live! 🎉

### Step 6: Get Your URL

After deployment, Vercel gives you:
- Production URL: `your-app.vercel.app`
- Automatic HTTPS ✅
- Global CDN ✅

---

## 🔒 Security - CRITICAL!

**⚠️ BEFORE GOING LIVE TOMORROW:**

You MUST rotate all credentials (they were shared in chat):

### 1. Rotate Database Password
```bash
# Supabase Dashboard → Settings → Database → Reset database password
```

### 2. Rotate Supabase API Keys
```bash
# Supabase Dashboard → Settings → API → Rotate anon key
```

### 3. Rotate Twilio Credentials
```bash
# Twilio Console → Account → Reset auth token
```

### 4. Rotate Gemini API Key
```bash
# Google AI Studio → API Keys → Create new key
```

### 5. Rotate Admin API Key
```bash
# Regenerate your admin key
```

**After rotating, update environment variables in:**
- Vercel Dashboard (for frontend)
- Google Cloud Secret Manager (for WhatsApp bridge)
- Local `.env.local` (for development)

---

## 🧪 Post-Deployment Testing

### Test Frontend
1. Open your Vercel URL
2. Check all pages load
3. Test authentication
4. Test API connections

### Test WhatsApp Integration
1. Send message to: +15558609909
2. Check Cloud Run logs
3. Verify responses

### Test Database
1. Check Supabase dashboard
2. Verify data is being saved
3. Check for errors in logs

---

## 📊 Monitoring

### Vercel
- Dashboard: https://vercel.com/dashboard
- View: Deployments, Analytics, Logs

### Google Cloud Run
```bash
gcloud run services logs read easymo-whatsapp-bridge \
  --region=europe-west1 \
  --project=easymoai \
  --limit=50
```

### Supabase
- Dashboard: https://supabase.com/dashboard
- View: Database, API logs, Auth logs

---

## 🚀 Continuous Deployment

**Auto-deploy on Git Push:**
- Push to `main` branch → Auto-deploys frontend (Vercel)
- Update `services/whatsapp-bridge/**` → Auto-deploys backend (GitHub Actions)

---

## 🆘 Troubleshooting

### Build Fails on Vercel
```bash
# Check build logs in Vercel dashboard
# Common issues:
# - Missing environment variables
# - Node version mismatch
# - Build command incorrect
```

### WhatsApp Messages Not Working
```bash
# Check Cloud Run logs
gcloud run services logs read easymo-whatsapp-bridge --region=europe-west1

# Verify Twilio webhook URL is correct
# Check secrets are loaded in Cloud Run
```

### Database Connection Issues
```bash
# Check Supabase status
# Verify connection string
# Check RLS policies
```

---

## 📞 Support

**Deployment Created:** 2024-12-14
**Status:** Production Ready ✅
**Services:** All operational ✅

**Next Steps:**
1. Deploy to Vercel
2. Test thoroughly
3. Rotate credentials
4. Go live! 🎉
