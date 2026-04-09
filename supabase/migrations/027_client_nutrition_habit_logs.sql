create table if not exists client_nutrition_habit_logs (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  assignment_id uuid not null references client_nutrition_habit_assignments(id) on delete cascade,
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

alter table client_nutrition_habit_logs enable row level security;

create policy "coach_own_client_nutrition_habit_logs" on client_nutrition_habit_logs
  for all using (coach_id = auth.uid());

create index if not exists idx_client_nutrition_habit_logs_assignment_id
  on client_nutrition_habit_logs(assignment_id, completion_date desc);

create index if not exists idx_client_nutrition_habit_logs_client_id
  on client_nutrition_habit_logs(client_id, completion_date desc);
