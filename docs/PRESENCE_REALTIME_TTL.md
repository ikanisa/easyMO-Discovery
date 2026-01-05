# Presence Realtime and TTL Cleanup

**Last Updated:** 2025-01-29  
**Status:** Implementation Complete

## Overview

This document describes the realtime presence system, TTL (Time-To-Live) cleanup, rate limiting, and anti-spam mechanisms for the easyMO platform.

---

## Architecture

### Components

1. **Presence Updates** - Driver/passenger location and online status
2. **Ride Intents** - Passenger ride requests with expiration
3. **Realtime Channels** - Supabase Realtime for live updates
4. **Rate Limiting** - Anti-spam protection
5. **Cleanup Jobs** - Automated TTL expiration

---

## Presence Updates

### Update Interval

- **Minimum interval:** 10 seconds
- Updates faster than 10s are ignored (rate limiting)
- Prevents excessive database writes

### TTL Management

- **Default TTL:** 15 minutes (900 seconds)
- **Maximum TTL:** 15 minutes (enforced)
- **Expiration:** `expires_at = NOW() + 15 minutes` on each update
- **Auto-cleanup:** Expired presence marked as offline automatically

### Online/Offline Toggle

Users can toggle their online status:
- **Online:** `is_online = true` (visible to others)
- **Offline:** `is_online = false` (hidden from queries)

### Function: `create_or_refresh_presence`

```sql
create_or_refresh_presence(
  p_user_id UUID,
  p_role TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_is_online BOOLEAN DEFAULT true,
  p_ttl_seconds INTEGER DEFAULT 900,
  p_meta JSONB DEFAULT '{}'::jsonb
)
```

**Behavior:**
- Enforces 10s minimum update interval
- Sets `expires_at = NOW() + 15min` on each update
- Updates `last_seen_at` timestamp
- Returns user_id (even if update was throttled)

**Example Usage:**
```typescript
const { data, error } = await supabase.rpc('create_or_refresh_presence', {
  p_user_id: userId,
  p_role: 'driver',
  p_lat: location.lat,
  p_lng: location.lng,
  p_is_online: true,
  p_ttl_seconds: 900, // 15 minutes
  p_meta: { vehicle_type: 'moto' }
});
```

---

## Ride Intents

### Expiration

- **TTL Range:** 10-15 minutes (600-900 seconds)
- **Default:** 15 minutes (900 seconds)
- **Enforcement:** Automatically enforced in `create_ride_intent_safe()`
- **Status:** Expired intents marked as `'cancelled'`

### Function: `create_ride_intent_safe`

```sql
create_ride_intent_safe(
  p_passenger_id UUID,
  p_pickup_lat DOUBLE PRECISION,
  p_pickup_lng DOUBLE PRECISION,
  p_pickup_address TEXT DEFAULT NULL,
  p_dropoff_lat DOUBLE PRECISION DEFAULT NULL,
  p_dropoff_lng DOUBLE PRECISION DEFAULT NULL,
  p_dropoff_address TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_ttl_seconds INTEGER DEFAULT 900
)
```

**Rate Limiting:**
- Max 5 intents per 10 minutes per user
- Returns error if limit exceeded

**Example Usage:**
```typescript
const { data, error } = await supabase.rpc('create_ride_intent_safe', {
  p_passenger_id: userId,
  p_pickup_lat: pickup.lat,
  p_pickup_lng: pickup.lng,
  p_pickup_address: 'Kigali, Nyarugenge',
  p_dropoff_lat: dropoff?.lat,
  p_dropoff_lng: dropoff?.lng,
  p_ttl_seconds: 900 // 10-15 min
});
```

---

## Realtime Channels

### Channel Configuration

Realtime channels are configured via Supabase Dashboard. This section documents the expected configuration.

### 1. Presence Channel

**Channel Name:** `presence-updates`

**Table:** `presence_realtime` (view with sanitized coordinates)

**Security:**
- Users can only see presence updates for their role
- Coordinates are rounded to ~100m precision (0.001 degrees)
- Exact coordinates are NOT broadcast publicly

**Subscription Example:**
```typescript
const channel = supabase
  .channel('presence-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'presence_realtime',
    filter: `role=eq.${userRole}`,
  }, (payload) => {
    // Handle presence update
    // payload.new contains sanitized location data
  })
  .subscribe();
```

**Events:**
- `INSERT` - New user comes online
- `UPDATE` - User location/status changes
- `DELETE` - User goes offline (or presence expires)

### 2. Ride Intents Channel

**Channel Name:** `ride-intents-updates`

**Table:** `ride_intents_realtime` (view with sanitized coordinates)

