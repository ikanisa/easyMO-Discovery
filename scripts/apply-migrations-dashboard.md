# Apply Migrations via Supabase Dashboard

**Project:** rghmxgutlbvzrfztxvaq  
**URL:** https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq

## Quick Method: Use Combined SQL File

1. Open: https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq/sql/new
2. Open file: `combined-broadcast-migrations.sql` in this repo
3. Copy entire contents
4. Paste into SQL Editor
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. Wait for completion (should show "Success")

## Alternative: Apply Individual Migrations

If the combined file is too large, apply each migration individually:

### 1. Create Businesses Table
- File: `supabase/migrations/20250127_broadcast_businesses.sql`
- Copy → Paste → Run

### 2. Enhance Broadcasts Table
- File: `supabase/migrations/20250127_broadcast_enhance_broadcasts.sql`
- Copy → Paste → Run

### 3. Create Broadcast Targets Table
- File: `supabase/migrations/20250127_broadcast_targets.sql`
- Copy → Paste → Run

### 4. Create Broadcast Messages Table
- File: `supabase/migrations/20250127_broadcast_messages.sql`
- Copy → Paste → Run

### 5. Enhance Broadcast Responses Table
- File: `supabase/migrations/20250127_broadcast_enhance_responses.sql`
- Copy → Paste → Run

## Verify Migrations

After applying, run this query:

```sql
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN (
    'businesses',
    'broadcasts',
    'broadcast_targets',
    'broadcast_messages',
    'broadcast_responses'
  )
ORDER BY table_name;
```

Expected: 5 rows with column counts > 0

