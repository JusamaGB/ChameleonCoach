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
  coach_type_preset text
    check (coach_type_preset in (
      'personal_trainer',
      'nutritionist',
      'wellness_coach',
      'sports_performance_coach',
      'yoga_pilates_instructor',
      'gym_studio_owner'
    )),
  active_modules text[],
  managed_workspace_sheet_id text,
  managed_workspace_sheet_url text,
  managed_workspace_root_folder_id text,
  managed_workspace_root_folder_url text,
  managed_clients_folder_id text,
  managed_clients_folder_url text,
  managed_pt_library_sheet_id text,
  managed_pt_library_sheet_url text,
  managed_nutrition_library_sheet_id text,
  managed_nutrition_library_sheet_url text,
  managed_wellness_library_sheet_id text,
  managed_wellness_library_sheet_url text,
  managed_workspace_sheet_modules text[],
  managed_workspace_sheet_provisioned_at timestamptz,
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
  drive_folder_id text,
  drive_folder_url text,
  invite_token text unique,
  invite_expires_at timestamptz,
  invite_accepted_at timestamptz,
  onboarding_completed boolean default false,
  provisioning_status text not null default 'pending'
    check (provisioning_status in ('pending', 'provisioning', 'ready', 'failed')),
  provisioning_started_at timestamptz,
  provisioning_completed_at timestamptz,
  provisioning_last_error text,
  sheet_shared_email text,
  sheet_shared_permission_id text,
  sheet_shared_at timestamptz,
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

create table coach_payment_accounts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade unique,
  stripe_account_id text not null unique,
  account_type text not null default 'express'
    check (account_type in ('express')),
  onboarding_completed boolean not null default false,
  details_submitted boolean not null default false,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  default_currency text not null default 'gbp',
  country text not null default 'GB',
  last_account_link_url text,
  last_account_link_expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table coach_client_payment_customers (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  stripe_account_id text not null,
  stripe_customer_id text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (coach_id, client_id)
);

