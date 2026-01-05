# CSV Import Guide for Businesses

## Quick Start

If you have a CSV file with businesses, import it with:

```bash
# Set your Supabase credentials
export SUPABASE_URL="https://rghmxgutlbvzrfztxvaq.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Import the CSV
npx tsx scripts/import-businesses-csv.ts /path/to/your/businesses.csv
```

## CSV Format

The script supports flexible column names. Here are the supported fields:

### Required Fields
- **name** (or `business_name`) - Business name
- **phone** (or `phone_number`, `whatsapp`) - Phone number

### Optional Fields
- **category** - Business category (e.g., 'pharmacy', 'restaurant', 'hardware')
- **address** - Business address
- **latitude** (or `lat`) - Latitude for location
- **longitude** (or `lon`, `long`, `lng`) - Longitude for location
- **whatsapp_verified** (or `verified`) - Boolean (true/false or 1/0)
- **is_active** (or `active`) - Boolean (true/false or 1/0), defaults to true

## Example CSV

```csv
name,category,address,phone,latitude,longitude,whatsapp_verified,is_active
Pharmacy ABC,pharmacy,Kigali Heights,+250788123456,-1.9441,30.0619,true,true
Pharmacy XYZ,pharmacy,Remera,+250788234567,-1.9500,30.0700,true,true
Hardware Store,hardware,Kimironko,+250788345678,-1.9300,30.0800,false,true
```

## Features

- ✅ **Batch Processing** - Processes 100 rows at a time for efficiency
- ✅ **Duplicate Handling** - Skips or updates businesses with existing phone numbers
- ✅ **Flexible Column Names** - Supports various column name variations
- ✅ **Phone Normalization** - Automatically normalizes phone numbers to +250 format
- ✅ **Error Reporting** - Shows detailed errors for failed rows
- ✅ **Progress Tracking** - Shows progress for large imports

## Phone Number Format

The script automatically normalizes phone numbers:
- `0788123456` → `+250788123456`
- `250788123456` → `+250788123456`
- `+250788123456` → `+250788123456` (unchanged)

## Location Format

If you have latitude and longitude:
- The script will create a PostGIS POINT for spatial queries
- Format: `POINT(longitude latitude)` (note: lng first, then lat)

## Troubleshooting

### "CSV file not found"
- Make sure the path is correct
- Use absolute path or path relative to project root

### "Missing required field"
- Ensure your CSV has `name` (or `business_name`) and `phone` (or `phone_number`, `whatsapp`) columns
- Check that column names match (case-insensitive)

### "Permission denied"
- Make sure you're using `SUPABASE_SERVICE_ROLE_KEY` (not anon key)
- Service role key bypasses RLS policies

### Import is slow
- The script processes in batches of 100
- For 6000 businesses, expect ~60 batches
- Each batch takes ~1-2 seconds, so total time ~1-2 minutes

## After Import

Verify the import:

```bash
# Check count
psql "postgresql://postgres:PASSWORD@db.rghmxgutlbvzrfztxvaq.supabase.co:5432/postgres" \
  -c "SELECT COUNT(*) FROM businesses;"

# Check sample
psql "postgresql://postgres:PASSWORD@db.rghmxgutlbvzrfztxvaq.supabase.co:5432/postgres" \
  -c "SELECT name, category, phone FROM businesses LIMIT 10;"
```

Or use the Supabase Dashboard:
- Go to Table Editor → `businesses`
- Check the row count and sample data

