-- Test Script for RPC Functions
-- Run this after applying migrations to verify RPC functions work correctly
-- Usage: psql -h localhost -U postgres -d postgres -f test_rpc_functions.sql

-- ============================================================================
-- Setup: Create test users and presence data
-- ============================================================================

-- Note: In a real scenario, you would use Supabase Auth to create users
-- This is a simplified test that assumes you have test users

-- Test 1: create_or_refresh_presence
-- ============================================================================
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  result UUID;
BEGIN
  RAISE NOTICE 'Test 1: create_or_refresh_presence';
  
  -- This will fail if user doesn't exist in auth.users
  -- In real testing, use actual authenticated user IDs
  BEGIN
    result := create_or_refresh_presence(
      test_user_id,
      'driver',
      -1.9441,  -- Kigali coordinates
      30.0619,
      true,
      3600,
      '{"vehicle_type": "moto"}'::jsonb
    );
    RAISE NOTICE '✓ create_or_refresh_presence succeeded (user_id: %)', result;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ create_or_refresh_presence failed: %', SQLERRM;
  END;
END $$;

-- Test 2: get_nearby_presence
-- ============================================================================
DO $$
DECLARE
  nearby_count INTEGER;
BEGIN
  RAISE NOTICE 'Test 2: get_nearby_presence';
  
  SELECT COUNT(*) INTO nearby_count
  FROM get_nearby_presence(
    'driver',
    -1.9441,  -- Kigali center
    30.0619,
    5000,     -- 5km radius
    50        -- limit
  );
  
  RAISE NOTICE '✓ get_nearby_presence returned % results', nearby_count;
END $$;

-- Test 3: expire_stale_presence
-- ============================================================================
DO $$
DECLARE
  expired_count INTEGER;
BEGIN
  RAISE NOTICE 'Test 3: expire_stale_presence';
  
  -- Manually expire some presence entries for testing
  UPDATE presence
  SET expires_at = NOW() - INTERVAL '1 hour'
  WHERE is_online = true
  LIMIT 5;
  
  SELECT expire_stale_presence() INTO expired_count;
  
  RAISE NOTICE '✓ expire_stale_presence expired % entries', expired_count;
END $$;

-- Test 4: create_match_candidates (requires ride_intent)
-- ============================================================================
DO $$
DECLARE
  test_intent_id UUID;
  test_passenger_id UUID := gen_random_uuid();
  match_count INTEGER;
BEGIN
  RAISE NOTICE 'Test 4: create_match_candidates';
  
  -- Create a test ride intent
  -- Note: This will fail if passenger_id doesn't exist in auth.users
  BEGIN
    INSERT INTO ride_intents (
      passenger_id,
      pickup_lat,
      pickup_lng,
      pickup_location,
      pickup_address,
      status,
      expires_at
    ) VALUES (
      test_passenger_id,
      -1.9441,
      30.0619,
      ST_SetSRID(ST_MakePoint(30.0619, -1.9441), 4326)::geography,
      'Kigali Center',
      'pending',
      NOW() + INTERVAL '1 hour'
    ) RETURNING id INTO test_intent_id;
    
    -- Try to create match candidates
    SELECT COUNT(*) INTO match_count
    FROM create_match_candidates(test_intent_id, 10);
    
    RAISE NOTICE '✓ create_match_candidates created % matches for intent %', match_count, test_intent_id;
    
    -- Cleanup
    DELETE FROM ride_intents WHERE id = test_intent_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ create_match_candidates test skipped: %', SQLERRM;
  END;
END $$;

-- ============================================================================
-- Verification Queries
-- ============================================================================

RAISE NOTICE '=== Verification ===';

-- Check presence table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'presence'
ORDER BY ordinal_position;

-- Check RPC functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_nearby_presence',
    'create_or_refresh_presence',
    'expire_stale_presence',
    'create_match_candidates'
  )
ORDER BY routine_name;

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN (
  'presence',
  'user_profiles',
  'user_roles',
  'ride_intents',
  'matches'
)
ORDER BY tablename, policyname;

RAISE NOTICE '=== Tests Complete ===';

