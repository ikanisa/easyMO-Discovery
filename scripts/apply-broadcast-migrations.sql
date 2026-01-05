-- Apply Broadcast Migrations
-- This script applies all broadcast-related migrations in order
-- Run this in Supabase SQL Editor or via psql

-- Migration 1: Create businesses table
\i supabase/migrations/20250127_broadcast_businesses.sql

-- Migration 2: Enhance broadcasts table
\i supabase/migrations/20250127_broadcast_enhance_broadcasts.sql

-- Migration 3: Create broadcast_targets table
\i supabase/migrations/20250127_broadcast_targets.sql

-- Migration 4: Create broadcast_messages table
\i supabase/migrations/20250127_broadcast_messages.sql

-- Migration 5: Enhance broadcast_responses table
\i supabase/migrations/20250127_broadcast_enhance_responses.sql

-- Note: If using Supabase SQL Editor, copy and paste each migration file
-- in order, or use the individual migration files directly.

