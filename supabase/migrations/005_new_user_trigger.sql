-- Auto-insert user_roles when a new auth user is created.
-- Reads role from app_metadata set by the registration API route.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := NEW.raw_app_meta_data->>'role';
  IF v_role IN ('coach', 'admin', 'client') THEN
    INSERT INTO public.user_roles (user_id, role, stripe_subscription_status, trial_ends_at)
    VALUES (
      NEW.id,
      v_role,
      'trialing',
      now() + interval '14 days'
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
