create table client_nutrition_check_ins (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  week_label text,
  adherence_score integer check (adherence_score between 1 and 10),
  energy_score integer check (energy_score between 1 and 10),
  hunger_score integer check (hunger_score between 1 and 10),
  digestion_score integer check (digestion_score between 1 and 10),
  sleep_score integer check (sleep_score between 1 and 10),
  wins text,
  struggles text,
  coach_follow_up_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table client_nutrition_check_ins enable row level security;

create policy "coach_own_client_nutrition_check_ins" on client_nutrition_check_ins
  for all using (coach_id = auth.uid());

create index idx_client_nutrition_check_ins_client_id on client_nutrition_check_ins(client_id, submitted_at desc);
