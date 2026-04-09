export interface Client {
  id: string
  user_id: string | null
  coach_id: string | null
  name: string
  email: string
  sheet_id: string | null
  drive_folder_id: string | null
  drive_folder_url: string | null
  invite_token: string | null
  invite_expires_at: string | null
  invite_accepted_at: string | null
  onboarding_completed: boolean
  sheet_shared_email: string | null
  sheet_shared_permission_id: string | null
  sheet_shared_at: string | null
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  coach_id: string
  client_id: string
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled'
  requested_note: string | null
  confirmed_at: string | null
  duration_minutes: number
  coach_note: string | null
  session_price_amount: number | null
  session_price_currency: string | null
  payment_status: 'unpaid' | 'payment_requested' | 'paid' | 'payment_failed'
  payment_requested_at: string | null
  payment_checkout_session_id: string | null
  payment_checkout_url: string | null
  payment_checkout_expires_at: string | null
  payment_paid_at: string | null
  payment_failed_at: string | null
  google_calendar_event_id: string | null
  google_calendar_event_link: string | null
  created_at: string
  updated_at: string
}

export interface AdminSettings {
  id: string
  user_id: string
  google_refresh_token: string | null
  google_access_token: string | null
  google_token_expiry: string | null
  display_name: string | null
  business_name: string | null
  brand_title: string | null
  brand_logo_url: string | null
  brand_primary_color: string | null
  brand_accent_color: string | null
  brand_welcome_text: string | null
  show_powered_by: boolean | null
  coach_type_preset:
    | 'personal_trainer'
    | 'nutritionist'
    | 'wellness_coach'
    | 'sports_performance_coach'
    | 'yoga_pilates_instructor'
    | 'gym_studio_owner'
    | null
  active_modules: string[] | null
  managed_workspace_sheet_id: string | null
  managed_workspace_sheet_url: string | null
  managed_workspace_root_folder_id: string | null
  managed_workspace_root_folder_url: string | null
  managed_clients_folder_id: string | null
  managed_clients_folder_url: string | null
  managed_pt_library_sheet_id: string | null
  managed_pt_library_sheet_url: string | null
  managed_nutrition_library_sheet_id: string | null
  managed_nutrition_library_sheet_url: string | null
  managed_workspace_sheet_modules: string[] | null
  managed_workspace_sheet_provisioned_at: string | null
  appointment_booking_mode: 'coach_only' | 'client_request_visible_slots' | null
  created_at: string
  updated_at: string
}

export interface AppointmentSlot {
  id: string
  coach_id: string
  starts_at: string
  duration_minutes: number
  is_visible: boolean
  appointment_id: string | null
  created_at: string
  updated_at: string
}

