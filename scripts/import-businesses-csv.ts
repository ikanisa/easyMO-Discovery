/**
 * Import Businesses from CSV
 * 
 * This script imports businesses from a CSV file into the businesses table.
 * 
 * Expected CSV format (with headers):
 * - name (required)
 * - category (optional)
 * - address (optional)
 * - phone (required)
 * - latitude (optional, for location)
 * - longitude (optional, for location)
 * - whatsapp_verified (optional, default: false)
 * - is_active (optional, default: true)
 * 
 * Usage:
 *   npx tsx scripts/import-businesses-csv.ts <path-to-csv-file>
 * 
 * Or set CSV_PATH environment variable:
 *   export CSV_PATH="./data/businesses.csv"
 *   npx tsx scripts/import-businesses-csv.ts
 * 
 * Requires:
 * - SUPABASE_URL environment variable
 * - SUPABASE_SERVICE_ROLE_KEY environment variable
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rghmxgutlbvzrfztxvaq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Parse CSV line (handles quoted fields with commas)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim()); // Add last field
  return result;
}

// Parse CSV file
function parseCSV(filePath: string): { headers: string[]; rows: string[][] } {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  const rows = lines.slice(1).map(line => parseCSVLine(line));

  return { headers, rows };
}

// Normalize phone number
function normalizePhone(phone: string): string {
  if (!phone) return '';
  // Remove all non-digit characters except +
  let normalized = phone.replace(/[^\d+]/g, '');
  // If doesn't start with +, assume Rwanda format
  if (!normalized.startsWith('+')) {
    if (normalized.startsWith('0')) {
      normalized = '+250' + normalized.substring(1);
    } else if (normalized.startsWith('250')) {
      normalized = '+' + normalized;
    } else {
      normalized = '+250' + normalized;
    }
  }
  return normalized;
}

// Map CSV row to business object
function mapRowToBusiness(headers: string[], row: string[]): any {
  const business: any = {};
  
  // Create a map of header index to value
  const valueMap: Record<string, string> = {};
  headers.forEach((header, index) => {
    valueMap[header] = row[index] || '';
  });

  // Required fields
  if (!valueMap.name && !valueMap.business_name) {
    throw new Error('Missing required field: name or business_name');
  }
  business.name = (valueMap.name || valueMap.business_name || '').trim();
  
  if (!valueMap.phone && !valueMap.phone_number && !valueMap.whatsapp) {
    throw new Error('Missing required field: phone, phone_number, or whatsapp');
  }
  business.phone = normalizePhone(valueMap.phone || valueMap.phone_number || valueMap.whatsapp || '');

  // Optional fields
  if (valueMap.category) business.category = valueMap.category.trim();
  if (valueMap.address) business.address = valueMap.address.trim();
  
  // Location (handle various column names)
  const lat = parseFloat(valueMap.latitude || valueMap.lat || valueMap.lng || '');
  const lng = parseFloat(valueMap.longitude || valueMap.lon || valueMap.long || '');
  if (!isNaN(lat) && !isNaN(lng)) {
    business.location = `POINT(${lng} ${lat})`;
  }

  // Boolean fields
  business.whatsapp_verified = valueMap.whatsapp_verified === 'true' || valueMap.whatsapp_verified === '1' || valueMap.verified === 'true';
  business.is_active = valueMap.is_active !== 'false' && valueMap.is_active !== '0' && valueMap.active !== 'false';

  return business;
}

// Import businesses in batches
async function importBusinesses(csvPath: string, batchSize: number = 100) {
  console.log(`📂 Reading CSV file: ${csvPath}\n`);

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const { headers, rows } = parseCSV(csvPath);
  console.log(`📊 Found ${rows.length} rows in CSV`);
  console.log(`📋 Headers: ${headers.join(', ')}\n`);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  const errors: Array<{ row: number; error: string }> = [];

  // Process in batches
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(rows.length / batchSize);

    console.log(`📦 Processing batch ${batchNum}/${totalBatches} (rows ${i + 1}-${Math.min(i + batchSize, rows.length)})...`);

    const businesses = [];
    const batchErrors: Array<{ row: number; error: string }> = [];

    // Parse batch
    for (let j = 0; j < batch.length; j++) {
      try {
        const business = mapRowToBusiness(headers, batch[j]);
        businesses.push(business);
      } catch (error: any) {
        batchErrors.push({ row: i + j + 2, error: error.message }); // +2 for header and 1-indexed
        errorCount++;
      }
    }

    if (batchErrors.length > 0) {
      console.log(`  ⚠️  ${batchErrors.length} rows skipped due to errors`);
      errors.push(...batchErrors);
    }

    if (businesses.length === 0) {
      console.log(`  ⏭️  No valid businesses in this batch\n`);
      continue;
    }

    // Upsert batch (check by phone number)
    try {
      // Check existing businesses by phone
      const phones = businesses.map(b => b.phone);
      const { data: existing } = await supabase
        .from('businesses')
        .select('id, phone')
        .in('phone', phones);

      const existingPhones = new Set(existing?.map(b => b.phone) || []);
      const existingMap = new Map(existing?.map(b => [b.phone, b.id]) || []);

      const toInsert = businesses.filter(b => !existingPhones.has(b.phone));
      const toUpdate = businesses.filter(b => existingPhones.has(b.phone));

      // Insert new businesses
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('businesses')
          .insert(toInsert);

        if (insertError) {
          console.error(`  ❌ Insert error:`, insertError.message);
          errorCount += toInsert.length;
        } else {
          successCount += toInsert.length;
          console.log(`  ✅ Inserted ${toInsert.length} new businesses`);
        }
      }

      // Update existing businesses
      if (toUpdate.length > 0) {
        for (const business of toUpdate) {
          const existingId = existingMap.get(business.phone);
          if (existingId) {
            const { error: updateError } = await supabase
              .from('businesses')
              .update(business)
              .eq('id', existingId);

            if (updateError) {
              console.error(`  ❌ Update error for ${business.name}:`, updateError.message);
              errorCount++;
            } else {
              successCount++;
              skippedCount++; // Counted as success but was update
            }
          }
        }
        if (toUpdate.length > 0) {
          console.log(`  🔄 Updated ${toUpdate.length} existing businesses`);
        }
      }

    } catch (error: any) {
      console.error(`  ❌ Batch error:`, error.message);
      errorCount += businesses.length;
    }

    console.log(''); // Empty line between batches
  }

  // Summary
  console.log('='.repeat(50));
  console.log('📊 Import Summary:');
  console.log(`  ✅ Successfully imported: ${successCount}`);
  console.log(`  🔄 Updated existing: ${skippedCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  📝 Total processed: ${rows.length}`);

  if (errors.length > 0 && errors.length <= 20) {
    console.log('\n⚠️  Errors:');
    errors.forEach(({ row, error }) => {
      console.log(`  Row ${row}: ${error}`);
    });
  } else if (errors.length > 20) {
    console.log(`\n⚠️  ${errors.length} errors (showing first 20):`);
    errors.slice(0, 20).forEach(({ row, error }) => {
      console.log(`  Row ${row}: ${error}`);
    });
  }

  // Final count
  const { count } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📈 Total businesses in database: ${count || 0}`);
}

// Main
async function main() {
  const csvPath = process.argv[2] || process.env.CSV_PATH;

  if (!csvPath) {
    console.error('Error: CSV file path required');
    console.error('\nUsage:');
    console.error('  npx tsx scripts/import-businesses-csv.ts <path-to-csv>');
    console.error('\nOr set CSV_PATH environment variable:');
    console.error('  export CSV_PATH="./data/businesses.csv"');
    console.error('  npx tsx scripts/import-businesses-csv.ts');
    process.exit(1);
  }

  const absolutePath = path.isAbsolute(csvPath) ? csvPath : path.join(process.cwd(), csvPath);

  try {
    await importBusinesses(absolutePath);
    console.log('\n✅ Import complete!');
  } catch (error: any) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);