**Security:**
- Only drivers can subscribe
- Coordinates are rounded to ~100m precision
- Only pending intents within radius are visible

**Subscription Example:**
```typescript
const channel = supabase
  .channel('ride-intents-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'ride_intents_realtime',
    filter: `status=eq.pending`,
  }, (payload) => {
    // Handle new ride intent
    // payload.new contains sanitized location data
  })
  .subscribe();
```

**Events:**
- `INSERT` - New ride intent created
- `UPDATE` - Intent status changes (matched, cancelled, etc.)
- `DELETE` - Intent expires or is cancelled

### Enabling Realtime in Supabase Dashboard

1. Go to **Database** → **Replication**
2. Enable replication for:
   - `presence_realtime` view
   - `ride_intents_realtime` view
3. Configure RLS policies to allow authenticated users to read

**Important:** The views use sanitized coordinates (rounded to ~100m precision) to protect user privacy. Exact coordinates are only accessible via RPC functions with proper authentication.

---

## Rate Limiting

### Rate Limit Table

The `rate_limits` table tracks user activity per resource type.

**Schema:**
- `user_id` - User identifier
- `resource_type` - Type of resource ('ride_intent', 'match_query', etc.)
- `count` - Number of requests in current window
- `window_start` - Start of current time window

### Rate Limits

| Resource Type | Max Count | Window | Purpose |
|--------------|-----------|--------|---------|
| `ride_intent` | 5 | 10 minutes | Prevent spam ride requests |
| `match_query` | 20 | 1 minute | Throttle driver match queries |

### Function: `check_rate_limit`

```sql
check_rate_limit(
  p_user_id UUID,
  p_resource_type TEXT,
  p_max_count INTEGER,
  p_window_seconds INTEGER
) RETURNS BOOLEAN
```

**Returns:**
- `true` - Request allowed
- `false` - Rate limit exceeded

**Automatic Cleanup:**
- Old rate limit entries (>1 hour) are cleaned up automatically

---

## Anti-Spam

### Abuse Reporting

Users can report abusive behavior via the `abuse_reports` table.

**Report Types:**
- Spam ride intents
- Fake presence updates
- Harassment
- Other violations

**Function:**
```typescript
const { data, error } = await supabase
  .from('abuse_reports')
  .insert({
    reporter_id: userId,
    reported_user_id: reportedUserId,
    resource_type: 'ride_intent',
    resource_id: intentId,
    reason: 'spam',
    details: 'User created multiple fake ride intents'
  });
```

**Review Process:**
- Reports are reviewed by admins
- Status: `pending` → `reviewed` → `resolved`/`dismissed`

---

## Cleanup Jobs

### 1. Presence Cleanup

**Function:** `expire_stale_presence()`

**Schedule:** Every 5 minutes (recommended)

**Actions:**
- Marks expired presence (`expires_at < NOW()`) as offline
- Deletes very old presence entries (>24 hours)

**Setup (pg_cron):**
```sql
SELECT cron.schedule(
  'expire-stale-presence',
  '*/5 * * * *',
  'SELECT expire_stale_presence();'
);
```

**Setup (Supabase Edge Function):**
Create an Edge Function with cron trigger:
```typescript
// supabase/functions/cleanup-presence/index.ts
import { createClient } from '@supabase/supabase-js';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  const { data, error } = await supabase.rpc('expire_stale_presence');
  
  return new Response(JSON.stringify({ count: data }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### 2. Ride Intents Cleanup

**Function:** `expire_stale_ride_intents()`

**Schedule:** Every 5 minutes (recommended)

**Actions:**
- Marks expired intents as `'cancelled'`
- Deletes old cancelled/completed intents (>7 days)

**Setup (pg_cron):**
```sql
SELECT cron.schedule(
  'expire-stale-ride-intents',
  '*/5 * * * *',
  'SELECT expire_stale_ride_intents();'
);
```

### 3. Rate Limits Cleanup

**Function:** `cleanup_rate_limits()`

**Schedule:** Every hour (recommended)

**Actions:**
- Deletes rate limit entries older than 1 hour

**Setup (pg_cron):**
```sql
SELECT cron.schedule(
  'cleanup-rate-limits',
  '0 * * * *',
  'SELECT cleanup_rate_limits();'
);
```

---

## Security Considerations

### Location Privacy

1. **Sanitized Coordinates:**
   - Realtime views round coordinates to ~100m precision
   - Exact coordinates only visible via RPC functions with proper auth

2. **RLS Policies:**
   - Users can only update their own presence
   - Presence reads restricted to RPC functions
   - Ride intents only visible to passengers (owners) and nearby drivers

3. **Rate Limiting:**
   - Prevents coordinate spam
   - Limits abuse of matching system

### Abuse Prevention

1. **Rate Limits:**
   - Max 5 ride intents per 10 minutes
   - Max 20 match queries per minute

2. **TTL Enforcement:**
   - Presence expires after 15 minutes
   - Ride intents expire after 10-15 minutes
   - Automatic cleanup prevents stale data

3. **Abuse Reporting:**
   - Users can report violations
   - Admins can review and take action

---

## Client-Side Implementation

### Presence Updates

```typescript
// Update presence with throttling
async function updatePresence(
  role: 'driver' | 'passenger',
  location: { lat: number; lng: number },
  isOnline: boolean
) {
  const { data, error } = await supabase.rpc('create_or_refresh_presence', {
    p_user_id: userId,
    p_role: role,
    p_lat: location.lat,
    p_lng: location.lng,
    p_is_online: isOnline,
    p_ttl_seconds: 900, // 15 minutes
    p_meta: {}
  });
  
  if (error) {
    console.error('Presence update failed:', error);
  }
}

