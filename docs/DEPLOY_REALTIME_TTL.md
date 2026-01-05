# Deployment Guide: Realtime Presence and TTL Cleanup

**Project:** easyMO Discovery  
**Supabase Project:** `rghmxgutlbvzrfztxvaq`  
**Date:** 2025-01-29

---

## Prerequisites

- Supabase project access: https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq
- Supabase CLI installed (`supabase --version`)
- Service role key (provided)

---

## Step 1: Apply Database Migration

### Option A: Via Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq/sql/new
2. Open the migration file: `supabase/migrations/20250129_realtime_presence_ttl.sql`
3. Copy the entire contents
4. Paste into the SQL Editor
5. Click **"Run"** (or press `Cmd+Enter` / `Ctrl+Enter`)
6. Verify success message

### Option B: Via Supabase CLI

```bash
# Set environment variables
export SUPABASE_ACCESS_TOKEN="sbp_917fd2323dec9b674e53204680a5c1d437f1b7ed"
export SUPABASE_DB_PASSWORD="[YOUR_DB_PASSWORD]"

# Link project (if not already linked)
supabase link --project-ref rghmxgutlbvzrfztxvaq

# Push migration
supabase db push
```

### Option C: Via psql (if you have database password)

```bash
psql "postgresql://postgres.rghmxgutlbvzrfztxvaq:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" \
  -f supabase/migrations/20250129_realtime_presence_ttl.sql
```

---

## Step 2: Deploy Edge Functions

### 2.1 Set Supabase Access Token

```bash
export SUPABASE_ACCESS_TOKEN="sbp_917fd2323dec9b674e53204680a5c1d437f1b7ed"
```

Or add to your shell profile (`~/.zshrc` or `~/.bashrc`):
```bash
export SUPABASE_ACCESS_TOKEN="sbp_917fd2323dec9b674e53204680a5c1d437f1b7ed"
```

### 2.2 Deploy Functions

```bash
cd /Volumes/PRO-G40/Projects/repos/easyMO-Discovery

# Deploy cleanup-presence
supabase functions deploy cleanup-presence --project-ref rghmxgutlbvzrfztxvaq

# Deploy cleanup-ride-intents
supabase functions deploy cleanup-ride-intents --project-ref rghmxgutlbvzrfztxvaq

# Deploy cleanup-rate-limits
supabase functions deploy cleanup-rate-limits --project-ref rghmxgutlbvzrfztxvaq
```

### 2.3 Verify Deployment

Check in Supabase Dashboard:
- Go to: https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq/functions
- You should see all three functions listed

---

## Step 3: Schedule Cleanup Jobs

### Option A: Via Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq/functions
2. For each function, click on it and go to **Settings** → **Cron Jobs**
3. Add cron schedule:

   **cleanup-presence:**
   - Schedule: `*/5 * * * *` (every 5 minutes)
   - HTTP Method: `POST`
   - Headers: None required

   **cleanup-ride-intents:**
   - Schedule: `*/5 * * * *` (every 5 minutes)
   - HTTP Method: `POST`
   - Headers: None required

   **cleanup-rate-limits:**
   - Schedule: `0 * * * *` (every hour at minute 0)
   - HTTP Method: `POST`
   - Headers: None required

### Option B: Via Supabase CLI

```bash
# Schedule cleanup-presence (every 5 minutes)
supabase functions schedule cleanup-presence \
  --project-ref rghmxgutlbvzrfztxvaq \
  --cron "*/5 * * * *"

# Schedule cleanup-ride-intents (every 5 minutes)
supabase functions schedule cleanup-ride-intents \
  --project-ref rghmxgutlbvzrfztxvaq \
  --cron "*/5 * * * *"

# Schedule cleanup-rate-limits (every hour)
supabase functions schedule cleanup-rate-limits \
  --project-ref rghmxgutlbvzrfztxvaq \
  --cron "0 * * * *"
```

### Option C: Via pg_cron (if available)

If `pg_cron` extension is enabled, you can schedule directly in SQL:

```sql
-- Enable pg_cron (requires superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup jobs
SELECT cron.schedule('expire-stale-presence', '*/5 * * * *', 'SELECT expire_stale_presence();');
SELECT cron.schedule('expire-stale-ride-intents', '*/5 * * * *', 'SELECT expire_stale_ride_intents();');
SELECT cron.schedule('cleanup-rate-limits', '0 * * * *', 'SELECT cleanup_rate_limits();');
```

---

## Step 4: Enable Realtime

1. Go to: https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq/database/replication
2. Find the following tables/views:
   - `presence_realtime` (view)
   - `ride_intents_realtime` (view)
3. Toggle **"Enable Realtime"** for both views
4. Configure publication (if needed):
   - Events: `INSERT`, `UPDATE`, `DELETE`
   - Filter: None (or add role-based filters if needed)

