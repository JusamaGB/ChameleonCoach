-- G-Fitness database schema
-- Run this in the Supabase SQL editor after creating your project

-- Admin settings (stores Eliot's Google OAuth tokens)
create table admin_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  google_refresh_token text,
  google_access_token text,
  google_token_expiry timestamptz,
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

-- Row-level security
alter table admin_settings enable row level security;
alter table clients enable row level security;

-- Admin can read/write their own settings
create policy "admin_own_settings" on admin_settings
  for all using (auth.uid() = user_id);

-- Admin can manage all clients (identified by ADMIN_EMAIL check in API routes)
-- Clients can read their own row
create policy "clients_read_own" on clients
  for select using (auth.uid() = user_id);

-- Admin full access to clients (service role used in API routes)
-- No RLS policy needed — API routes use service role key for admin operations

-- Indexes
create index idx_clients_email on clients(email);
create index idx_clients_invite_token on clients(invite_token);
create index idx_clients_user_id on clients(user_id);
