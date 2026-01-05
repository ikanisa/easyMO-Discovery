# Deployment Status: Realtime Presence and TTL Cleanup

**Date:** 2025-01-29  
**Project:** rghmxgutlbvzrfztxvaq  
**Status:** ✅ Edge Functions Deployed | ⏳ Migration Pending | ⏳ Scheduling Pending

---

## ✅ Completed

### 1. Edge Functions Deployed

All three cleanup functions have been successfully deployed:

- ✅ **cleanup-presence** - Deployed
  - Dashboard: https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq/functions/cleanup-presence
  - Function: `expire_stale_presence()`
  - Schedule: Every 5 minutes (pending)

- ✅ **cleanup-ride-intents** - Deployed
  - Dashboard: https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq/functions/cleanup-ride-intents
  - Function: `expire_stale_ride_intents()`
  - Schedule: Every 5 minutes (pending)

- ✅ **cleanup-rate-limits** - Deployed
  - Dashboard: https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq/functions/cleanup-rate-limits
  - Function: `cleanup_rate_limits()`
  - Schedule: Every hour (pending)

---

## ⏳ Pending Steps

### 2. Apply Database Migration

**Action Required:** Apply the migration via Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq/sql/new
2. Open file: `supabase/migrations/20250129_realtime_presence_ttl.sql`
3. Copy entire contents
4. Paste into SQL Editor
5. Click **"Run"**

**What this migration does:**
- Updates `create_or_refresh_presence` with 10s throttling and 15min TTL
- Creates `expire_stale_presence()` function
- Creates `expire_stale_ride_intents()` function
- Creates `check_rate_limit()` and `cleanup_rate_limits()` functions
- Creates `create_ride_intent_safe()` with rate limiting
- Creates `get_nearby_ride_intents()` with throttling
- Creates `abuse_reports` table
- Creates `rate_limits` table
- Creates `presence_realtime` and `ride_intents_realtime` views

---

### 3. Schedule Cleanup Jobs

**Action Required:** Schedule the Edge functions via Supabase Dashboard

For each function:

1. Go to: https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq/functions
2. Click on the function name
3. Go to **Settings** → **Cron Jobs**
4. Click **"Add Cron Job"**
5. Configure:

   **cleanup-presence:**
   - Schedule: `*/5 * * * *` (every 5 minutes)
   - HTTP Method: `POST`
   - Headers: None

   **cleanup-ride-intents:**
   - Schedule: `*/5 * * * *` (every 5 minutes)
   - HTTP Method: `POST`
   - Headers: None

   **cleanup-rate-limits:**
   - Schedule: `0 * * * *` (every hour at minute 0)
   - HTTP Method: `POST`
   - Headers: None

**Alternative (CLI):**
```bash
export SUPABASE_ACCESS_TOKEN="sbp_917fd2323dec9b674e53204680a5c1d437f1b7ed"

supabase functions schedule cleanup-presence \
  --project-ref rghmxgutlbvzrfztxvaq \
  --cron "*/5 * * * *"

supabase functions schedule cleanup-ride-intents \
  --project-ref rghmxgutlbvzrfztxvaq \
  --cron "*/5 * * * *"

supabase functions schedule cleanup-rate-limits \
  --project-ref rghmxgutlbvzrfztxvaq \
  --cron "0 * * * *"
```

---

### 4. Enable Realtime

**Action Required:** Enable Realtime for views in Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq/database/replication
2. Find and enable Realtime for:
   - ✅ `presence_realtime` (view)
   - ✅ `ride_intents_realtime` (view)
3. Configure events: `INSERT`, `UPDATE`, `DELETE`

**Note:** The views are created by the migration. If they don't appear, ensure the migration has been applied.

---

## 📋 Quick Checklist

- [ ] Apply database migration (`20250129_realtime_presence_ttl.sql`)
- [ ] Schedule `cleanup-presence` (every 5 minutes)
- [ ] Schedule `cleanup-ride-intents` (every 5 minutes)
- [ ] Schedule `cleanup-rate-limits` (every hour)
- [ ] Enable Realtime for `presence_realtime` view
- [ ] Enable Realtime for `ride_intents_realtime` view
- [ ] Test presence updates with 10s throttling
- [ ] Test ride intent creation with rate limiting
- [ ] Test realtime subscriptions
- [ ] Verify cleanup functions execute successfully

---

## 🔗 Useful Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq
- **SQL Editor:** https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq/sql/new
- **Functions:** https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq/functions
- **Replication:** https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq/database/replication
- **Documentation:** `docs/PRESENCE_REALTIME_TTL.md`
- **Deployment Guide:** `docs/DEPLOY_REALTIME_TTL.md`

---

## 🧪 Testing

After completing the pending steps, test the following:

### Test Presence Updates
```sql
SELECT create_or_refresh_presence(
  auth.uid(),
  'driver',
  -1.9441,
  30.0619,
  true,
  900
);
```

### Test Ride Intent Creation
```sql
SELECT create_ride_intent_safe(
  auth.uid(),
  -1.9441,
  30.0619,
  'Kigali, Nyarugenge',
  NULL,
  NULL,
  NULL,
  'Test ride',
  900
);
```

### Test Cleanup Functions
```sql
SELECT expire_stale_presence();
SELECT expire_stale_ride_intents();
SELECT cleanup_rate_limits();
```

---

## 📝 Notes

- Edge functions require `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables (set automatically by Supabase)
- Migration must be applied before scheduling cleanup jobs
- Realtime views are created by the migration
- All RPC functions are secured with `SECURITY DEFINER` and proper RLS policies

