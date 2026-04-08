-- Repair live admin_settings profile parity for signup/settings saves.
ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS business_name text;
