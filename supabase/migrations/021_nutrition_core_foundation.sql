create table nutrition_recipes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'general',
  ingredients text,
  notes text,
  calories_kcal integer,
  protein_grams numeric,
  carbs_grams numeric,
  fats_grams numeric,
  meal_slot text not null default 'any'
    check (meal_slot in ('breakfast', 'lunch', 'dinner', 'snacks', 'any')),
  is_archived boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table nutrition_meal_plan_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  goal text,
  target_calories_kcal integer,
  target_protein_grams numeric,
  target_carbs_grams numeric,
  target_fats_grams numeric,
  is_archived boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table nutrition_meal_plan_template_days (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references nutrition_meal_plan_templates(id) on delete cascade,
  day text not null,
  breakfast text,
  lunch text,
  dinner text,
  snacks text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table nutrition_recipes enable row level security;
alter table nutrition_meal_plan_templates enable row level security;
alter table nutrition_meal_plan_template_days enable row level security;

create policy "coach_own_nutrition_recipes" on nutrition_recipes
  for all using (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('coach', 'admin')
    and coach_id = auth.uid()
  );

create policy "coach_own_nutrition_templates" on nutrition_meal_plan_templates
  for all using (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('coach', 'admin')
    and coach_id = auth.uid()
  );

create policy "coach_own_nutrition_template_days" on nutrition_meal_plan_template_days
  for all using (
    template_id in (
      select id from nutrition_meal_plan_templates where coach_id = auth.uid()
    )
  );

create index idx_nutrition_recipes_coach_id on nutrition_recipes(coach_id, name);
create index idx_nutrition_recipes_meal_slot on nutrition_recipes(coach_id, meal_slot);
create index idx_nutrition_templates_coach_id on nutrition_meal_plan_templates(coach_id, name);
create index idx_nutrition_template_days_template_id on nutrition_meal_plan_template_days(template_id, day);