create table client_invoices (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  stripe_account_id text not null,
  stripe_customer_id text,
  stripe_invoice_id text unique,
  stripe_invoice_number text,
  stripe_hosted_invoice_url text,
  stripe_invoice_pdf_url text,
  source_appointment_id uuid references appointments(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'open', 'paid', 'void', 'uncollectible')),
  currency text not null default 'gbp',
  subtotal_amount integer not null default 0,
  total_amount integer not null default 0,
  due_date timestamptz,
  description text,
  internal_note text,
  paid_at timestamptz,
  voided_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table client_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references client_invoices(id) on delete cascade,
  label text not null,
  description text,
  quantity integer not null default 1,
  unit_amount integer not null,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table exercises (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  movement_pattern text,
  primary_muscles text,
  secondary_muscles text,
  equipment text,
  difficulty text,
  default_units text default 'reps',
  description text,
  coaching_notes text,
  media_url text,
  is_archived boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table pt_workouts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  goal text,
  estimated_duration_minutes integer,
  difficulty text,
  is_template boolean not null default true,
  is_archived boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table pt_workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references pt_workouts(id) on delete cascade,
  exercise_id uuid references exercises(id) on delete set null,
  sort_order integer not null default 0,
  block_label text,
  prescription_type text not null default 'reps'
    check (prescription_type in ('reps', 'time', 'distance')),
  sets integer,
  reps text,
  rep_range_min integer,
  rep_range_max integer,
  duration_seconds integer,
  distance_value numeric,
  distance_unit text,
  rest_seconds integer,
  tempo text,
  load_guidance text,
  rpe_target numeric,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table pt_programs (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  version_label text not null default 'v1',
  parent_program_id uuid references pt_programs(id) on delete set null,
  description text,
  goal text,
  duration_weeks integer not null default 1,
  difficulty text,
  progression_mode text not null default 'manual'
    check (progression_mode in ('manual', 'linear_load', 'linear_reps', 'volume_wave', 'deload_ready')),
  progression_notes text,
  is_template boolean not null default true,
  is_archived boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table pt_program_sessions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references pt_programs(id) on delete cascade,
  week_number integer not null,
  day_number integer not null,
  sort_order integer not null default 0,
  session_name text not null,
  workout_id uuid references pt_workouts(id) on delete set null,
  focus text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table client_pt_program_assignments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  program_id uuid references pt_programs(id) on delete set null,
  program_name_snapshot text not null,
  program_version_snapshot text,
  assigned_start_date date,
  assigned_end_date date,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'completed', 'cancelled')),
  current_week integer,
  assignment_notes text,
  last_session_completed_at timestamptz,
  completed_sessions_count integer not null default 0,
  total_sessions_count integer not null default 0,
  adherence_percent numeric not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table client_pt_sessions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references client_pt_program_assignments(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  coach_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid references pt_programs(id) on delete set null,
  program_session_id uuid references pt_program_sessions(id) on delete set null,
  workout_id uuid references pt_workouts(id) on delete set null,
  session_name text not null,
  scheduled_date date,
  week_number integer not null,
  day_number integer not null,
  sort_order integer not null default 0,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'available', 'completed', 'skipped')),
  completed_at timestamptz,
  coach_note text,
  client_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table client_pt_session_exercises (
  id uuid primary key default gen_random_uuid(),
  client_session_id uuid not null references client_pt_sessions(id) on delete cascade,
  exercise_id uuid references exercises(id) on delete set null,
  exercise_name_snapshot text not null,
  sort_order integer not null default 0,
  block_label text,
  prescription_type text not null default 'reps'
    check (prescription_type in ('reps', 'time', 'distance')),
  sets integer,
  reps text,
  rep_range_min integer,
  rep_range_max integer,
  duration_seconds integer,
  distance_value numeric,
  distance_unit text,
  rest_seconds integer,
  tempo text,
  load_guidance text,
  rpe_target numeric,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table client_pt_logs (
  id uuid primary key default gen_random_uuid(),
  client_session_id uuid not null unique references client_pt_sessions(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  coach_id uuid not null references auth.users(id) on delete cascade,
  logged_at timestamptz not null default now(),
  completion_status text not null default 'completed'
    check (completion_status in ('completed', 'partial', 'skipped')),
  session_rpe numeric,
  energy_rating integer,
  client_feedback text,
  coach_follow_up_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table client_pt_log_exercises (
  id uuid primary key default gen_random_uuid(),
  pt_log_id uuid not null references client_pt_logs(id) on delete cascade,
  client_session_exercise_id uuid references client_pt_session_exercises(id) on delete set null,
  exercise_id uuid references exercises(id) on delete set null,
  exercise_name_snapshot text not null,
  set_number integer not null default 1,
  target_reps integer,
  completed_reps integer,
  weight_value numeric,
  weight_unit text,
  duration_seconds integer,
  distance_value numeric,
  distance_unit text,
  rpe numeric,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

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

create table client_nutrition_habit_logs (
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

create table wellness_goal_templates (
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

create table wellness_habit_templates (
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

create table client_wellness_goal_assignments (
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

create table client_wellness_habit_assignments (
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

create table client_wellness_habit_logs (
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

create table client_wellness_check_ins (
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

create table client_wellness_session_notes (
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

create table product_requests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  problem_statement text not null,
  desired_outcome text,
  requester_user_id uuid references auth.users(id) on delete set null,
  requester_role text not null
    check (requester_role in ('coach', 'client', 'admin')),
  coach_id uuid references auth.users(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  module_area text not null,
  feature_area text,
  urgency text not null default 'important'
    check (urgency in ('nice_to_have', 'important', 'high_impact', 'blocking')),
  niche text not null default 'general',
  request_type text not null default 'workflow_improvement'
    check (request_type in (
      'new_feature',
      'module_expansion',
      'workflow_improvement',
      'ux_improvement',
      'bug_friction',
      'integration',
      'data_reporting'
    )),
  status text not null default 'submitted'
    check (status in (
      'submitted',
      'under_review',
      'gathering_demand',
      'planned',
      'in_design',
      'in_build',
      'released',
      'merged',
      'not_now',
      'declined'
    )),
  public_note text,
  duplicate_of_request_id uuid references product_requests(id) on delete set null,
  reward_state text not null default 'none'
    check (reward_state in ('none', 'under_review', 'eligible', 'granted')),
  implementation_note text,
  implemented_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table product_request_votes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references product_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (request_id, user_id)
);

create table product_request_comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references product_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null
    check (role in ('coach', 'client', 'admin')),
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table product_request_follows (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references product_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (request_id, user_id)
);

create table product_request_status_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references product_requests(id) on delete cascade,
  from_status text
    check (from_status in (
      'submitted',
      'under_review',
      'gathering_demand',
      'planned',
      'in_design',
      'in_build',
      'released',
      'merged',
      'not_now',
      'declined'
    )),
  to_status text not null
    check (to_status in (
      'submitted',
      'under_review',
      'gathering_demand',
      'planned',
      'in_design',
      'in_build',
      'released',
      'merged',
      'not_now',
      'declined'
    )),
  note text,
  changed_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create table contributor_rewards (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references product_requests(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_type text not null
    check (reward_type in (
      'account_credit',
      'extended_trial',
      'free_month',
      'module_unlock',
      'premium_access',
      'early_access',
      'contributor_badge'
    )),
  title text not null,
  description text,
  reward_value text,
  granted_by_user_id uuid references auth.users(id) on delete set null,
  granted_at timestamptz default now(),
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- Row-level security
alter table admin_settings enable row level security;
alter table clients enable row level security;
alter table appointments enable row level security;
alter table appointment_slots enable row level security;
alter table exercises enable row level security;
alter table pt_workouts enable row level security;
alter table pt_workout_exercises enable row level security;
alter table pt_programs enable row level security;
alter table pt_program_sessions enable row level security;
alter table client_pt_program_assignments enable row level security;
alter table client_pt_sessions enable row level security;
alter table client_pt_session_exercises enable row level security;
alter table client_pt_logs enable row level security;
alter table client_pt_log_exercises enable row level security;
alter table nutrition_recipes enable row level security;
alter table nutrition_meal_plan_templates enable row level security;
alter table nutrition_meal_plan_template_days enable row level security;
alter table nutrition_habit_templates enable row level security;
alter table client_nutrition_habit_assignments enable row level security;
alter table client_nutrition_habit_logs enable row level security;
alter table client_nutrition_check_ins enable row level security;
alter table client_nutrition_log_entries enable row level security;
alter table wellness_goal_templates enable row level security;
alter table wellness_habit_templates enable row level security;
alter table client_wellness_goal_assignments enable row level security;
alter table client_wellness_habit_assignments enable row level security;
alter table client_wellness_habit_logs enable row level security;
alter table client_wellness_check_ins enable row level security;
alter table client_wellness_session_notes enable row level security;
alter table product_requests enable row level security;
alter table product_request_votes enable row level security;
alter table product_request_comments enable row level security;
alter table product_request_follows enable row level security;
alter table product_request_status_history enable row level security;
alter table contributor_rewards enable row level security;

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

create policy "coach_own_pt_workouts" on pt_workouts
  for all using (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('coach', 'admin')
    and coach_id = auth.uid()
  );

create policy "coach_own_pt_workout_exercises" on pt_workout_exercises
  for all using (
    workout_id in (
      select id from pt_workouts where coach_id = auth.uid()
    )
  );

create policy "coach_own_pt_programs" on pt_programs
  for all using (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('coach', 'admin')
    and coach_id = auth.uid()
  );

create policy "coach_own_pt_program_sessions" on pt_program_sessions
  for all using (
    program_id in (
      select id from pt_programs where coach_id = auth.uid()
    )
  );

create policy "coach_own_client_pt_assignments" on client_pt_program_assignments
  for all using (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('coach', 'admin')
    and coach_id = auth.uid()
  );

create policy "client_read_own_pt_assignments" on client_pt_program_assignments
  for select using (
    client_id in (select id from clients where user_id = auth.uid())
  );

create policy "coach_own_client_pt_sessions" on client_pt_sessions
  for all using (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('coach', 'admin')
    and coach_id = auth.uid()
  );

create policy "client_read_own_pt_sessions" on client_pt_sessions
  for select using (
    client_id in (select id from clients where user_id = auth.uid())
  );

create policy "coach_own_client_pt_session_exercises" on client_pt_session_exercises
  for all using (
    client_session_id in (
      select id from client_pt_sessions where coach_id = auth.uid()
    )
  );

create policy "client_read_own_pt_session_exercises" on client_pt_session_exercises
  for select using (
    client_session_id in (
      select id from client_pt_sessions
      where client_id in (select id from clients where user_id = auth.uid())
    )
  );

create policy "coach_own_client_pt_logs" on client_pt_logs
  for all using (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('coach', 'admin')
    and coach_id = auth.uid()
  );

create policy "client_read_own_pt_logs" on client_pt_logs
  for select using (
    client_id in (select id from clients where user_id = auth.uid())
  );

create policy "client_insert_own_pt_logs" on client_pt_logs
  for insert with check (
    client_id in (select id from clients where user_id = auth.uid())
  );

create policy "client_update_own_pt_logs" on client_pt_logs
  for update using (
    client_id in (select id from clients where user_id = auth.uid())
  );

create policy "coach_own_client_pt_log_exercises" on client_pt_log_exercises
  for all using (
    pt_log_id in (
      select id from client_pt_logs where coach_id = auth.uid()
    )
  );

create policy "client_read_own_pt_log_exercises" on client_pt_log_exercises
  for select using (
    pt_log_id in (
      select id from client_pt_logs
      where client_id in (select id from clients where user_id = auth.uid())
    )
  );

create policy "client_insert_own_pt_log_exercises" on client_pt_log_exercises
  for insert with check (
    pt_log_id in (
      select id from client_pt_logs
      where client_id in (select id from clients where user_id = auth.uid())
    )
  );

create policy "client_update_own_pt_log_exercises" on client_pt_log_exercises
  for update using (
    pt_log_id in (
      select id from client_pt_logs
      where client_id in (select id from clients where user_id = auth.uid())
    )
  );

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

create policy "coach_own_nutrition_habit_templates" on nutrition_habit_templates
  for all using (coach_id = auth.uid());

create policy "coach_own_client_nutrition_habit_assignments" on client_nutrition_habit_assignments
  for all using (coach_id = auth.uid());

create policy "coach_own_client_nutrition_habit_logs" on client_nutrition_habit_logs
  for all using (coach_id = auth.uid());

create policy "coach_own_client_nutrition_check_ins" on client_nutrition_check_ins
  for all using (coach_id = auth.uid());

create policy "coach_own_client_nutrition_log_entries" on client_nutrition_log_entries
  for all using (coach_id = auth.uid());

create policy "client_read_own_nutrition_habit_assignments" on client_nutrition_habit_assignments
  for select using (
    client_id in (select id from clients where user_id = auth.uid())
  );

create policy "client_read_own_nutrition_habit_logs" on client_nutrition_habit_logs
  for select using (
    client_id in (select id from clients where user_id = auth.uid())
  );

create policy "client_insert_own_nutrition_habit_logs" on client_nutrition_habit_logs
  for insert with check (
    client_id in (select id from clients where user_id = auth.uid())
  );

create policy "client_update_own_nutrition_habit_logs" on client_nutrition_habit_logs
  for update using (
    client_id in (select id from clients where user_id = auth.uid())
  );

create policy "client_read_own_nutrition_check_ins" on client_nutrition_check_ins
  for select using (
    client_id in (select id from clients where user_id = auth.uid())
  );

create policy "client_insert_own_nutrition_check_ins" on client_nutrition_check_ins
  for insert with check (
    client_id in (select id from clients where user_id = auth.uid())
  );

create policy "client_update_own_nutrition_check_ins" on client_nutrition_check_ins
  for update using (
    client_id in (select id from clients where user_id = auth.uid())
  );

create policy "client_read_own_nutrition_log_entries" on client_nutrition_log_entries
  for select using (
    client_id in (select id from clients where user_id = auth.uid())
  );

create policy "client_insert_own_nutrition_log_entries" on client_nutrition_log_entries
  for insert with check (
    client_id in (select id from clients where user_id = auth.uid())
  );

create policy "client_update_own_nutrition_log_entries" on client_nutrition_log_entries
  for update using (
    client_id in (select id from clients where user_id = auth.uid())
  );

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

create policy "authenticated_read_product_requests" on product_requests
  for select using (auth.uid() is not null);

create policy "authenticated_insert_product_requests" on product_requests
  for insert with check (auth.uid() = requester_user_id);

create policy "requester_update_own_product_requests" on product_requests
  for update using (
    auth.uid() = requester_user_id
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "authenticated_read_request_votes" on product_request_votes
  for select using (auth.uid() is not null);

create policy "authenticated_insert_own_request_votes" on product_request_votes
  for insert with check (auth.uid() = user_id);

create policy "authenticated_delete_own_request_votes" on product_request_votes
  for delete using (auth.uid() = user_id);

create policy "authenticated_read_request_comments" on product_request_comments
  for select using (auth.uid() is not null);

create policy "authenticated_insert_own_request_comments" on product_request_comments
  for insert with check (auth.uid() = user_id);

create policy "author_update_own_request_comments" on product_request_comments
  for update using (
    auth.uid() = user_id
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "authenticated_read_request_follows" on product_request_follows
  for select using (auth.uid() is not null);

create policy "authenticated_insert_own_request_follows" on product_request_follows
  for insert with check (auth.uid() = user_id);

create policy "authenticated_delete_own_request_follows" on product_request_follows
  for delete using (auth.uid() = user_id);

create policy "authenticated_read_request_status_history" on product_request_status_history
  for select using (auth.uid() is not null);

create policy "admin_insert_request_status_history" on product_request_status_history
  for insert with check (
    auth.uid() = changed_by_user_id
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "authenticated_read_contributor_rewards" on contributor_rewards
  for select using (auth.uid() is not null);

create policy "admin_manage_contributor_rewards" on contributor_rewards
  for all using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

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
create index idx_coach_payment_accounts_coach_id on coach_payment_accounts(coach_id);
create index idx_coach_client_payment_customers_coach_client on coach_client_payment_customers(coach_id, client_id);
create index idx_client_invoices_coach_id on client_invoices(coach_id, created_at desc);
create index idx_client_invoices_client_id on client_invoices(client_id, created_at desc);
create index idx_client_invoices_status on client_invoices(status, created_at desc);
create index idx_client_invoices_stripe_invoice_id on client_invoices(stripe_invoice_id);
create index idx_client_invoice_items_invoice_id on client_invoice_items(invoice_id, sort_order);
create index idx_exercises_coach_id on exercises(coach_id);
create index idx_exercises_coach_id_category on exercises(coach_id, category);
create index idx_exercises_coach_id_name on exercises(coach_id, name);
create index idx_pt_workouts_coach_id on pt_workouts(coach_id);
create index idx_pt_workout_exercises_workout_id on pt_workout_exercises(workout_id, sort_order);
create index idx_pt_programs_coach_id on pt_programs(coach_id);
create index idx_pt_program_sessions_program_id on pt_program_sessions(program_id, week_number, day_number, sort_order);
create index idx_client_pt_assignments_client_id on client_pt_program_assignments(client_id);
create index idx_client_pt_assignments_coach_id on client_pt_program_assignments(coach_id);
create unique index idx_client_pt_assignments_one_active_per_client on client_pt_program_assignments(client_id)
  where status = 'active';
create index idx_client_pt_sessions_assignment_id on client_pt_sessions(assignment_id, week_number, day_number, sort_order);
create index idx_client_pt_sessions_client_id on client_pt_sessions(client_id, status);
create index idx_client_pt_session_exercises_session_id on client_pt_session_exercises(client_session_id, sort_order);
create index idx_client_pt_logs_client_id on client_pt_logs(client_id, logged_at desc);
create index idx_client_pt_log_exercises_log_id on client_pt_log_exercises(pt_log_id, set_number);
create index idx_nutrition_recipes_coach_id on nutrition_recipes(coach_id, name);
create index idx_nutrition_recipes_meal_slot on nutrition_recipes(coach_id, meal_slot);
create index idx_nutrition_templates_coach_id on nutrition_meal_plan_templates(coach_id, name);
create index idx_nutrition_template_days_template_id on nutrition_meal_plan_template_days(template_id, day);
create index idx_nutrition_habit_templates_coach_id on nutrition_habit_templates(coach_id, name);
create index idx_client_nutrition_habit_assignments_client_id on client_nutrition_habit_assignments(client_id, status, created_at desc);
create index idx_client_nutrition_habit_logs_assignment_id on client_nutrition_habit_logs(assignment_id, completion_date desc);
create index idx_client_nutrition_habit_logs_client_id on client_nutrition_habit_logs(client_id, completion_date desc);
create index idx_client_nutrition_check_ins_client_id on client_nutrition_check_ins(client_id, submitted_at desc);
create index idx_client_nutrition_log_entries_client_id on client_nutrition_log_entries(client_id, logged_at desc);
create index idx_wellness_goal_templates_coach_id on wellness_goal_templates(coach_id, name);
create index idx_wellness_habit_templates_coach_id on wellness_habit_templates(coach_id, name);
create index idx_client_wellness_goal_assignments_client_id on client_wellness_goal_assignments(client_id, status, created_at desc);
create index idx_client_wellness_habit_assignments_client_id on client_wellness_habit_assignments(client_id, status, created_at desc);
create index idx_client_wellness_habit_logs_assignment_id on client_wellness_habit_logs(assignment_id, completion_date desc);
create index idx_client_wellness_habit_logs_client_id on client_wellness_habit_logs(client_id, completion_date desc);
create index idx_client_wellness_check_ins_client_id on client_wellness_check_ins(client_id, submitted_at desc);
create index idx_client_wellness_session_notes_client_id on client_wellness_session_notes(client_id, session_date desc);
create index idx_product_requests_status on product_requests(status, created_at desc);
create index idx_product_requests_module_area on product_requests(module_area, created_at desc);
create index idx_product_requests_requester on product_requests(requester_user_id, created_at desc);
create index idx_product_requests_coach on product_requests(coach_id, created_at desc);
create index idx_product_request_votes_request on product_request_votes(request_id);
create index idx_product_request_comments_request on product_request_comments(request_id, created_at asc);
create index idx_product_request_follows_request on product_request_follows(request_id);
create index idx_product_request_status_history_request on product_request_status_history(request_id, created_at desc);
create index idx_contributor_rewards_user on contributor_rewards(user_id, granted_at desc);
