import type {
  Client,
  ClientNutritionCheckIn,
  ClientWellnessCheckIn,
  ClientWellnessHabitAssignment,
  MealPlanDay,
  ProfileData,
  ProgressEntry,
} from "@/types"
import {
  readCoachMigrationWorkbookTabs,
  type MigrationWorkbook,
  type MigrationWorkbookTab,
} from "@/lib/google/migration"
import {
  replaceProgressEntries,
  syncClientNutritionHabitSheets,
  syncClientWellnessSheets,
  updateMealPlan,
  updateProfile,
} from "@/lib/google/sheets"
import {
  listClientNutritionCheckInsForCoach,
  listClientNutritionHabitAssignmentsForCoach,
  listClientNutritionHabitLogsForCoach,
  listClientNutritionLogEntriesForCoach,
} from "@/lib/nutrition"
import { findClientByIdForCoach } from "@/lib/clients"
import {
  listClientWellnessCheckInsForCoach,
  listClientWellnessGoalAssignmentsForCoach,
  listClientWellnessHabitAssignmentsForCoach,
  listClientWellnessHabitLogsForCoach,
  listClientWellnessSessionNotesForCoach,
} from "@/lib/wellness"

type SupabaseLike = {
  from: (table: string) => any
}

export type MigrationExecutionStep = {
  id: string
  label: string
}

export type MigrationExecutionResult = {
  steps: MigrationExecutionStep[]
  summary: string[]
  warnings: string[]
}

type MigrationExecutionCallbacks = {
  onStep?: (step: MigrationExecutionStep) => void | Promise<void>
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
}

function buildRowObject(headers: string[], row: string[]) {
  return headers.reduce<Record<string, string>>((acc, header, index) => {
    const key = normalizeHeader(header)
    if (key) {
      acc[key] = row[index] ?? ""
    }
    return acc
  }, {})
}

function firstValue(record: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const value = record[normalizeHeader(alias)]
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }
  return ""
}

function parseNumberFromText(value: string) {
  const match = value.match(/-?\d+(\.\d+)?/)
  if (!match) return null
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

function parseScore(value: string) {
  const parsed = parseNumberFromText(value)
  if (parsed === null) return null
  if (parsed < 1 || parsed > 10) return null
  return parsed
}

function normalizeIsoDate(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return new Date().toISOString()
  }

  const normalized = trimmed.length === 10 ? `${trimmed}T12:00:00.000Z` : trimmed
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString()
  }
  return parsed.toISOString()
}

function parseStatus(value: string) {
  const normalized = value.trim().toLowerCase()
  if (normalized.includes("complete")) return "completed"
  if (normalized.includes("cancel")) return "cancelled"
  return "active"
}

function parseTargetPeriod(value: string) {
  const normalized = value.trim().toLowerCase()
  if (normalized.includes("week")) return "week"
  return "day"
}

function parseTargetCount(...values: string[]) {
  for (const value of values) {
    const parsed = parseNumberFromText(value)
    if (parsed !== null) {
      return Math.max(1, Math.round(parsed))
    }
  }
  return 1
}

function mergeProfileData(tabs: MigrationWorkbookTab[], fallbackEmail: string): Partial<ProfileData> {
  const profile: Partial<ProfileData> = {}

  for (const tab of tabs) {
    if (tab.classification !== "profile") continue

    const objectRows = tab.headers.length > 0
      ? tab.rows.map((row) => buildRowObject(tab.headers, row))
      : []

    if (objectRows.length > 0) {
      const firstRow = objectRows[0]
      profile.name = profile.name || firstValue(firstRow, ["name", "client_name"])
      profile.email = profile.email || firstValue(firstRow, ["email", "email_address"]) || fallbackEmail
      profile.age = profile.age || firstValue(firstRow, ["age"])
      profile.gender = profile.gender || firstValue(firstRow, ["gender", "sex"])
      profile.height = profile.height || firstValue(firstRow, ["height"])
      profile.current_weight = profile.current_weight || firstValue(firstRow, ["current_weight", "weight"])
      profile.goal_weight = profile.goal_weight || firstValue(firstRow, ["goal_weight", "target_weight"])
      profile.fitness_goals =
        profile.fitness_goals
        || firstValue(firstRow, ["fitness_goals", "goal", "goals", "focus"])
      profile.dietary_restrictions =
        profile.dietary_restrictions || firstValue(firstRow, ["dietary_restrictions", "dietary_notes"])
      profile.health_conditions =
        profile.health_conditions || firstValue(firstRow, ["health_conditions", "injury_notes", "injuries"])
      profile.activity_level = profile.activity_level || firstValue(firstRow, ["activity_level"])
      profile.notes = profile.notes || firstValue(firstRow, ["notes"])
      continue
    }

    for (const row of tab.rows) {
      const [rawKey, rawValue] = row
      const key = normalizeHeader(rawKey ?? "")
      const value = (rawValue ?? "").trim()
      if (!key || !value) continue

      if (key === "name") profile.name = profile.name || value
      if (key === "email") profile.email = profile.email || value
      if (key === "age") profile.age = profile.age || value
      if (key === "gender") profile.gender = profile.gender || value
      if (key === "height") profile.height = profile.height || value
      if (key === "current_weight") profile.current_weight = profile.current_weight || value
      if (key === "goal_weight") profile.goal_weight = profile.goal_weight || value
      if (key === "fitness_goals" || key === "goal" || key === "focus") profile.fitness_goals = profile.fitness_goals || value
      if (key === "dietary_restrictions") profile.dietary_restrictions = profile.dietary_restrictions || value
      if (key === "health_conditions" || key === "injury_notes") profile.health_conditions = profile.health_conditions || value
      if (key === "activity_level") profile.activity_level = profile.activity_level || value
      if (key === "notes") profile.notes = profile.notes || value
    }
  }

  if (!profile.email) {
    profile.email = fallbackEmail
  }

  return profile
}

