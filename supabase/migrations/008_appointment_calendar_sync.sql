ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS google_calendar_event_id text,
  ADD COLUMN IF NOT EXISTS google_calendar_event_link text;

CREATE INDEX IF NOT EXISTS idx_appointments_google_calendar_event_id
  ON appointments(google_calendar_event_id);
