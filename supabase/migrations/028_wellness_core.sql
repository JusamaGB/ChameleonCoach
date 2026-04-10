alter table admin_settings
  add column if not exists managed_wellness_library_sheet_id text,
  add column if not exists managed_wellness_library_sheet_url text;

create table if not exists wellness_goal_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'general',
  description text,
  target_metric text,
  target_value text,
  milestone_label text,
  coaching_notes text,
  is_archived boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists wellness_habit_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  category text not null default 'general',
  target_count integer not null default 1 check (target_count > 0),
  target_period text not null default 'day'
    check (target_period in ('day', 'week')),
  coaching_notes text,
  is_archived boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists client_wellness_goal_assignments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  goal_template_id uuid references wellness_goal_templates(id) on delete set null,
  goal_name_snapshot text not null,
  description_snapshot text,
  category_snapshot text not null default 'general',
  target_metric text,
  target_value text,
  milestone_label text,
  coaching_notes text,
  assigned_start_date date,
  status text not null default 'active'
    check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists client_wellness_habit_assignments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  habit_template_id uuid references wellness_habit_templates(id) on delete set null,
  habit_name_snapshot text not null,
  description_snapshot text,
  category_snapshot text not null default 'general',
  target_count integer not null default 1 check (target_count > 0),
  target_period text not null default 'day'
    check (target_period in ('day', 'week')),
  coaching_notes text,
  assigned_start_date date,
  status text not null default 'active'
    check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists client_wellness_habit_logs (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  assignment_id uuid not null references client_wellness_habit_assignments(id) on delete cascade,
  logged_at timestamptz not null default now(),
  completion_date date not null,
  completion_status text not null default 'completed'
    check (completion_status in ('completed', 'partial', 'missed')),
  adherence_score integer check (adherence_score between 1 and 10),
  notes text,
  coach_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists client_wellness_check_ins (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  week_label text,
  energy_score integer check (energy_score between 1 and 10),
  stress_score integer check (stress_score between 1 and 10),
  sleep_score integer check (sleep_score between 1 and 10),
  confidence_score integer check (confidence_score between 1 and 10),
  wins text,
  blockers text,
  focus_for_next_week text,
  coach_follow_up_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists client_wellness_session_notes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  session_date date not null,
  session_type text not null default 'coaching_session',
  summary text not null,
  client_wins text,
  priorities text,
  action_steps text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table wellness_goal_templates enable row level security;
alter table wellness_habit_templates enable row level security;
alter table client_wellness_goal_assignments enable row level security;
alter table client_wellness_habit_assignments enable row level security;
alter table client_wellness_habit_logs enable row level security;
alter table client_wellness_check_ins enable row level security;
alter table client_wellness_session_notes enable row level security;

create policy "coach_own_wellness_goal_templates" on wellness_goal_templates
  for all using (coach_id = auth.uid());

create policy "coach_own_wellness_habit_templates" on wellness_habit_templates
  for all using (coach_id = auth.uid());

create policy "coach_own_client_wellness_goal_assignments" on client_wellness_goal_assignments
  for all using (coach_id = auth.uid());

create policy "coach_own_client_wellness_habit_assignments" on client_wellness_habit_assignments
  for all using (coach_id = auth.uid());

create policy "coach_own_client_wellness_habit_logs" on client_wellness_habit_logs
  for all using (coach_id = auth.uid());

create policy "coach_own_client_wellness_check_ins" on client_wellness_check_ins
  for all using (coach_id = auth.uid());

create policy "coach_own_client_wellness_session_notes" on client_wellness_session_notes
  for all using (coach_id = auth.uid());

create policy "client_read_own_wellness_goal_assignments" on client_wellness_goal_assignments
  for select using (
    client_id in (select id from clients where user_id = auth.uid())
  );

create policy "client_read_own_wellness_habit_assignments" on client_wellness_habit_assignments
  for select using (
    client_id in (select id from clients where user_id = auth.uid())
  );

create policy "client_read_own_wellness_habit_logs" on client_wellness_habit_logs
  for select using (
    client_id in (select id from clients where user_id = auth.uid())
  );

create policy "client_insert_own_wellness_habit_logs" on client_wellness_habit_logs
  for insert with check (
    client_id in (select id from clients where user_id = auth.uid())
  );

create policy "client_update_own_wellness_habit_logs" on client_wellness_habit_logs
  for update using (
    client_id in (select id from clients where user_id = auth.uid())
  );

create policy "client_read_own_wellness_check_ins" on client_wellness_check_ins
  for select using (
    client_id in (select id from clients where user_id = auth.uid())
  );

create policy "client_insert_own_wellness_check_ins" on client_wellness_check_ins
  for insert with check (
    client_id in (select id from clients where user_id = auth.uid())
  );

create policy "client_update_own_wellness_check_ins" on client_wellness_check_ins
  for update using (
    client_id in (select id from clients where user_id = auth.uid())
  );

create policy "client_read_own_wellness_session_notes" on client_wellness_session_notes
  for select using (
    client_id in (select id from clients where user_id = auth.uid())
  );

create index if not exists idx_wellness_goal_templates_coach_id on wellness_goal_templates(coach_id, name);
create index if not exists idx_wellness_habit_templates_coach_id on wellness_habit_templates(coach_id, name);
create index if not exists idx_client_wellness_goal_assignments_client_id on client_wellness_goal_assignments(client_id, status, created_at desc);
create index if not exists idx_client_wellness_habit_assignments_client_id on client_wellness_habit_assignments(client_id, status, created_at desc);
create index if not exists idx_client_wellness_habit_logs_assignment_id on client_wellness_habit_logs(assignment_id, completion_date desc);
create index if not exists idx_client_wellness_habit_logs_client_id on client_wellness_habit_logs(client_id, completion_date desc);
create index if not exists idx_client_wellness_check_ins_client_id on client_wellness_check_ins(client_id, submitted_at desc);
create index if not exists idx_client_wellness_session_notes_client_id on client_wellness_session_notes(client_id, session_date desc);
