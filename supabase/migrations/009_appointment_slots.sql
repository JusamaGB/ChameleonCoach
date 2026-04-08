ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS appointment_booking_mode text DEFAULT 'coach_only';

CREATE TABLE IF NOT EXISTS appointment_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  appointment_id uuid UNIQUE REFERENCES appointments(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointment_slots_coach_id ON appointment_slots(coach_id);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_starts_at ON appointment_slots(starts_at);

ALTER TABLE appointment_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coach_own_appointment_slots" ON appointment_slots;
CREATE POLICY "coach_own_appointment_slots" ON appointment_slots
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('coach', 'admin')
    AND coach_id = auth.uid()
  );
