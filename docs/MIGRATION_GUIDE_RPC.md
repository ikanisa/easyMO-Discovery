# Migration Guide: Using New RPC Functions

**Date:** 2025-01-28  
**Migration:** `20250128_ai_first_schema.sql`

## Overview

This guide explains how to migrate from direct database queries to the new RPC functions for better security and consistency.

## Changes Summary

### 1. Presence Updates

**Before:**
```typescript
await supabase
  .from('presence')
  .upsert({
    user_id: user.id,
    role: role,
    vehicle_type: vehicleType || 'other',
    location: `POINT(${location.lng} ${location.lat})`,
    is_online: isOnline,
    last_seen: new Date().toISOString()
  });
```

**After:**
```typescript
await supabase.rpc('create_or_refresh_presence', {
  p_user_id: user.id,
  p_role: role,
  p_lat: location.lat,
  p_lng: location.lng,
  p_is_online: isOnline,
  p_ttl_seconds: 3600, // 1 hour default
  p_meta: vehicleType ? { vehicle_type: vehicleType } : {}
});
```

**Benefits:**
- Automatic TTL expiration
- Geohash calculation
- Metadata support (JSONB)
- Validates user ownership

---

### 2. Presence Queries

**Before:**
```typescript
// Old function (still works but deprecated)
const { data } = await supabase.rpc('get_nearby_drivers', {
  user_lat: location.lat,
  user_lng: location.lng,
  radius_meters: 5000
});
```

**After:**
```typescript
// New function (supports all roles)
const { data } = await supabase.rpc('get_nearby_presence', {
  p_role: 'driver', // or 'passenger', 'vendor'
  p_lat: location.lat,
  p_lng: location.lng,
  p_radius_m: 5000, // meters
  p_limit: 50
});
```

**Response Format:**
```typescript
{
  user_id: UUID,
  role: string,
  lat: number,
  lng: number,
  distance_m: number,
  is_online: boolean,
  last_seen_at: string,
  meta: { vehicle_type?: string, ... }
}
```

**Benefits:**
- Supports all roles (not just drivers)
- Returns metadata from JSONB
- Consistent response format
- Respects RLS policies

---

### 3. Worker Presence Tools

**Before:**
```typescript
await supabase.upsert('presence', {
  user_id,
  role,
  vehicle_type: vehicle_type || 'other',
  location: locationPoint,
  is_online: true,
  last_seen: new Date().toISOString(),
}, 'user_id');
```

**After:**
```typescript
const { data, error } = await supabase.rpc('create_or_refresh_presence', {
  p_user_id: user_id,
  p_role: role,
  p_lat: location.lat,
  p_lng: location.lng,
  p_is_online: true,
  p_ttl_seconds: ttl || 3600,
  p_meta: vehicle_type ? { vehicle_type } : {}
});
```

---

### 4. Matching (New Feature)

**New RPC Function:** `create_match_candidates(intent_id, limit_candidates)`

```typescript
// Create ride intent first
const { data: intent } = await supabase
  .from('ride_intents')
  .insert({
    passenger_id: user.id,
    pickup_lat: location.lat,
    pickup_lng: location.lng,
    pickup_location: `POINT(${location.lng} ${location.lat})`,
    status: 'pending',
    expires_at: new Date(Date.now() + 3600000).toISOString()
  })
  .select()
  .single();

// Create match candidates
const { data: matches } = await supabase.rpc('create_match_candidates', {
  p_intent_id: intent.id,
  p_limit_candidates: 10
});
```

**Response:**
```typescript
{
  match_id: UUID,
  driver_id: UUID,
  score: number,
  eta_seconds: number,
  distance_m: number
}[]
```

---

## Migration Steps

### Step 1: Apply Database Migration

```bash
# If using Supabase CLI locally
supabase db reset

# Or apply incrementally
supabase migration up
```

### Step 2: Update Application Code

1. **Update `apps/pwa/services/presence.ts`:**
   - ✅ `upsertPresence()` - Use `create_or_refresh_presence`
   - ✅ `getNearby()` - Use `get_nearby_presence`
   - ✅ `goOffline()` - Use `create_or_refresh_presence` with `is_online: false`

2. **Update `services/agent-runtime/src/tools/presence.ts`:**
   - ✅ `publishPresence()` - Use `create_or_refresh_presence`
   - ✅ `findMatches()` - Use `get_nearby_presence`

