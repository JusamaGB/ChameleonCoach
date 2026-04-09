ALTER TABLE pt_programs
  ADD COLUMN IF NOT EXISTS version_label text NOT NULL DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS parent_program_id uuid REFERENCES pt_programs(id) ON DELETE SET NULL;

ALTER TABLE client_pt_program_assignments
  ADD COLUMN IF NOT EXISTS program_version_snapshot text;

UPDATE pt_programs
SET version_label = 'v1'
WHERE version_label IS NULL OR btrim(version_label) = '';

UPDATE client_pt_program_assignments assignments
SET program_version_snapshot = COALESCE(programs.version_label, 'v1')
FROM pt_programs programs
WHERE assignments.program_id = programs.id
  AND assignments.program_version_snapshot IS NULL;