### Verify Realtime

Run this SQL query to check replication status:

```sql
SELECT 
  schemaname, 
  tablename, 
  CASE WHEN schemaname = 'public' AND tablename IN ('presence_realtime', 'ride_intents_realtime')
    THEN 'Enabled'
    ELSE 'Check Dashboard'
  END AS replication_status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

---

## Step 5: Test Functionality

### 5.1 Test Presence Updates

```sql
-- Test presence update with 10s throttling
SELECT create_or_refresh_presence(
  auth.uid(),
  'driver',
  -1.9441,  -- Kigali coordinates
  30.0619,
  true,
  900,  -- 15 minutes TTL
  '{}'::jsonb
);

-- Try updating again immediately (should be throttled)
SELECT create_or_refresh_presence(
  auth.uid(),
  'driver',
  -1.9441,
  30.0619,
  true,
  900,
  '{}'::jsonb
);
```

### 5.2 Test Ride Intent Creation

```sql
-- Create ride intent (should succeed)
SELECT create_ride_intent_safe(
  auth.uid(),
  -1.9441,  -- Pickup
  30.0619,
  'Kigali, Nyarugenge',
  -1.9500,  -- Dropoff
  30.0700,
  'Kigali, Kacyiru',
  'Test ride',
  900  -- 15 minutes TTL
);

-- Try creating 6 intents rapidly (5th should fail due to rate limit)
-- (Run the above query 6 times quickly)
```

### 5.3 Test Match Queries

```sql
-- Test nearby ride intents query (as driver)
SELECT * FROM get_nearby_ride_intents(
  auth.uid(),
  -1.9441,  -- Driver location
  30.0619,
  10000,  -- 10km radius
  20  -- Limit
);
```

### 5.4 Test Cleanup Functions

```sql
-- Manually trigger cleanup (should return count)
SELECT expire_stale_presence();
SELECT expire_stale_ride_intents();
SELECT cleanup_rate_limits();
```

### 5.5 Test Realtime Subscription (Client-Side)

```typescript
// In your PWA client
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rghmxgutlbvzrfztxvaq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnaG14Z3V0bGJ2enJmenR4dmFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NTU1MDcsImV4cCI6MjA4MTEzMTUwN30.ONdIMXYCppU53M869ENsePw3okULdbuaVv3qkKjiTiM'
);

// Subscribe to presence updates
const presenceChannel = supabase
  .channel('presence-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'presence_realtime',
    filter: 'role=eq.driver',
  }, (payload) => {
    console.log('Presence update:', payload);
  })
  .subscribe();

// Subscribe to ride intents
const intentsChannel = supabase
  .channel('ride-intents-updates')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'ride_intents_realtime',
  }, (payload) => {
    console.log('New ride intent:', payload);
  })
  .subscribe();
```

---

## Verification Checklist

- [ ] Migration applied successfully (no errors in SQL Editor)
- [ ] All three Edge functions deployed
- [ ] Cleanup jobs scheduled (check Functions → Settings → Cron Jobs)
- [ ] Realtime enabled for `presence_realtime` and `ride_intents_realtime`
- [ ] Presence updates work with 10s throttling
- [ ] Ride intent creation enforces rate limits (5 per 10 min)
- [ ] Match queries are throttled (20 per minute)
- [ ] Cleanup functions execute successfully
- [ ] Realtime subscriptions receive updates

---

## Troubleshooting

### Migration Fails

- Check for existing functions/tables that conflict
- Verify PostGIS extension is enabled: `CREATE EXTENSION IF NOT EXISTS postgis;`
- Check RLS policies don't conflict

### Edge Functions Not Deploying

- Verify `SUPABASE_ACCESS_TOKEN` is set correctly
- Check project reference matches: `rghmxgutlbvzrfztxvaq`
- Ensure function files exist in `supabase/functions/[function-name]/index.ts`

### Realtime Not Working

- Verify views exist: `SELECT * FROM presence_realtime LIMIT 1;`
- Check replication is enabled in Dashboard
- Verify RLS policies allow `SELECT` on views
- Check client is authenticated

### Cleanup Jobs Not Running

- Verify cron schedules in Functions → Settings
- Check function logs for errors
- Manually trigger functions to test: `supabase functions invoke cleanup-presence`

---

## Next Steps

1. Monitor cleanup job execution in function logs
2. Set up alerts for rate limit violations
3. Configure abuse reporting workflow
4. Test realtime subscriptions in production
5. Monitor database performance with new indexes

---

## Support

- Supabase Docs: https://supabase.com/docs
- Realtime Guide: https://supabase.com/docs/guides/realtime
- Edge Functions: https://supabase.com/docs/guides/functions

