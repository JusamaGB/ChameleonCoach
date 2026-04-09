create table client_nutrition_log_entries (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  logged_at timestamptz not null default now(),
  meal_slot text not null default 'any'
    check (meal_slot in ('breakfast', 'lunch', 'dinner', 'snacks', 'any')),
  entry_title text not null,
  notes text,
  adherence_flag text not null default 'flexible'
    check (adherence_flag in ('on_plan', 'off_plan', 'flexible')),
  hunger_score integer check (hunger_score between 1 and 10),
  coach_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table client_nutrition_log_entries enable row level security;

create policy "coach_own_client_nutrition_log_entries" on client_nutrition_log_entries
  for all using (coach_id = auth.uid());

create index idx_client_nutrition_log_entries_client_id on client_nutrition_log_entries(client_id, logged_at desc);
