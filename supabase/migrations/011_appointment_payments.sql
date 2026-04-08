ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS session_price_amount integer,
  ADD COLUMN IF NOT EXISTS session_price_currency text,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'payment_requested', 'paid', 'payment_failed')),
  ADD COLUMN IF NOT EXISTS payment_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS payment_checkout_url text,
  ADD COLUMN IF NOT EXISTS payment_checkout_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_failed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_appointments_payment_checkout_session_id
  ON appointments(payment_checkout_session_id);
