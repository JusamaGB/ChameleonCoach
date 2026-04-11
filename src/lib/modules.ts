export const COACH_TYPE_PRESETS = [
  "personal_trainer",
  "nutritionist",
  "wellness_coach",
  "sports_performance_coach",
  "yoga_pilates_instructor",
  "gym_studio_owner",
] as const

export type CoachTypePreset = (typeof COACH_TYPE_PRESETS)[number]

export const COACH_TYPE_LABELS: Record<CoachTypePreset, string> = {
  personal_trainer: "Personal trainer",
  nutritionist: "Nutritionist",
  wellness_coach: "Wellness coach",
  sports_performance_coach: "Sports performance coach",
  yoga_pilates_instructor: "Yoga / Pilates instructor",
  gym_studio_owner: "Gym / studio owner",
}

export const COACH_TYPE_DESCRIPTIONS: Record<CoachTypePreset, string> = {
  personal_trainer: "Training plans, workout delivery, progress review, and client accountability.",
  nutritionist: "Meal planning, nutrition accountability, habit coaching, and check-in review.",
  wellness_coach: "Goals, habits, check-ins, and session-led coaching with structured follow-up.",
  sports_performance_coach: "Performance planning, athlete monitoring, assessments, and team workflows.",
  yoga_pilates_instructor: "Class-led client delivery, recurring booking flows, memberships, and attendance.",
  gym_studio_owner: "Multi-service scheduling, staff operations, memberships, and studio reporting.",
}

export const COACH_TYPE_STATUS: Record<CoachTypePreset, "live" | "coming_soon"> = {
  personal_trainer: "live",
  nutritionist: "live",
  wellness_coach: "live",
  sports_performance_coach: "coming_soon",
  yoga_pilates_instructor: "coming_soon",
  gym_studio_owner: "coming_soon",
}

export const COACH_TYPE_HIGHLIGHTS: Record<CoachTypePreset, string[]> = {
  personal_trainer: ["PT Core", "Workout builder", "Programs and client training"],
  nutritionist: ["Nutrition Core", "Templates and habits", "Client nutrition accountability"],
  wellness_coach: ["Goals and milestones", "Check-ins and habits", "Session notes and follow-up"],
  sports_performance_coach: ["Assessments", "Recovery tracking", "Team and athlete workflows"],
  yoga_pilates_instructor: ["Class scheduling", "Self-booking", "Memberships and attendance"],
  gym_studio_owner: ["Membership operations", "Staff scheduling", "Studio reporting and retention"],
}

export const ENABLEABLE_MODULES = ["pt_core", "nutrition_core", "wellness_core"] as const

export type EnableableModule = (typeof ENABLEABLE_MODULES)[number]
export type ModuleKey = "shared_core" | EnableableModule
export type FeatureScope = "coach" | "client"
export type SurfaceFeature =
  | "dashboard"
  | "clients"
  | "appointments"
  | "modules"
  | "settings"
  | "invite"
  | "billing"
  | "exercises"
  | "workouts"
  | "programs"
  | "wellness_goals"
  | "wellness_habits"
  | "client_overview"
  | "client_meal_plan"
  | "client_wellness"
  | "client_progress"
  | "client_appointments"
  | "client_training"
  | "client_training_history"
  | "client_portal_meal_plan"
  | "client_portal_training"
  | "client_portal_wellness"

export const MODULE_LABELS: Record<EnableableModule, string> = {
  pt_core: "PT Core",
  nutrition_core: "Nutrition Core",
  wellness_core: "Wellness Core",
}

const FEATURE_DEFINITIONS: Record<
  SurfaceFeature,
  {
    scope: FeatureScope
    requiredModule?: ModuleKey
  }
> = {
  dashboard: { scope: "coach", requiredModule: "shared_core" },
  clients: { scope: "coach", requiredModule: "shared_core" },
  appointments: { scope: "coach", requiredModule: "shared_core" },
  modules: { scope: "coach", requiredModule: "shared_core" },
  settings: { scope: "coach", requiredModule: "shared_core" },
  billing: { scope: "coach", requiredModule: "shared_core" },
  invite: { scope: "coach", requiredModule: "shared_core" },
  exercises: { scope: "coach", requiredModule: "pt_core" },
  workouts: { scope: "coach", requiredModule: "pt_core" },
  programs: { scope: "coach", requiredModule: "pt_core" },
  wellness_goals: { scope: "coach", requiredModule: "wellness_core" },
  wellness_habits: { scope: "coach", requiredModule: "wellness_core" },
  client_overview: { scope: "client", requiredModule: "shared_core" },
  client_meal_plan: { scope: "client", requiredModule: "nutrition_core" },
  client_wellness: { scope: "client", requiredModule: "wellness_core" },
  client_progress: { scope: "client", requiredModule: "shared_core" },
  client_appointments: { scope: "client", requiredModule: "shared_core" },
  client_training: { scope: "client", requiredModule: "pt_core" },
  client_training_history: { scope: "client", requiredModule: "pt_core" },
  client_portal_meal_plan: { scope: "client", requiredModule: "nutrition_core" },
  client_portal_training: { scope: "client", requiredModule: "pt_core" },
  client_portal_wellness: { scope: "client", requiredModule: "wellness_core" },
}

export function isCoachTypePreset(value: unknown): value is CoachTypePreset {
  return typeof value === "string" && COACH_TYPE_PRESETS.includes(value as CoachTypePreset)
}

export function normalizeCoachTypePreset(value: unknown): CoachTypePreset | null {
  return isCoachTypePreset(value) ? value : null
}

export function normalizeActiveModules(value: unknown): EnableableModule[] {
  if (!Array.isArray(value)) return []

  return value.filter(
    (entry, index, array): entry is EnableableModule =>
      typeof entry === "string"
      && ENABLEABLE_MODULES.includes(entry as EnableableModule)
      && array.indexOf(entry) === index
  )
}

export function seedModulesForPreset(preset: CoachTypePreset): EnableableModule[] {
  switch (preset) {
    case "personal_trainer":
      return ["pt_core"]
    case "nutritionist":
      return ["nutrition_core"]
    case "wellness_coach":
      return ["wellness_core"]
    default:
      return []
  }
}

export function resolveActiveModules(input: {
  active_modules?: unknown
  coach_type_preset?: unknown
}) {
  const preset = normalizeCoachTypePreset(input.coach_type_preset)
  const storedModules = normalizeActiveModules(input.active_modules)
  const isLegacyWorkspace = input.active_modules == null
  const enableableModules: EnableableModule[] =
    isLegacyWorkspace
      ? (preset ? seedModulesForPreset(preset) : ["pt_core"])
      : storedModules
  const activeModules: ModuleKey[] = ["shared_core", ...enableableModules]

  return {
    coach_type_preset: preset,
    stored_modules: storedModules,
    active_modules: activeModules,
    enableable_modules: enableableModules,
    is_legacy_workspace: isLegacyWorkspace,
    has_module: (module: ModuleKey) => activeModules.includes(module),
  }
}

export function getFeatureScope(feature: SurfaceFeature): FeatureScope {
  return FEATURE_DEFINITIONS[feature].scope
}

export function canAccessFeature(
  feature: SurfaceFeature,
  activeModules: readonly string[]
) {
  const requiredModule = FEATURE_DEFINITIONS[feature].requiredModule

  if (!requiredModule) {
    return true
  }

  return activeModules.includes(requiredModule)
}
