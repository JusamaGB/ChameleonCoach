ALTER TABLE pt_programs
  ADD COLUMN IF NOT EXISTS progression_mode text NOT NULL DEFAULT 'manual'
    CHECK (progression_mode IN ('manual', 'linear_load', 'linear_reps', 'volume_wave', 'deload_ready')),
  ADD COLUMN IF NOT EXISTS progression_notes text;
