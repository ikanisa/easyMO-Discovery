# Next Steps: Database Migration & RPC Functions

**Date:** 2025-01-28  
**Status:** Ready for execution

## Quick Start

### 1. Run Migrations

```bash
# Option A: Reset database (WARNING: Deletes all data)
supabase db reset

# Option B: Apply migrations incrementally (safer)
supabase migration up

# Option C: Apply specific migration
supabase migration up 20250128_ai_first_schema
```

### 2. Test RPC Functions

```bash
# Run test script
supabase db execute -f supabase/test_rpc_functions.sql

# Or using psql
psql -h localhost -U postgres -d postgres -f supabase/test_rpc_functions.sql
```

### 3. Verify Application Code

The following files have been updated to use new RPC functions:

- ✅ `apps/pwa/services/presence.ts` - Uses `create_or_refresh_presence` and `get_nearby_presence`
- ✅ `services/agent-runtime/src/tools/presence.ts` - Uses new RPC functions

**No further code changes needed** - the migration is complete!

---

## What Changed

### Database Schema

1. **New/Updated Tables:**
   - `user_profiles` - Added missing columns
   - `user_roles` - Extended with admin/staff roles
   - `presence` - Added geohash, expires_at, meta JSONB
   - `ride_intents` - Renamed from `trip_intents`, new schema
   - `matches` - New table for driver-passenger matching
   - `payment_requests` - New table for payment tracking
   - `tool_traces` - New table for AI tool execution tracking

2. **RLS Policies:**
   - All tables now have proper RLS policies
   - Presence table: No direct SELECT (use RPC only)
   - Admin/staff roles can manage user roles

3. **RPC Functions:**
   - `get_nearby_presence()` - Replaces direct SELECT queries
   - `create_or_refresh_presence()` - Replaces direct UPSERT
   - `expire_stale_presence()` - Cleanup function
   - `create_match_candidates()` - Matching algorithm

### Application Code

1. **Presence Service:**
   - `upsertPresence()` now uses `create_or_refresh_presence` RPC
   - `getNearby()` now uses `get_nearby_presence` RPC
   - `goOffline()` now uses RPC with `is_online: false`

2. **Worker Tools:**
   - `publishPresence()` now uses `create_or_refresh_presence` RPC
   - `findMatches()` now uses `get_nearby_presence` RPC

---

## Testing Checklist

After running migrations, verify:

- [ ] **Presence Updates:**
  - [ ] Driver can go online (publish presence)
  - [ ] Vendor can go online
  - [ ] Presence expires after TTL
  - [ ] Offline status works

- [ ] **Presence Queries:**
  - [ ] Passenger can find nearby drivers
  - [ ] Results include distance and metadata
  - [ ] Vehicle type filtering works

- [ ] **RLS Security:**
  - [ ] Users cannot read other users' presence directly
  - [ ] Users can only update their own presence
  - [ ] RPC functions respect RLS policies

- [ ] **Matching (if implemented):**
  - [ ] Ride intents can be created
  - [ ] Match candidates are generated
  - [ ] Matches are visible to both passenger and driver

---

## Optional: Schedule Cleanup Task

If using Supabase hosted (with pg_cron enabled):

```sql
-- Enable pg_cron extension (requires superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup task (runs every 5 minutes)
SELECT cron.schedule(
  'expire-stale-presence',
  '*/5 * * * *',
  'SELECT expire_stale_presence();'
);
```

For local development, you can run cleanup manually:

```sql
SELECT expire_stale_presence();
```

---

## Troubleshooting

### Migration Fails

**Error:** "relation already exists"

**Solution:** Migration uses `CREATE TABLE IF NOT EXISTS` - this is safe. Check if table structure matches expected schema.

**Error:** "column already exists"

**Solution:** Migration checks for existing columns before adding - this is safe.

### RPC Functions Not Found

**Error:** "function get_nearby_presence does not exist"

**Solution:** 
1. Verify migration was applied: `supabase migration list`
2. Check function exists: `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'get_nearby_presence';`
3. Re-run migration if needed

### RLS Blocking Queries

**Error:** "permission denied for table presence"

**Solution:** This is expected! Use RPC functions instead of direct SELECT:
- ✅ `get_nearby_presence()` - for queries
- ✅ `create_or_refresh_presence()` - for updates

### Application Errors

**Error:** "Cannot update presence for other users"

**Solution:** RPC function validates user ownership. Ensure you're passing the authenticated user's ID.

---

## Documentation

- [Database Schema](./DB_SCHEMA_AI_FIRST.md) - Complete schema documentation
- [Migration Guide](./MIGRATION_GUIDE_RPC.md) - Detailed migration instructions
- [Test Script](../supabase/test_rpc_functions.sql) - RPC function tests

---

## Next Steps (Future)

1. **Monitor Performance:**
   - Check RPC function execution times
   - Optimize TTL values based on usage
   - Adjust radius limits if needed

2. **Enhance Matching:**
   - Implement scoring algorithm improvements
   - Add real-time notifications for matches
   - Add match acceptance/rejection flow

3. **Add Features:**
   - Realtime subscriptions for presence updates
   - Vector embeddings for semantic search
   - Full-text search for listings

---

## Support

If you encounter issues:

1. Check migration logs: `supabase migration list`
2. Verify RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'presence';`
3. Test RPC functions directly: `SELECT * FROM get_nearby_presence('driver', -1.9441, 30.0619, 5000, 10);`
4. Check application logs for specific errors

