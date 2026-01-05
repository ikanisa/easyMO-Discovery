/**
 * Script to apply migration using Supabase Management API
 * Usage: node scripts/apply-migration.js
 */

const SUPABASE_URL = 'https://rghmxgutlbvzrfztxvaq.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnaG14Z3V0bGJ2enJmenR4dmFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTU1NTUwNywiZXhwIjoyMDgxMTMxNTA3fQ._KkRyCVXNZ2DBG7o4v6r3wnxffav5s6-hU9y5VsD5xk';
const MIGRATION_FILE = 'supabase/migrations/20250129_realtime_presence_ttl.sql';

const fs = require('fs');

async function applyMigration() {
  const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');
  
  // Split SQL into statements (simple approach - assumes semicolons separate statements)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`Found ${statements.length} SQL statements to execute`);
  
  // Use Supabase REST API to execute SQL
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ sql: sql }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('Migration failed:', error);
    process.exit(1);
  }
  
  console.log('Migration applied successfully!');
}

// Note: Supabase doesn't have a direct exec_sql RPC, so we'll use a different approach
// Instead, we'll use psql or the Supabase Dashboard

console.log(`
To apply the migration, use one of these methods:

1. Supabase Dashboard (Recommended):
   - Go to https://supabase.com/dashboard/project/rghmxgutlbvzrfztxvaq
   - Navigate to SQL Editor
   - Copy and paste the contents of: ${MIGRATION_FILE}
   - Click "Run"

2. Using psql (if you have database password):
   - psql "postgresql://postgres.rghmxgutlbvzrfztxvaq:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f ${MIGRATION_FILE}

3. Using Supabase CLI (if linked):
   - supabase db push
`);

