-- Tighten presence RLS to block cross-user writes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'presence' AND policyname = 'Users can update own presence'
  ) THEN
    DROP POLICY "Users can update own presence" ON presence;
  END IF;
END$$;

CREATE POLICY "Users can update own presence"
  ON presence
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
