export interface Client {
  id: string
  user_id: string | null
  coach_id: string | null
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
  description: string | null
  coaching_notes: string | null
  media_url: string | null
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
