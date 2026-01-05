# Migration Instructions

**Date:** 2025-01-27  
**Purpose:** Step-by-step instructions to apply broadcast migrations

---

## Option 1: Supabase Dashboard (Recommended)

### Step 1: Open SQL Editor

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)

### Step 2: Apply Migrations in Order

Apply each migration file **in this exact order**:

1. **`20250127_broadcast_businesses.sql`**
   - Creates `businesses` table
   - Copy entire file contents
   - Paste into SQL Editor
   - Click **Run** (or press Cmd/Ctrl + Enter)

2. **`20250127_broadcast_enhance_broadcasts.sql`**
   - Enhances `broadcasts` table
   - Copy entire file contents
   - Paste into SQL Editor
   - Click **Run**

3. **`20250127_broadcast_targets.sql`**
   - Creates `broadcast_targets` table
   - Copy entire file contents
   - Paste into SQL Editor
   - Click **Run**

4. **`20250127_broadcast_messages.sql`**
   - Creates `broadcast_messages` table
   - Copy entire file contents
   - Paste into SQL Editor
   - Click **Run**

5. **`20250127_broadcast_enhance_responses.sql`**
   - Enhances `broadcast_responses` table
   - Copy entire file contents
   - Paste into SQL Editor
   - Click **Run**

### Step 3: Verify Migrations

Run this query to verify all tables exist:

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

Expected output: 5 rows (one for each table)

---

## Option 2: Supabase CLI (If Linked)

If you have Supabase CLI linked to your project:

```bash
# Link to project (first time only)
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
supabase db push

# Or apply specific migrations
supabase migration up
```

**Note:** Requires Docker for local development, or use `--db-url` flag for remote.

---

## Option 3: psql (Direct Database Connection)

If you have direct database access:

```bash
# Connect to database
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Apply migrations
\i supabase/migrations/20250127_broadcast_businesses.sql
\i supabase/migrations/20250127_broadcast_enhance_broadcasts.sql
\i supabase/migrations/20250127_broadcast_targets.sql
\i supabase/migrations/20250127_broadcast_messages.sql
\i supabase/migrations/20250127_broadcast_enhance_responses.sql
```

---

## Troubleshooting

### Error: "relation already exists"
- Some tables may already exist from previous migrations
- Migrations use `CREATE TABLE IF NOT EXISTS`, so this is safe to ignore
- Or drop existing tables first (⚠️ **WARNING:** This deletes data)

### Error: "column already exists"
- Some columns may already exist
- Migrations use `ADD COLUMN IF NOT EXISTS`, so this is safe to ignore

### Error: "constraint already exists"
- Constraints may already exist
- Migrations use `DROP CONSTRAINT IF EXISTS` before creating, so this should be handled
- If error persists, manually drop the constraint first

### Error: "function does not exist"
- Ensure `update_updated_at_column()` function exists
- This function is created in `20250128_ai_first_schema.sql`
- If missing, create it:
  ```sql
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  ```

---

## Post-Migration Checklist

- [ ] All 5 tables created successfully
- [ ] RLS policies applied (check in Dashboard → Authentication → Policies)
- [ ] Indexes created (check in Dashboard → Database → Indexes)
- [ ] Triggers created (check in Dashboard → Database → Triggers)
- [ ] Test insert into `businesses` table works
- [ ] Test insert into `broadcasts` table works (with `user_id`)

---

## Next Steps

After migrations are applied:

1. **Populate Businesses:** Run `npx tsx scripts/populate-businesses.ts`
2. **Configure WhatsApp:** Set env vars (see `WHATSAPP_SETUP.md`)
3. **Test Widgets:** Run `npx tsx scripts/test-widgets.ts`
4. **Enable Realtime:** Enable Realtime for `broadcast_responses` table in Dashboard

