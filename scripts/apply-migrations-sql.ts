/**
 * Generate Combined SQL Script for Manual Application
 * 
 * This script combines all broadcast migrations into a single SQL file
 * that can be pasted directly into Supabase Dashboard SQL Editor.
 * 
 * Run with: npx tsx scripts/apply-migrations-sql.ts > combined-migrations.sql
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const migrations = [
  '20250127_broadcast_businesses.sql',
  '20250127_broadcast_enhance_broadcasts.sql',
  '20250127_broadcast_targets.sql',
  '20250127_broadcast_messages.sql',
  '20250127_broadcast_enhance_responses.sql',
];

console.log('-- Combined Broadcast Migrations');
console.log('-- Generated: ' + new Date().toISOString());
console.log('-- Apply this script in Supabase Dashboard → SQL Editor');
console.log('-- Project: rghmxgutlbvzrfztxvaq');
console.log('');
console.log('BEGIN;');
console.log('');

for (const migration of migrations) {
  const filePath = join(process.cwd(), 'supabase', 'migrations', migration);
  
  try {
    const sql = readFileSync(filePath, 'utf-8');
    console.log(`-- ========================================`);
    console.log(`-- Migration: ${migration}`);
    console.log(`-- ========================================`);
    console.log('');
    console.log(sql);
    console.log('');
  } catch (error: any) {
    console.error(`-- ERROR: Failed to read ${migration}: ${error.message}`);
  }
}

console.log('COMMIT;');
console.log('');
console.log('-- Migration complete!');
console.log('-- Verify tables:');
console.log('SELECT table_name FROM information_schema.tables');
console.log("WHERE table_schema = 'public'");
console.log("AND table_name IN ('businesses', 'broadcasts', 'broadcast_targets', 'broadcast_messages', 'broadcast_responses');");

