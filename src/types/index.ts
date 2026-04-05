export interface Client {
  id: string
  user_id: string | null
  name: string
  email: string
  sheet_id: string | null
  invite_token: string | null
  invite_expires_at: string | null
  invite_accepted_at: string | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface AdminSettings {
  id: string
  user_id: string
  google_refresh_token: string | null
  google_access_token: string | null
  google_token_expiry: string | null
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
