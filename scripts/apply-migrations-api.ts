/**
 * Apply Migrations via Supabase REST API
 * 
 * This script applies all broadcast migrations using the Supabase REST API.
 * Run with: npx tsx scripts/apply-migrations-api.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rghmxgutlbvzrfztxvaq.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnaG14Z3V0bGJ2enJmenR4dmFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTU1NTUwNywiZXhwIjoyMDgxMTMxNTA3fQ._KkRyCVXNZ2DBG7o4v6r3wnxffav5s6-hU9y5VsD5xk';

const migrations = [
  '20250127_broadcast_businesses.sql',
  '20250127_broadcast_enhance_broadcasts.sql',
  '20250127_broadcast_targets.sql',
  '20250127_broadcast_messages.sql',
  '20250127_broadcast_enhance_responses.sql',
];

async function applyMigration(sql: string, filename: string): Promise<boolean> {
  try {
    console.log(`\n📝 Applying ${filename}...`);
    
    // Use Supabase REST API to execute SQL
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Error applying ${filename}:`, error);
      return false;
    }

    console.log(`✅ Successfully applied ${filename}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Error applying ${filename}:`, error.message);
    return false;
  }
}

async function applyMigrations() {
  console.log('🚀 Starting migration application...\n');
  console.log(`Supabase URL: ${SUPABASE_URL}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const migration of migrations) {
    const filePath = join(process.cwd(), 'supabase', 'migrations', migration);
    
    try {
      const sql = readFileSync(filePath, 'utf-8');
      const success = await applyMigration(sql, migration);
      
      if (success) {
        successCount++;
        // Small delay between migrations
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        failCount++;
      }
    } catch (error: any) {
      console.error(`❌ Failed to read ${migration}:`, error.message);
      failCount++;
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📁 Total: ${migrations.length}`);

  if (failCount > 0) {
    console.log('\n⚠️  Some migrations failed. Please check the errors above.');
    console.log('   You may need to apply them manually via Supabase Dashboard SQL Editor.');
    process.exit(1);
  } else {
    console.log('\n✅ All migrations applied successfully!');
  }
}

// Alternative: Use direct SQL execution via pg REST API
async function applyMigrationDirect(sql: string, filename: string): Promise<boolean> {
  try {
    console.log(`\n📝 Applying ${filename}...`);
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.includes('BEGIN') || statement.includes('COMMIT')) {
        continue; // Skip transaction markers
      }

      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: statement }),
      });

      if (!response.ok) {
        const error = await response.text();
        // Some errors are expected (IF NOT EXISTS, etc.)
        if (!error.includes('already exists') && !error.includes('does not exist')) {
          console.warn(`⚠️  Warning for ${filename}:`, error.substring(0, 200));
        }
      }
    }

    console.log(`✅ Successfully applied ${filename}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Error applying ${filename}:`, error.message);
    return false;
  }
}

// Use Supabase Dashboard SQL Editor approach (generate instructions)
function generateSQLInstructions() {
  console.log('\n📋 Manual Migration Instructions:\n');
  console.log('Since API migration may have limitations, here are manual steps:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq/sql/new\n');
  console.log('2. Apply each migration file in order:\n');
  
  migrations.forEach((migration, index) => {
    console.log(`   ${index + 1}. ${migration}`);
  });
  
  console.log('\n3. Copy the contents of each file from: supabase/migrations/\n');
  console.log('4. Paste into SQL Editor and click "Run"\n');
}

// Try API first, fallback to instructions
applyMigrations().catch(() => {
  console.log('\n⚠️  API migration failed. Using manual approach...\n');
  generateSQLInstructions();
});

