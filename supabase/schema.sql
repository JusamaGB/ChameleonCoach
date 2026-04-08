-- G-Fitness database schema
-- Run this in the Supabase SQL editor after creating your project

-- Admin settings (stores Eliot's Google OAuth tokens)
create table admin_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  google_refresh_token text,
  google_access_token text,
  google_token_expiry timestamptz,
  display_name text,
  business_name text,
  brand_title text,
  brand_logo_url text,
  brand_primary_color text,
  brand_accent_color text,
  brand_welcome_text text,
  show_powered_by boolean default true,
  appointment_booking_mode text default 'coach_only',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Clients (each row = one of Eliot's clients)
create table clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null unique,
  sheet_id text,
  invite_token text unique,
  invite_expires_at timestamptz,
  invite_accepted_at timestamptz,
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'declined', 'cancelled')),
  requested_note text,
  confirmed_at timestamptz,
  duration_minutes integer not null default 60,
  coach_note text,
  session_price_amount integer,
  session_price_currency text,
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'payment_requested', 'paid', 'payment_failed')),
  payment_requested_at timestamptz,
  payment_checkout_session_id text,
  payment_checkout_url text,
  payment_checkout_expires_at timestamptz,
  payment_paid_at timestamptz,
  payment_failed_at timestamptz,
  google_calendar_event_id text,
  google_calendar_event_link text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table appointment_slots (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  duration_minutes integer not null default 60,
  is_visible boolean not null default false,
  appointment_id uuid unique references appointments(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table exercises (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  description text,
  coaching_notes text,
  media_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row-level security
alter table admin_settings enable row level security;
alter table clients enable row level security;
alter table appointments enable row level security;
alter table appointment_slots enable row level security;
alter table exercises enable row level security;

-- Admin can read/write their own settings
create policy "admin_own_settings" on admin_settings
  for all using (auth.uid() = user_id);

-- Admin can manage all clients (identified by ADMIN_EMAIL check in API routes)
-- Clients can read their own row
create policy "clients_read_own" on clients
  for select using (auth.uid() = user_id);

-- Admin full access to clients via role-based access control
create policy "admin_full_access" on clients
  for all using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "coach_own_appointments" on appointments
  for all using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'coach'
    and coach_id = auth.uid()
  );

create policy "client_own_appointments" on appointments
  for select using (
    client_id in (select id from clients where user_id = auth.uid())
  );

create policy "client_request_appointment" on appointments
  for insert with check (
    client_id in (select id from clients where user_id = auth.uid())
  );

create policy "coach_own_appointment_slots" on appointment_slots
  for all using (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('coach', 'admin')
    and coach_id = auth.uid()
  );

create policy "coach_own_exercises" on exercises
  for all using (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('coach', 'admin')
    and coach_id = auth.uid()
  );

-- User roles table (source of truth for RBAC)
create table user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  role text not null default 'client' check (role in ('admin', 'client')),
  created_at timestamptz default now()
);

alter table user_roles enable row level security;

-- Only service role can manage roles (no RLS policy = no access via anon/authenticated keys)

-- Trigger: sync role into auth.users.raw_app_meta_data on insert/update
create or replace function sync_role_to_app_metadata()
returns trigger as $$
begin
  update auth.users
  set raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', NEW.role)
  where id = NEW.user_id;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_role_change
  after insert or update on user_roles
  for each row execute function sync_role_to_app_metadata();

-- Indexes
create index idx_clients_email on clients(email);
create index idx_clients_invite_token on clients(invite_token);
create index idx_clients_user_id on clients(user_id);
create index idx_appointments_coach_id on appointments(coach_id);
create index idx_appointments_client_id on appointments(client_id);
create index idx_appointments_google_calendar_event_id on appointments(google_calendar_event_id);
create index idx_appointments_payment_checkout_session_id on appointments(payment_checkout_session_id);
create index idx_appointment_slots_coach_id on appointment_slots(coach_id);
create index idx_appointment_slots_starts_at on appointment_slots(starts_at);
create index idx_exercises_coach_id on exercises(coach_id);
create index idx_exercises_coach_id_category on exercises(coach_id, category);
create index idx_exercises_coach_id_name on exercises(coach_id, name);