### Step 3: Test RPC Functions

Run the test script:

```bash
# Using Supabase CLI
supabase db execute -f supabase/test_rpc_functions.sql

# Or using psql directly
psql -h localhost -U postgres -d postgres -f supabase/test_rpc_functions.sql
```

### Step 4: Verify in Application

1. Test presence updates (driver/vendor going online)
2. Test presence queries (passenger finding drivers)
3. Test offline status updates
4. Test matching flow (if implemented)

---

## Breaking Changes

### 1. Direct SELECT on `presence` Table

**⚠️ BREAKING:** Direct SELECT queries on `presence` are now blocked by RLS.

**Before:**
```typescript
const { data } = await supabase
  .from('presence')
  .select('*')
  .eq('role', 'driver');
```

**After:**
```typescript
// Must use RPC function
const { data } = await supabase.rpc('get_nearby_presence', {
  p_role: 'driver',
  p_lat: centerLat,
  p_lng: centerLng,
  p_radius_m: 10000,
  p_limit: 50
});
```

### 2. Response Format Changes

**Old `get_nearby_drivers` response:**
```typescript
{
  user_id: UUID,
  vehicle_type: string,
  lat: number,
  lng: number,
  dist_meters: number,
  last_seen: string
}
```

**New `get_nearby_presence` response:**
```typescript
{
  user_id: UUID,
  role: string,           // NEW
  lat: number,
  lng: number,
  distance_m: number,    // Renamed from dist_meters
  is_online: boolean,     // NEW
  last_seen_at: string,   // Renamed from last_seen
  meta: JSONB            // NEW - contains vehicle_type
}
```

**Migration:**
```typescript
// Old code
const vType = d.vehicle_type;

// New code
const vType = d.meta?.vehicle_type || 'moto';
```

---

## Backward Compatibility

### Old RPC Function: `get_nearby_drivers`

The old `get_nearby_drivers` function may still exist for backward compatibility. However, it's recommended to migrate to `get_nearby_presence` for:

- Better role support
- Consistent API
- Metadata support
- Future enhancements

### Migration Helper

If you need to support both old and new functions temporarily:

```typescript
async function getNearbyDrivers(location: Location, radiusMeters: number) {
  // Try new function first
  const { data: newData, error: newError } = await supabase.rpc('get_nearby_presence', {
    p_role: 'driver',
    p_lat: location.lat,
    p_lng: location.lng,
    p_radius_m: radiusMeters,
    p_limit: 50
  });
  
  if (!newError && newData) {
    return newData.map(d => ({
      ...d,
      vehicle_type: d.meta?.vehicle_type,
      dist_meters: d.distance_m,
      last_seen: d.last_seen_at
    }));
  }
  
  // Fallback to old function
  const { data: oldData } = await supabase.rpc('get_nearby_drivers', {
    user_lat: location.lat,
    user_lng: location.lng,
    radius_meters: radiusMeters
  });
  
  return oldData || [];
}
```

---

## Testing Checklist

- [ ] Presence updates work (driver/vendor going online)
- [ ] Presence queries work (passenger finding drivers)
- [ ] Offline status updates work
- [ ] TTL expiration works (presence expires after TTL)
- [ ] Metadata (vehicle_type) is preserved
- [ ] RLS policies block unauthorized access
- [ ] Matching flow works (if implemented)

---

## Troubleshooting

### Error: "Cannot update presence for other users"

**Cause:** RPC function validates that `p_user_id` matches `auth.uid()`.

**Solution:** Ensure you're passing the authenticated user's ID.

### Error: "Function get_nearby_presence does not exist"

**Cause:** Migration not applied.

**Solution:** Run `supabase db reset` or `supabase migration up`.

### Error: "Permission denied for table presence"

**Cause:** RLS policy blocking direct SELECT.

**Solution:** Use `get_nearby_presence()` RPC function instead of direct SELECT.

---

## Next Steps

1. ✅ Apply migration
2. ✅ Update application code
3. ✅ Test RPC functions
4. ⏭️ Schedule cleanup task (pg_cron for `expire_stale_presence()`)
5. ⏭️ Monitor performance and adjust TTL values
6. ⏭️ Add more metadata to presence entries as needed