// Subscribe to presence updates
const presenceChannel = supabase
  .channel('presence-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'presence_realtime',
    filter: `role=eq.driver`,
  }, (payload) => {
    // Handle nearby driver updates
    const { lat_approx, lng_approx, is_online } = payload.new;
    // Update UI with sanitized location
  })
  .subscribe();
```

### Ride Intents

```typescript
// Create ride intent with rate limiting
async function createRideIntent(
  pickup: { lat: number; lng: number; address?: string },
  dropoff?: { lat: number; lng: number; address?: string }
) {
  const { data, error } = await supabase.rpc('create_ride_intent_safe', {
    p_passenger_id: userId,
    p_pickup_lat: pickup.lat,
    p_pickup_lng: pickup.lng,
    p_pickup_address: pickup.address,
    p_dropoff_lat: dropoff?.lat,
    p_dropoff_lng: dropoff?.lng,
    p_dropoff_address: dropoff?.address,
    p_ttl_seconds: 900
  });
  
  if (error) {
    if (error.message.includes('Rate limit exceeded')) {
      // Show user-friendly error
      toast.error('Too many ride requests. Please wait a few minutes.');
    } else {
      console.error('Ride intent creation failed:', error);
    }
  }
  
  return data; // Returns intent_id
}

// Subscribe to ride intents (for drivers)
const intentsChannel = supabase
  .channel('ride-intents-updates')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'ride_intents_realtime',
  }, (payload) => {
    // Handle new ride intent
    const intent = payload.new;
    // Show notification to driver
  })
  .subscribe();
```

---

## Monitoring

### Key Metrics

1. **Presence Updates:**
   - Update frequency per user
   - Throttled update count
   - Expired presence count

2. **Ride Intents:**
   - Creation rate
   - Rate limit violations
   - Expiration rate

3. **Rate Limits:**
   - Violations per resource type
   - Cleanup efficiency

### Queries

```sql
-- Count active presence entries
SELECT COUNT(*) FROM presence WHERE is_online = true AND expires_at > NOW();

-- Count pending ride intents
SELECT COUNT(*) FROM ride_intents WHERE status = 'pending' AND expires_at > NOW();

-- Rate limit violations (last hour)
SELECT resource_type, COUNT(*) as violations
FROM rate_limits
WHERE window_start > NOW() - INTERVAL '1 hour'
  AND count > (
    CASE resource_type
      WHEN 'ride_intent' THEN 5
      WHEN 'match_query' THEN 20
      ELSE 0
    END
  )
GROUP BY resource_type;

-- Abuse reports (pending review)
SELECT COUNT(*) FROM abuse_reports WHERE status = 'pending';
```

---

## Troubleshooting

### Presence Not Updating

1. **Check minimum interval:** Updates faster than 10s are ignored
2. **Check TTL:** Ensure `expires_at` is in the future
3. **Check RLS:** Verify user has permission to update own presence

### Ride Intents Not Appearing

1. **Check rate limit:** User may have exceeded 5 intents per 10 minutes
2. **Check expiration:** Intents expire after 10-15 minutes
3. **Check status:** Only `'pending'` intents are visible

### Realtime Not Working

1. **Check replication:** Ensure views are enabled for replication in Supabase Dashboard
2. **Check RLS:** Verify authenticated users can read from views
3. **Check subscription:** Verify channel name and filter match

---

## References

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [PostgreSQL pg_cron Extension](https://github.com/citusdata/pg_cron)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

