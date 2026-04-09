create table nutrition_habit_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  category text not null default 'general',
  target_count integer not null default 1 check (target_count > 0),
  target_period text not null default 'day'
    check (target_period in ('day', 'week')),
  meal_slot text not null default 'any'
    check (meal_slot in ('breakfast', 'lunch', 'dinner', 'snacks', 'any')),
  coaching_notes text,
  is_archived boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table client_nutrition_habit_assignments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  habit_template_id uuid references nutrition_habit_templates(id) on delete set null,
  habit_name_snapshot text not null,
  description_snapshot text,
  category_snapshot text not null default 'general',
  target_count integer not null default 1 check (target_count > 0),
  target_period text not null default 'day'
    check (target_period in ('day', 'week')),
  meal_slot text not null default 'any'
    check (meal_slot in ('breakfast', 'lunch', 'dinner', 'snacks', 'any')),
  coaching_notes text,
  assigned_start_date date,
  status text not null default 'active'
    check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table nutrition_habit_templates enable row level security;
alter table client_nutrition_habit_assignments enable row level security;

create policy "coach_own_nutrition_habit_templates" on nutrition_habit_templates
  for all using (coach_id = auth.uid());

create policy "coach_own_client_nutrition_habit_assignments" on client_nutrition_habit_assignments
  for all using (coach_id = auth.uid());

create index idx_nutrition_habit_templates_coach_id on nutrition_habit_templates(coach_id, name);
create index idx_client_nutrition_habit_assignments_client_id on client_nutrition_habit_assignments(client_id, status, created_at desc);
