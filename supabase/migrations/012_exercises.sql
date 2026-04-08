-- Migration 012: Exercise library foundation
-- Adds a coach-scoped exercise library for Phase 2 PT work

CREATE TABLE exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  description text,
  coaching_notes text,
  media_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_exercises_coach_id ON exercises(coach_id);
CREATE INDEX idx_exercises_coach_id_category ON exercises(coach_id, category);
CREATE INDEX idx_exercises_coach_id_name ON exercises(coach_id, name);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_own_exercises" ON exercises
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('coach', 'admin')
    AND coach_id = auth.uid()
  );
