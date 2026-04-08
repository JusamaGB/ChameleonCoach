export const COACH_TYPE_PRESETS = [
  "personal_trainer",
  "nutritionist",
  "wellness_coach",
  "sports_performance_coach",
  "yoga_pilates_instructor",
  "gym_studio_owner",
] as const

export type CoachTypePreset = (typeof COACH_TYPE_PRESETS)[number]

export const ENABLEABLE_MODULES = ["pt_core", "nutrition_core"] as const

export type EnableableModule = (typeof ENABLEABLE_MODULES)[number]
export type ModuleKey = "shared_core" | EnableableModule
export type FeatureScope = "coach" | "client"
export type SurfaceFeature =
  | "dashboard"
  | "clients"
  | "appointments"
  | "billing"
  | "settings"
  | "invite"
  | "exercises"
  | "client_overview"
  | "client_meal_plan"
  | "client_progress"
  | "client_appointments"

export const MODULE_LABELS: Record<EnableableModule, string> = {
  pt_core: "PT Core",
  nutrition_core: "Nutrition Core",
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
  billing: { scope: "coach", requiredModule: "shared_core" },
  settings: { scope: "coach", requiredModule: "shared_core" },
  invite: { scope: "coach", requiredModule: "shared_core" },
  exercises: { scope: "coach", requiredModule: "pt_core" },
  client_overview: { scope: "client", requiredModule: "shared_core" },
  client_meal_plan: { scope: "client", requiredModule: "shared_core" },
  client_progress: { scope: "client", requiredModule: "shared_core" },
  client_appointments: { scope: "client", requiredModule: "shared_core" },
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
  const enableableModules: EnableableModule[] = isLegacyWorkspace ? ["pt_core"] : storedModules
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
