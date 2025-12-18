-- Secure RLS for WhatsApp/Broadcast tables and add profiles view shim for frontend
BEGIN;

-- 1) Replace permissive policies with service_role-only access
DO $$
DECLARE
  rec record;
  tbl text;
BEGIN
  FOR rec IN
    SELECT unnest(ARRAY[
      'whatsapp_webhook_events',
      'whatsapp_messages',
      'whatsapp_threads',
      'leads',
      'lead_state_events',
      'vendor_responses',
      'vendors'
    ]) AS tbl
  LOOP
    tbl := rec.tbl;

    -- Drop any existing open policies
    PERFORM 1 FROM pg_policies WHERE tablename = tbl;
    EXECUTE format('DROP POLICY IF EXISTS "Service role full access" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Open access" ON %I', tbl);

    -- Ensure RLS is enabled
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    -- Restrict service_role
    EXECUTE format(
      'CREATE POLICY "service_role_full_access" ON %I FOR ALL
       TO service_role USING (true) WITH CHECK (true)',
      tbl
    );

    -- Deny implicit anon/authenticated
    EXECUTE format('REVOKE ALL ON %I FROM anon', tbl);
    EXECUTE format('REVOKE ALL ON %I FROM authenticated', tbl);
  END LOOP;
END $$;

-- 2) Profiles view shim to align frontend expectations
CREATE OR REPLACE VIEW profiles AS
SELECT
  user_id       AS id,
  display_name,
  phone_number  AS phone,
  default_role  AS role,
  vehicle_type,
  verified,
  rating,
  total_trips,
  total_earnings,
  settings,
  created_at,
  updated_at
FROM user_profiles;

-- Upsert handler for profiles view
CREATE OR REPLACE FUNCTION profiles_upsert_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO user_profiles (user_id, display_name, phone_number, default_role, vehicle_type)
  VALUES (
    COALESCE(NEW.id, auth.uid()),
    NEW.display_name,
    NEW.phone,
    COALESCE(NEW.role, 'passenger'),
    NEW.vehicle_type
  )
  ON CONFLICT (user_id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        phone_number = EXCLUDED.phone_number,
        default_role = EXCLUDED.default_role,
        vehicle_type = EXCLUDED.vehicle_type,
        updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_upsert_trigger ON profiles;
CREATE TRIGGER profiles_upsert_trigger
INSTEAD OF INSERT OR UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION profiles_upsert_fn();

GRANT SELECT ON profiles TO authenticated;
GRANT INSERT, UPDATE ON profiles TO authenticated;

COMMIT;
