-- Migration 003: Appointments table

CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled')),
  requested_note text,
  confirmed_at timestamptz,
  coach_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_appointments_coach_id ON appointments(coach_id);
CREATE INDEX idx_appointments_client_id ON appointments(client_id);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Coaches see and manage only their own appointments
CREATE POLICY "coach_own_appointments" ON appointments
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'coach'
    AND coach_id = auth.uid()
  );

-- Clients can read their own appointments
CREATE POLICY "client_own_appointments" ON appointments
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

-- Clients can request (insert) appointments
CREATE POLICY "client_request_appointment" ON appointments
  FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );
