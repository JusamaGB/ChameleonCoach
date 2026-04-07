-- Migration 002: Stripe subscription columns on user_roles

ALTER TABLE user_roles
  ADD COLUMN stripe_customer_id text,
  ADD COLUMN stripe_subscription_id text,
  ADD COLUMN stripe_subscription_status text DEFAULT 'trialing',
  ADD COLUMN trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  ADD COLUMN subscription_ends_at timestamptz;

CREATE INDEX idx_user_roles_stripe_customer ON user_roles(stripe_customer_id);
CREATE INDEX idx_user_roles_stripe_subscription ON user_roles(stripe_subscription_id);
