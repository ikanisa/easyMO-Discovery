# Import Businesses CSV - Quick Guide

## CSV File Found ✅
- **Location:** `/Users/jeanbosco/Downloads/businesses_rows.csv`
- **Size:** 8.6MB
- **Rows:** 6,653 businesses (including header)

## Quick Import

### Step 1: Get Your Service Role Key

1. Go to: https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq/settings/api
2. Copy the **Service Role Key** (starts with `eyJ...`)
3. **⚠️ Keep this secret - it has full database access!**

### Step 2: Run the Import

```bash
cd /Volumes/PRO-G40/Projects/repos/easyMO-Discovery

export SUPABASE_URL="https://rghmxgutlbvzrfztxvaq.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

npx tsx scripts/import-businesses-csv.ts /Users/jeanbosco/Downloads/businesses_rows.csv
```

### What the Script Does:

1. ✅ Reads the CSV file (6,653 rows)
2. ✅ Maps columns: `name`, `phone`, `category`, `address`, `lat`, `lng`
3. ✅ Processes in batches of 100 (67 batches total)
4. ✅ Handles duplicates (skips or updates by phone number)
5. ✅ Normalizes phone numbers to +250 format
6. ✅ Creates PostGIS POINT locations from lat/lng
7. ✅ Shows progress and error reports

### Expected Output:

```
📂 Reading CSV file: /Users/jeanbosco/Downloads/businesses_rows.csv
📊 Found 6653 rows in CSV
📦 Processing batch 1/67 (rows 1-100)...
  ✅ Inserted 95 new businesses
  🔄 Updated 5 existing businesses
...
📊 Import Summary:
  ✅ Successfully imported: 6620
  ⚠️  Skipped/Errors: 33
  📈 Total businesses in database: 6625
```

### CSV Column Mapping:

The script automatically maps these columns:
- `name` → `name` (required)
- `phone` or `owner_whatsapp` → `phone` (required)
- `category` → `category` (optional)
- `address` → `address` (optional)
- `lat` → latitude (optional)
- `lng` → longitude (optional)
- `status` → `is_active` (maps "active" to true)

### Troubleshooting:

**"Invalid API key" error:**
- Make sure you're using the **Service Role Key**, not the anon key
- Get it from: Dashboard → Settings → API → Service Role Key

**"Permission denied" error:**
- The service role key should bypass RLS
- Check that the key is correct and not expired

**Import takes a while:**
- This is normal! 6000+ businesses = ~67 batches
- Each batch takes ~1-2 seconds
- Total time: ~2-3 minutes

### After Import:

Verify the import:
```bash
psql "postgresql://postgres:MoMo!!0099@db.rghmxgutlbvzrfztxvaq.supabase.co:5432/postgres" \
  -c "SELECT COUNT(*) as total FROM businesses;"
```

Expected: ~6,600+ businesses

---

**Ready to import?** Just get your service role key and run the command above! 🚀

