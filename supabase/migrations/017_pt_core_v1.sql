-- Migration 017: PT Core V1
-- Extends the existing exercise library foundation with workouts, programs,
-- client assignments, training sessions, and workout logs.

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS movement_pattern text,
  ADD COLUMN IF NOT EXISTS primary_muscles text,
  ADD COLUMN IF NOT EXISTS secondary_muscles text,
  ADD COLUMN IF NOT EXISTS equipment text,
  ADD COLUMN IF NOT EXISTS difficulty text,
  ADD COLUMN IF NOT EXISTS default_units text DEFAULT 'reps',
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS pt_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  goal text,
  estimated_duration_minutes integer,
  difficulty text,
  is_template boolean NOT NULL DEFAULT true,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pt_workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES pt_workouts(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  block_label text,
  prescription_type text NOT NULL DEFAULT 'reps'
    CHECK (prescription_type IN ('reps', 'time', 'distance')),
  sets integer,
  reps text,
  rep_range_min integer,
  rep_range_max integer,
  duration_seconds integer,
  distance_value numeric,
  distance_unit text,
  rest_seconds integer,
  tempo text,
  load_guidance text,
  rpe_target numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pt_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  goal text,
  duration_weeks integer NOT NULL DEFAULT 1,
  difficulty text,
  is_template boolean NOT NULL DEFAULT true,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pt_program_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES pt_programs(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  day_number integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  session_name text NOT NULL,
  workout_id uuid REFERENCES pt_workouts(id) ON DELETE SET NULL,
  focus text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_pt_program_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  program_id uuid REFERENCES pt_programs(id) ON DELETE SET NULL,
  program_name_snapshot text NOT NULL,
  assigned_start_date date,
  assigned_end_date date,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  current_week integer,
  assignment_notes text,
  last_session_completed_at timestamptz,
  completed_sessions_count integer NOT NULL DEFAULT 0,
  total_sessions_count integer NOT NULL DEFAULT 0,
  adherence_percent numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_pt_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES client_pt_program_assignments(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id uuid REFERENCES pt_programs(id) ON DELETE SET NULL,
  program_session_id uuid REFERENCES pt_program_sessions(id) ON DELETE SET NULL,
  workout_id uuid REFERENCES pt_workouts(id) ON DELETE SET NULL,
  session_name text NOT NULL,
  scheduled_date date,
  week_number integer NOT NULL,
  day_number integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'available', 'completed', 'skipped')),
  completed_at timestamptz,
  coach_note text,
  client_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_pt_session_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_session_id uuid NOT NULL REFERENCES client_pt_sessions(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id) ON DELETE SET NULL,
  exercise_name_snapshot text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  block_label text,
  prescription_type text NOT NULL DEFAULT 'reps'
    CHECK (prescription_type IN ('reps', 'time', 'distance')),
  sets integer,
  reps text,
  rep_range_min integer,
  rep_range_max integer,
  duration_seconds integer,
  distance_value numeric,
  distance_unit text,
  rest_seconds integer,
  tempo text,
  load_guidance text,
  rpe_target numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_pt_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_session_id uuid NOT NULL UNIQUE REFERENCES client_pt_sessions(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_at timestamptz NOT NULL DEFAULT now(),
  completion_status text NOT NULL DEFAULT 'completed'
    CHECK (completion_status IN ('completed', 'partial', 'skipped')),
  session_rpe numeric,
  energy_rating integer,
  client_feedback text,
  coach_follow_up_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_pt_log_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_log_id uuid NOT NULL REFERENCES client_pt_logs(id) ON DELETE CASCADE,
  client_session_exercise_id uuid REFERENCES client_pt_session_exercises(id) ON DELETE SET NULL,
  exercise_id uuid REFERENCES exercises(id) ON DELETE SET NULL,
  exercise_name_snapshot text NOT NULL,
  set_number integer NOT NULL DEFAULT 1,
  target_reps integer,
  completed_reps integer,
  weight_value numeric,
  weight_unit text,
  duration_seconds integer,
  distance_value numeric,
  distance_unit text,
  rpe numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_pt_assignments_one_active_per_client
  ON client_pt_program_assignments(client_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_pt_workouts_coach_id ON pt_workouts(coach_id);
CREATE INDEX IF NOT EXISTS idx_pt_workout_exercises_workout_id ON pt_workout_exercises(workout_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_pt_programs_coach_id ON pt_programs(coach_id);
CREATE INDEX IF NOT EXISTS idx_pt_program_sessions_program_id ON pt_program_sessions(program_id, week_number, day_number, sort_order);
CREATE INDEX IF NOT EXISTS idx_client_pt_assignments_client_id ON client_pt_program_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_pt_assignments_coach_id ON client_pt_program_assignments(coach_id);
CREATE INDEX IF NOT EXISTS idx_client_pt_sessions_assignment_id ON client_pt_sessions(assignment_id, week_number, day_number, sort_order);
CREATE INDEX IF NOT EXISTS idx_client_pt_sessions_client_id ON client_pt_sessions(client_id, status);
CREATE INDEX IF NOT EXISTS idx_client_pt_session_exercises_session_id ON client_pt_session_exercises(client_session_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_client_pt_logs_client_id ON client_pt_logs(client_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_pt_log_exercises_log_id ON client_pt_log_exercises(pt_log_id, set_number);

ALTER TABLE pt_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pt_workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE pt_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pt_program_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_pt_program_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_pt_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_pt_session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_pt_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_pt_log_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_own_pt_workouts" ON pt_workouts
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('coach', 'admin')
    AND coach_id = auth.uid()
  );

CREATE POLICY "coach_own_pt_workout_exercises" ON pt_workout_exercises
  FOR ALL USING (
    workout_id IN (
      SELECT id FROM pt_workouts
      WHERE coach_id = auth.uid()
    )
  );

CREATE POLICY "coach_own_pt_programs" ON pt_programs
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('coach', 'admin')
    AND coach_id = auth.uid()
  );

CREATE POLICY "coach_own_pt_program_sessions" ON pt_program_sessions
  FOR ALL USING (
    program_id IN (
      SELECT id FROM pt_programs
      WHERE coach_id = auth.uid()
    )
  );

CREATE POLICY "coach_own_client_pt_assignments" ON client_pt_program_assignments
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('coach', 'admin')
    AND coach_id = auth.uid()
  );

CREATE POLICY "client_read_own_pt_assignments" ON client_pt_program_assignments
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

CREATE POLICY "coach_own_client_pt_sessions" ON client_pt_sessions
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('coach', 'admin')
    AND coach_id = auth.uid()
  );

CREATE POLICY "client_read_own_pt_sessions" ON client_pt_sessions
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

CREATE POLICY "coach_own_client_pt_session_exercises" ON client_pt_session_exercises
  FOR ALL USING (
    client_session_id IN (
      SELECT id FROM client_pt_sessions
      WHERE coach_id = auth.uid()
    )
  );

CREATE POLICY "client_read_own_pt_session_exercises" ON client_pt_session_exercises
  FOR SELECT USING (
    client_session_id IN (
      SELECT id FROM client_pt_sessions
      WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "coach_own_client_pt_logs" ON client_pt_logs
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('coach', 'admin')
    AND coach_id = auth.uid()
  );

CREATE POLICY "client_read_own_pt_logs" ON client_pt_logs
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

CREATE POLICY "client_insert_own_pt_logs" ON client_pt_logs
  FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

CREATE POLICY "client_update_own_pt_logs" ON client_pt_logs
  FOR UPDATE USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

CREATE POLICY "coach_own_client_pt_log_exercises" ON client_pt_log_exercises
  FOR ALL USING (
    pt_log_id IN (
      SELECT id FROM client_pt_logs
      WHERE coach_id = auth.uid()
    )
  );

CREATE POLICY "client_read_own_pt_log_exercises" ON client_pt_log_exercises
  FOR SELECT USING (
    pt_log_id IN (
      SELECT id FROM client_pt_logs
      WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "client_insert_own_pt_log_exercises" ON client_pt_log_exercises
  FOR INSERT WITH CHECK (
    pt_log_id IN (
      SELECT id FROM client_pt_logs
      WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "client_update_own_pt_log_exercises" ON client_pt_log_exercises
  FOR UPDATE USING (
    pt_log_id IN (
      SELECT id FROM client_pt_logs
      WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    )
  );