function extractMealPlan(tabs: MigrationWorkbookTab[]): MealPlanDay[] {
  for (const tab of tabs) {
    if (tab.classification !== "meal_plan") continue
    const records = tab.rows.map((row) => buildRowObject(tab.headers, row))
    const mealPlan = records
      .map((record) => ({
        day: firstValue(record, ["day"]),
        breakfast: firstValue(record, ["breakfast"]),
        lunch: firstValue(record, ["lunch"]),
        dinner: firstValue(record, ["dinner"]),
        snacks: firstValue(record, ["snacks", "snack"]),
      }))
      .filter((row) => row.day)

    if (mealPlan.length > 0) {
      return mealPlan
    }
  }

  return []
}

function extractProgressEntries(tabs: MigrationWorkbookTab[]): ProgressEntry[] {
  const entries: ProgressEntry[] = []

  for (const tab of tabs) {
    if (tab.classification !== "progress") continue

    for (const row of tab.rows) {
      const record = buildRowObject(tab.headers, row)
      const date = firstValue(record, ["date", "week", "logged_at"])
      const weight = firstValue(record, ["weight", "body_weight"])
      const notes = firstValue(record, ["notes", "comment", "comments"])
      const measurementParts = Object.entries(record)
        .filter(([key, value]) => value && !["date", "week", "logged_at", "weight", "body_weight", "notes", "comment", "comments"].includes(key))
        .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`)

      if (!date && !weight && measurementParts.length === 0 && !notes) {
        continue
      }

      entries.push({
        date: date || new Date().toISOString().slice(0, 10),
        weight,
        measurements: measurementParts.join(" | "),
        notes,
      })
    }
  }

  return entries
}

function extractWellnessHabitAssignments(
  tabs: MigrationWorkbookTab[],
  coachId: string,
  clientId: string
) {
  const assignments: Array<Record<string, unknown>> = []

  for (const tab of tabs) {
    const headerSet = new Set(tab.headers.map(normalizeHeader))
    const looksLikeHabits =
      tab.classification === "wellness"
      && headerSet.has("habit")
      && (headerSet.has("target") || headerSet.has("frequency"))

    if (!looksLikeHabits) continue

    for (const row of tab.rows) {
      const record = buildRowObject(tab.headers, row)
      const habitName = firstValue(record, ["habit", "habit_name", "name"])
      if (!habitName) continue

      const target = firstValue(record, ["target"])
      const frequency = firstValue(record, ["frequency", "cadence"])
      assignments.push({
        coach_id: coachId,
        client_id: clientId,
        habit_template_id: null,
        habit_name_snapshot: habitName,
        description_snapshot: null,
        category_snapshot: "wellness",
        target_count: parseTargetCount(target, frequency),
        target_period: parseTargetPeriod(frequency || target),
        coaching_notes: firstValue(record, ["notes", "coach_notes"]),
        assigned_start_date: null,
        status: parseStatus(firstValue(record, ["status"])),
      })
    }
  }

  return assignments
}

function extractWellnessCheckIns(
  tabs: MigrationWorkbookTab[],
  coachId: string,
  clientId: string
) {
  const checkIns: Array<Record<string, unknown>> = []

  for (const tab of tabs) {
    const headerSet = new Set(tab.headers.map(normalizeHeader))
    const looksLikeCheckIns =
      tab.classification === "wellness"
      && (headerSet.has("mood") || headerSet.has("stress") || headerSet.has("sleep"))

    if (!looksLikeCheckIns) continue

    for (const row of tab.rows) {
      const record = buildRowObject(tab.headers, row)
      const submittedAt = normalizeIsoDate(firstValue(record, ["date", "submitted_at", "week"]))
      checkIns.push({
        coach_id: coachId,
        client_id: clientId,
        submitted_at: submittedAt,
        week_label: firstValue(record, ["week", "week_label"]) || null,
        energy_score: parseScore(firstValue(record, ["energy", "mood"])),
        stress_score: parseScore(firstValue(record, ["stress"])),
        sleep_score: parseScore(firstValue(record, ["sleep"])),
        confidence_score: parseScore(firstValue(record, ["confidence"])),
        wins: firstValue(record, ["wins"]) || null,
        blockers: firstValue(record, ["blockers", "struggles"]) || null,
        focus_for_next_week: firstValue(record, ["focus_for_next_week", "focus"]) || null,
        coach_follow_up_note: firstValue(record, ["coach_notes", "coach_note", "notes"]) || null,
      })
    }
  }

  return checkIns
}

function extractNutritionCheckIns(
  tabs: MigrationWorkbookTab[],
  coachId: string,
  clientId: string
) {
  const checkIns: Array<Record<string, unknown>> = []

  for (const tab of tabs) {
    const headerSet = new Set(tab.headers.map(normalizeHeader))
    const looksLikeCheckIns =
      (tab.classification === "nutrition" || tab.classification === "meal_plan")
      && (headerSet.has("hunger") || headerSet.has("adherence") || headerSet.has("energy"))

    if (!looksLikeCheckIns) continue

    for (const row of tab.rows) {
      const record = buildRowObject(tab.headers, row)
      const submittedAt = normalizeIsoDate(firstValue(record, ["date", "week", "week_label", "submitted_at"]))
      checkIns.push({
        coach_id: coachId,
        client_id: clientId,
        submitted_at: submittedAt,
        week_label: firstValue(record, ["week", "week_label"]) || null,
        adherence_score: parseScore(firstValue(record, ["adherence", "compliance"])),
        energy_score: parseScore(firstValue(record, ["energy"])),
        hunger_score: parseScore(firstValue(record, ["hunger"])),
        digestion_score: parseScore(firstValue(record, ["digestion"])),
        sleep_score: parseScore(firstValue(record, ["sleep"])),
        wins: firstValue(record, ["wins"]) || null,
        struggles: firstValue(record, ["struggles", "blockers"]) || null,
        coach_follow_up_note: firstValue(record, ["coach_notes", "coach_note", "notes"]) || null,
      })
    }
  }

  return checkIns
}

async function upsertWellnessAssignments(
  supabase: SupabaseLike,
  coachId: string,
  clientId: string,
  assignments: Array<Record<string, unknown>>
) {
  const existing = await listClientWellnessHabitAssignmentsForCoach(supabase, coachId, clientId)
  const byName = new Map(existing.map((item) => [item.habit_name_snapshot.toLowerCase(), item]))

  for (const assignment of assignments) {
    const habitName = String(assignment.habit_name_snapshot).toLowerCase()
    const current = byName.get(habitName)
    if (current) {
      await supabase
        .from("client_wellness_habit_assignments")
        .update({
          ...assignment,
          updated_at: new Date().toISOString(),
        })
        .eq("id", current.id)
        .eq("coach_id", coachId)
        .eq("client_id", clientId)
    } else {
      const { data } = await supabase
        .from("client_wellness_habit_assignments")
        .insert(assignment)
        .select("id, habit_name_snapshot")
        .single()
      if (data?.habit_name_snapshot) {
        byName.set(String(data.habit_name_snapshot).toLowerCase(), { ...data } as ClientWellnessHabitAssignment)
      }
    }
  }
}

async function upsertWellnessCheckIns(
  supabase: SupabaseLike,
  coachId: string,
  clientId: string,
  checkIns: Array<Record<string, unknown>>
) {
  const existing = await listClientWellnessCheckInsForCoach(supabase, coachId, clientId)
  const bySubmittedAt = new Map(existing.map((item) => [item.submitted_at, item]))

  for (const checkIn of checkIns) {
    const submittedAt = String(checkIn.submitted_at)
    const current = bySubmittedAt.get(submittedAt)
    if (current) {
      await supabase
        .from("client_wellness_check_ins")
        .update({
          ...checkIn,
          updated_at: new Date().toISOString(),
        })
        .eq("id", current.id)
        .eq("coach_id", coachId)
        .eq("client_id", clientId)
    } else {
      const { data } = await supabase
        .from("client_wellness_check_ins")
        .insert(checkIn)
        .select("id, submitted_at")
        .single()
      if (data?.submitted_at) {
        bySubmittedAt.set(String(data.submitted_at), { ...data } as ClientWellnessCheckIn)
      }
    }
  }
}

async function upsertNutritionCheckIns(
  supabase: SupabaseLike,
  coachId: string,
  clientId: string,
  checkIns: Array<Record<string, unknown>>
) {
  const existing = await listClientNutritionCheckInsForCoach(supabase, coachId, clientId)
  const bySubmittedAt = new Map(existing.map((item) => [item.submitted_at, item]))

  for (const checkIn of checkIns) {
    const submittedAt = String(checkIn.submitted_at)
    const current = bySubmittedAt.get(submittedAt)
    if (current) {
      await supabase
        .from("client_nutrition_check_ins")
        .update({
          ...checkIn,
          updated_at: new Date().toISOString(),
        })
        .eq("id", current.id)
        .eq("coach_id", coachId)
        .eq("client_id", clientId)
    } else {
      await supabase
        .from("client_nutrition_check_ins")
        .insert(checkIn)
    }
  }
}

export async function executeCoachWorkbookMigration({
  supabase,
  coachId,
  clientId,
  workbook,
  onStep,
}: {
  supabase: SupabaseLike
  coachId: string
  clientId: string
  workbook: MigrationWorkbook
  onStep?: MigrationExecutionCallbacks["onStep"]
}): Promise<MigrationExecutionResult> {
  const { data: client, error: clientError } = await findClientByIdForCoach(
    supabase,
    coachId,
    clientId,
    "id, name, email, coach_id, sheet_id"
  )

  if (clientError || !client) {
    throw new Error(clientError?.message || "Target client could not be found.")
  }

  if (!client?.sheet_id) {
    throw new Error("Target client does not have a Chameleon workbook yet.")
  }

  const targetClient = client as Client
  const tabs = await readCoachMigrationWorkbookTabs(coachId, workbook)
  const steps: MigrationExecutionStep[] = []
  const summary: string[] = []
  const warnings: string[] = []
  const emitStep = async (step: MigrationExecutionStep) => {
    steps.push(step)
    await onStep?.(step)
  }

  await emitStep({
    id: "read-source",
    label: `Read ${tabs.length} source tab${tabs.length === 1 ? "" : "s"} from ${workbook.name}`,
  })

  await emitStep({
    id: "resolve-client",
    label: `Resolved ${targetClient.name}'s Chameleon workbook`,
  })

  const profile = mergeProfileData(tabs, targetClient.email ?? "")
  if (Object.keys(profile).length > 0) {
    await updateProfile(targetClient.sheet_id!, profile, coachId)
    await emitStep({
      id: "profile",
      label: "Updated the target Profile tab with migrated client details",
    })
    summary.push("Profile details were migrated into the client workbook.")
  }

  const mealPlan = extractMealPlan(tabs)
  if (mealPlan.length > 0) {
    await updateMealPlan(targetClient.sheet_id!, mealPlan, coachId)
    await emitStep({
      id: "meal-plan",
      label: `Wrote ${mealPlan.length} meal-plan row${mealPlan.length === 1 ? "" : "s"} into Meal Plan`,
    })
    summary.push(`Meal Plan now contains ${mealPlan.length} migrated day rows.`)
  }

  const progressEntries = extractProgressEntries(tabs)
  if (progressEntries.length > 0) {
    await replaceProgressEntries(targetClient.sheet_id!, progressEntries, coachId)
    await emitStep({
      id: "progress",
      label: `Replaced the Progress tab with ${progressEntries.length} migrated entr${progressEntries.length === 1 ? "y" : "ies"}`,
    })
    summary.push(`Progress tab updated with ${progressEntries.length} migrated entries.`)
  }

  const wellnessAssignments = extractWellnessHabitAssignments(tabs, coachId, clientId)
  const wellnessCheckIns = extractWellnessCheckIns(tabs, coachId, clientId)
  if (wellnessAssignments.length > 0 || wellnessCheckIns.length > 0) {
    if (wellnessAssignments.length > 0) {
      await upsertWellnessAssignments(supabase, coachId, clientId, wellnessAssignments)
      await emitStep({
        id: "wellness-habits",
        label: `Migrated ${wellnessAssignments.length} wellness habit assignment${wellnessAssignments.length === 1 ? "" : "s"}`,
      })
    }

    if (wellnessCheckIns.length > 0) {
      await upsertWellnessCheckIns(supabase, coachId, clientId, wellnessCheckIns)
      await emitStep({
        id: "wellness-checkins",
        label: `Migrated ${wellnessCheckIns.length} wellness check-in${wellnessCheckIns.length === 1 ? "" : "s"}`,
      })
    }

    const [goals, habits, habitLogs, checkIns, sessionNotes] = await Promise.all([
      listClientWellnessGoalAssignmentsForCoach(supabase, coachId, clientId),
      listClientWellnessHabitAssignmentsForCoach(supabase, coachId, clientId),
      listClientWellnessHabitLogsForCoach(supabase, coachId, clientId),
      listClientWellnessCheckInsForCoach(supabase, coachId, clientId),
      listClientWellnessSessionNotesForCoach(supabase, coachId, clientId),
    ])

    await syncClientWellnessSheets(
      targetClient.sheet_id!,
      coachId,
      goals,
      habits,
      habitLogs,
      checkIns,
      sessionNotes
    )

    await emitStep({
      id: "wellness-sync",
      label: "Synced the migrated wellness data into the client workbook tabs",
    })
    summary.push(
      `Wellness data synced with ${wellnessAssignments.length} habit assignment${wellnessAssignments.length === 1 ? "" : "s"} and ${wellnessCheckIns.length} check-in${wellnessCheckIns.length === 1 ? "" : "s"}.`
    )
  }

  const nutritionCheckIns = extractNutritionCheckIns(tabs, coachId, clientId)
  if (nutritionCheckIns.length > 0) {
    await upsertNutritionCheckIns(supabase, coachId, clientId, nutritionCheckIns)

    const [habits, habitLogs, checkIns, logs] = await Promise.all([
      listClientNutritionHabitAssignmentsForCoach(supabase, coachId, clientId),
      listClientNutritionHabitLogsForCoach(supabase, coachId, clientId),
      listClientNutritionCheckInsForCoach(supabase, coachId, clientId),
      listClientNutritionLogEntriesForCoach(supabase, coachId, clientId),
    ])

    await syncClientNutritionHabitSheets(
      targetClient.sheet_id!,
      coachId,
      habits,
      habitLogs,
      checkIns,
      logs
    )

    await emitStep({
      id: "nutrition-checkins",
      label: `Migrated ${nutritionCheckIns.length} nutrition check-in${nutritionCheckIns.length === 1 ? "" : "s"} and synced Nutrition tabs`,
    })
    summary.push(`Nutrition check-ins synced with ${nutritionCheckIns.length} migrated rows.`)
  }

  const handledTabs = new Set<string>()
  if (Object.keys(profile).length > 0) {
    tabs.filter((tab) => tab.classification === "profile").forEach((tab) => handledTabs.add(tab.tabName))
  }
  if (mealPlan.length > 0) {
    tabs.filter((tab) => tab.classification === "meal_plan").forEach((tab) => handledTabs.add(tab.tabName))
  }
  if (progressEntries.length > 0) {
    tabs.filter((tab) => tab.classification === "progress").forEach((tab) => handledTabs.add(tab.tabName))
  }
  if (wellnessAssignments.length > 0 || wellnessCheckIns.length > 0) {
    tabs.filter((tab) => tab.classification === "wellness").forEach((tab) => handledTabs.add(tab.tabName))
  }
  if (nutritionCheckIns.length > 0) {
    tabs.filter((tab) => tab.classification === "nutrition").forEach((tab) => handledTabs.add(tab.tabName))
  }

  for (const tab of tabs) {
    const isEffectivelyEmpty =
      tab.rows.length === 0
      || tab.rows.every((row) => row.every((cell) => !String(cell ?? "").trim()))

    if (isEffectivelyEmpty) {
      handledTabs.add(tab.tabName)
      continue
    }

    if (!handledTabs.has(tab.tabName)) {
      warnings.push(`${tab.tabName} was inspected but not migrated yet.`)
    }
  }

  if (summary.length === 0) {
    summary.push("No supported rows were migrated from this workbook yet.")
  }

  return { steps, summary, warnings }
}
