-- Migration 001: Multi-coach support
-- Adds coach_id to clients, renames admin role to coach, updates RLS

-- 1. Add coach_id to clients table
ALTER TABLE clients ADD COLUMN coach_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX idx_clients_coach_id ON clients(coach_id);

-- 2. Rename role 'admin' → 'coach'
ALTER TABLE user_roles DROP CONSTRAINT user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN ('coach', 'client'));
UPDATE user_roles SET role = 'coach' WHERE role = 'admin';

-- 3. Replace old email-based admin RLS with coach-scoped policy
DROP POLICY IF EXISTS "admin_full_access" ON clients;
CREATE POLICY "coach_own_clients" ON clients
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'coach'
    AND coach_id = auth.uid()
  );