export interface Exercise {
  id: string
  coach_id: string
  name: string
  category: string
  movement_pattern: string | null
  primary_muscles: string | null
  secondary_muscles: string | null
  equipment: string | null
  difficulty: string | null
  default_units: string | null
  description: string | null
  coaching_notes: string | null
  media_url: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface PTWorkout {
  id: string
  coach_id: string
  name: string
  description: string | null
  goal: string | null
  estimated_duration_minutes: number | null
  difficulty: string | null
  is_template: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface PTWorkoutExercise {
  id: string
  workout_id: string
  exercise_id: string | null
  sort_order: number
  block_label: string | null
  prescription_type: "reps" | "time" | "distance"
  sets: number | null
  reps: string | null
  rep_range_min: number | null
  rep_range_max: number | null
  duration_seconds: number | null
  distance_value: number | null
  distance_unit: string | null
  rest_seconds: number | null
  tempo: string | null
  load_guidance: string | null
  rpe_target: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PTProgram {
  id: string
  coach_id: string
  name: string
  version_label: string
  parent_program_id: string | null
  description: string | null
  goal: string | null
  duration_weeks: number
  difficulty: string | null
  progression_mode: "manual" | "linear_load" | "linear_reps" | "volume_wave" | "deload_ready"
  progression_notes: string | null
  is_template: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface PTProgramSession {
  id: string
  program_id: string
  week_number: number
  day_number: number
  sort_order: number
  session_name: string
  workout_id: string | null
  focus: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ClientPTProgramAssignment {
  id: string
  coach_id: string
  client_id: string
  program_id: string | null
  program_name_snapshot: string
  program_version_snapshot: string | null
  assigned_start_date: string | null
  assigned_end_date: string | null
  status: "draft" | "active" | "completed" | "cancelled"
  current_week: number | null
  assignment_notes: string | null
  last_session_completed_at: string | null
  completed_sessions_count: number
  total_sessions_count: number
  adherence_percent: number
  created_at: string
  updated_at: string
}

export interface ClientPTSession {
  id: string
  assignment_id: string
  client_id: string
  coach_id: string
  program_id: string | null
  program_session_id: string | null
  workout_id: string | null
  session_name: string
  scheduled_date: string | null
  week_number: number
  day_number: number
  sort_order: number
  status: "upcoming" | "available" | "completed" | "skipped"
  completed_at: string | null
  coach_note: string | null
  client_note: string | null
  created_at: string
  updated_at: string
}

export interface ClientPTSessionExercise {
  id: string
  client_session_id: string
  exercise_id: string | null
  exercise_name_snapshot: string
  sort_order: number
  block_label: string | null
  prescription_type: "reps" | "time" | "distance"
  sets: number | null
  reps: string | null
  rep_range_min: number | null
  rep_range_max: number | null
  duration_seconds: number | null
  distance_value: number | null
  distance_unit: string | null
  rest_seconds: number | null
  tempo: string | null
  load_guidance: string | null
  rpe_target: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ClientPTLog {
  id: string
  client_session_id: string
  client_id: string
  coach_id: string
  logged_at: string
  completion_status: "completed" | "partial" | "skipped"
  session_rpe: number | null
  energy_rating: number | null
  client_feedback: string | null
  coach_follow_up_note: string | null
  created_at: string
  updated_at: string
}

export interface ClientPTLogExercise {
  id: string
  pt_log_id: string
  client_session_exercise_id: string | null
  exercise_id: string | null
  exercise_name_snapshot: string
  set_number: number
  target_reps: number | null
  completed_reps: number | null
  weight_value: number | null
  weight_unit: string | null
  duration_seconds: number | null
  distance_value: number | null
  distance_unit: string | null
  rpe: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface OnboardingData {
  name: string
  age: number
  gender: string
  height: string
  current_weight: string
  goal_weight: string
  fitness_goals: string
  dietary_restrictions: string
  health_conditions: string
  activity_level: "sedentary" | "lightly_active" | "moderately_active" | "very_active"
  notes: string
}

export interface MealPlanDay {
  day: string
  breakfast: string
  lunch: string
  dinner: string
  snacks: string
}

export interface NutritionRecipe {
  id: string
  coach_id: string
  name: string
  category: string
  ingredients: string | null
  notes: string | null
  calories_kcal: number | null
  protein_grams: number | null
  carbs_grams: number | null
  fats_grams: number | null
  meal_slot: "breakfast" | "lunch" | "dinner" | "snacks" | "any"
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface NutritionMealPlanTemplate {
  id: string
  coach_id: string
  name: string
  description: string | null
  goal: string | null
  target_calories_kcal: number | null
  target_protein_grams: number | null
  target_carbs_grams: number | null
  target_fats_grams: number | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface NutritionMealPlanTemplateDay {
  id: string
  template_id: string
  day: string
  breakfast: string | null
  lunch: string | null
  dinner: string | null
  snacks: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface NutritionHabitTemplate {
  id: string
  coach_id: string
  name: string
  description: string | null
  category: string
  target_count: number
  target_period: "day" | "week"
  meal_slot: "breakfast" | "lunch" | "dinner" | "snacks" | "any"
  coaching_notes: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface ClientNutritionHabitAssignment {
  id: string
  coach_id: string
  client_id: string
  habit_template_id: string | null
  habit_name_snapshot: string
  description_snapshot: string | null
  category_snapshot: string
  target_count: number
  target_period: "day" | "week"
  meal_slot: "breakfast" | "lunch" | "dinner" | "snacks" | "any"
  coaching_notes: string | null
  assigned_start_date: string | null
  status: "active" | "completed" | "cancelled"
  created_at: string
  updated_at: string
}

export interface ClientNutritionCheckIn {
  id: string
  coach_id: string
  client_id: string
  submitted_at: string
  week_label: string | null
  adherence_score: number | null
  energy_score: number | null
  hunger_score: number | null
  digestion_score: number | null
  sleep_score: number | null
  wins: string | null
  struggles: string | null
  coach_follow_up_note: string | null
  created_at: string
  updated_at: string
}

export interface ClientNutritionLogEntry {
  id: string
  coach_id: string
  client_id: string
  logged_at: string
  meal_slot: "breakfast" | "lunch" | "dinner" | "snacks" | "any"
  entry_title: string
  notes: string | null
  adherence_flag: "on_plan" | "off_plan" | "flexible"
  hunger_score: number | null
  coach_note: string | null
  created_at: string
  updated_at: string
}

export interface ProgressEntry {
  date: string
  weight: string
  measurements: string
  notes: string
}

export interface ProfileData {
  name: string
  email: string
  age: string
  gender: string
  height: string
  current_weight: string
  goal_weight: string
  fitness_goals: string
  dietary_restrictions: string
  health_conditions: string
  activity_level: string
  notes: string
}

export type ProductRequestUrgency =
  | "nice_to_have"
  | "important"
  | "high_impact"
  | "blocking"

export type ProductRequestStatus =
  | "submitted"
  | "under_review"
  | "gathering_demand"
  | "planned"
  | "in_design"
  | "in_build"
  | "released"
  | "merged"
  | "not_now"
  | "declined"

export type ProductRequestType =
  | "new_feature"
  | "module_expansion"
  | "workflow_improvement"
  | "ux_improvement"
  | "bug_friction"
  | "integration"
  | "data_reporting"

export type ProductRequestRole = "coach" | "client" | "admin"

export type ProductRewardType =
  | "account_credit"
  | "extended_trial"
  | "free_month"
  | "module_unlock"
  | "premium_access"
  | "early_access"
  | "contributor_badge"

export interface ProductRequest {
  id: string
  title: string
  summary: string | null
  problem_statement: string
  desired_outcome: string | null
  requester_user_id: string | null
  requester_role: ProductRequestRole
  coach_id: string | null
  client_id: string | null
  module_area: string
  feature_area: string | null
  urgency: ProductRequestUrgency
  niche: string
  request_type: ProductRequestType
  status: ProductRequestStatus
  public_note: string | null
  duplicate_of_request_id: string | null
  reward_state: "none" | "under_review" | "eligible" | "granted"
  implementation_note: string | null
  implemented_at: string | null
  created_at: string
  updated_at: string
}

export interface ProductRequestVote {
  id: string
  request_id: string
  user_id: string
  created_at: string
}

export interface ProductRequestComment {
  id: string
  request_id: string
  user_id: string
  role: ProductRequestRole
  body: string
  created_at: string
  updated_at: string
}

export interface ProductRequestFollower {
  id: string
  request_id: string
  user_id: string
  created_at: string
}

export interface ProductRequestStatusHistory {
  id: string
  request_id: string
  from_status: ProductRequestStatus | null
  to_status: ProductRequestStatus
  note: string | null
  changed_by_user_id: string | null
  created_at: string
}

export interface ContributorReward {
  id: string
  request_id: string | null
  user_id: string
  reward_type: ProductRewardType
  title: string
  description: string | null
  reward_value: string | null
  granted_by_user_id: string | null
  granted_at: string
  expires_at: string | null
}

export interface RequestContributor {
  user_id: string | null
  role: ProductRequestRole
  display_name: string
  requests_count: number
  implemented_count: number
  total_votes_received: number
}

export interface ProductRequestDetail extends ProductRequest {
  vote_count: number
  comment_count: number
  follower_count: number
  viewer_has_voted: boolean
  viewer_is_following: boolean
  requester_display_name: string
  comments: Array<ProductRequestComment & { author_display_name: string }>
  status_history: ProductRequestStatusHistory[]
  rewards: ContributorReward[]
}
