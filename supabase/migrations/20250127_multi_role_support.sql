-- Migration: Multi-role support for user_profiles
-- Date: 2025-01-27
-- Description: Creates user_roles join table to support users having multiple roles (passenger, driver, vendor)

BEGIN;

-- 1. Create user_roles table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('passenger', 'driver', 'vendor')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, role)
);

-- 2. Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(user_id, is_active) WHERE is_active = true;

-- 3. Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can read own roles"
  ON user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own roles"
  ON user_roles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own roles"
  ON user_roles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own roles"
  ON user_roles
  FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Migrate existing default_role to user_roles
-- Only migrate if default_role is not null and user doesn't already have that role
INSERT INTO user_roles (user_id, role, is_active, created_at)
SELECT 
  user_id,
  default_role,
  true,
  COALESCE(created_at, NOW())
FROM user_profiles
WHERE default_role IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = user_profiles.user_id 
    AND ur.role = user_profiles.default_role
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- 6. Helper function: Get active roles for a user
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID)
RETURNS TEXT[] AS $$
  SELECT ARRAY_AGG(role)::TEXT[]
  FROM user_roles
  WHERE user_id = p_user_id AND is_active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 7. Helper function: Check if user has role
CREATE OR REPLACE FUNCTION user_has_role(p_user_id UUID, p_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id
      AND role = p_role
      AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 8. Update profiles view to work with user_roles (backward compatibility)
-- For backward compatibility, we'll keep showing default_role as "role" in the view
-- But we'll prefer the first active role from user_roles if it exists
CREATE OR REPLACE VIEW profiles AS
SELECT
  up.user_id       AS id,
  up.display_name,
  up.phone_number  AS phone,
  COALESCE(
    (SELECT role FROM user_roles WHERE user_id = up.user_id AND is_active = true ORDER BY created_at LIMIT 1),
    up.default_role
  ) AS role,
  up.vehicle_type,
  up.verified,
  up.rating,
  up.total_trips,
  up.total_earnings,
  up.settings,
  up.created_at,
  up.updated_at
FROM user_profiles up;

-- 9. Update profiles_upsert_fn to handle user_roles
-- When a role is provided via the view, create/update user_roles entry
CREATE OR REPLACE FUNCTION profiles_upsert_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(NEW.id, auth.uid());
  
  -- Upsert user_profiles (keep default_role for backward compatibility)
  INSERT INTO user_profiles (user_id, display_name, phone_number, default_role, vehicle_type)
  VALUES (
    v_user_id,
    NEW.display_name,
    NEW.phone,
    COALESCE(NEW.role, (SELECT default_role FROM user_profiles WHERE user_id = v_user_id), 'passenger'),
    NEW.vehicle_type
  )
  ON CONFLICT (user_id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        phone_number = EXCLUDED.phone_number,
        default_role = COALESCE(EXCLUDED.default_role, user_profiles.default_role),
        vehicle_type = EXCLUDED.vehicle_type,
        updated_at = NOW();

  -- If role is provided, ensure it exists in user_roles
  IF NEW.role IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role, is_active)
    VALUES (v_user_id, NEW.role, true)
    ON CONFLICT (user_id, role) DO UPDATE
      SET is_active = true,
          updated_at = NOW();
    
    -- Also update default_role for backward compatibility
    UPDATE user_profiles
    SET default_role = NEW.role
    WHERE user_id = v_user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 10. Create trigger for updated_at on user_roles
CREATE OR REPLACE FUNCTION update_user_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_roles_updated_at_trigger ON user_roles;
CREATE TRIGGER user_roles_updated_at_trigger
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_roles_updated_at();

-- 11. Grant permissions
GRANT SELECT ON user_roles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_roles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_role(UUID, TEXT) TO authenticated;

COMMIT;

