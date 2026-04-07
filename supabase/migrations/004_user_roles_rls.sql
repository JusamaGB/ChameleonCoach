-- Allow users to read their own role (needed for login redirect + middleware)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_role" ON user_roles;
CREATE POLICY "users_read_own_role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);
