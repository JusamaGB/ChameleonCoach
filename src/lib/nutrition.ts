import type {
  ClientNutritionCheckIn,
  ClientNutritionHabitAssignment,
  ClientNutritionHabitLog,
  ClientNutritionLogEntry,
  MealPlanDay,
  NutritionHabitTemplate,
  NutritionMealPlanTemplate,
  NutritionMealPlanTemplateDay,
  NutritionRecipe,
} from "@/types"
import { syncClientNutritionHabitSheets, syncCoachNutritionLibrarySheets } from "@/lib/google/sheets"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

type TemplateDayInput = {
  day: string
  breakfast?: string | null
  lunch?: string | null
  dinner?: string | null
  snacks?: string | null
  notes?: string | null
}

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function cleanNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function normalizeTemplateDays(input: TemplateDayInput[]) {
  const provided = new Map(
    input
      .filter((day) => typeof day.day === "string" && day.day.trim().length > 0)
      .map((day) => [day.day, day])
  )

  return DAYS.map((day) => {
    const row = provided.get(day)
    return {
      day,
      breakfast: cleanText(row?.breakfast),
      lunch: cleanText(row?.lunch),
      dinner: cleanText(row?.dinner),
      snacks: cleanText(row?.snacks),
      notes: cleanText(row?.notes),
    }
  })
}

async function syncCoachNutritionWorkbook(
  supabase: { from: (table: string) => any },
  coachId: string
) {
  try {
    const { data: settings } = await supabase
      .from("admin_settings")
      .select("managed_nutrition_library_sheet_id")
      .eq("user_id", coachId)
      .maybeSingle()

    const sheetId = settings?.managed_nutrition_library_sheet_id
    if (!sheetId) return

    const [recipes, templates, habits] = await Promise.all([
      listNutritionRecipesForCoach(supabase, coachId),
      listNutritionTemplatesForCoach(supabase, coachId),
      listNutritionHabitTemplatesForCoach(supabase, coachId),
    ])

    await syncCoachNutritionLibrarySheets(sheetId, coachId, {
      recipes,
      templates,
      habits,
    })
  } catch (error) {
    console.error("Nutrition coach workbook sync failed", error)
  }
}

async function syncClientNutritionWorkbook(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string
) {
  try {
    const { data: client } = await supabase
      .from("clients")
      .select("sheet_id")
      .eq("id", clientId)
      .eq("coach_id", coachId)
      .maybeSingle()

    if (!client?.sheet_id) return

    const [habits, habitLogs, checkIns, logs] = await Promise.all([
      listClientNutritionHabitAssignmentsForCoach(supabase, coachId, clientId),
      listClientNutritionHabitLogsForCoach(supabase, coachId, clientId),
      listClientNutritionCheckInsForCoach(supabase, coachId, clientId),
      listClientNutritionLogEntriesForCoach(supabase, coachId, clientId),
    ])
    await syncClientNutritionHabitSheets(client.sheet_id, coachId, habits, habitLogs, checkIns, logs)
  } catch (error) {
    console.error("Client nutrition workbook sync failed", error)
  }
}

export async function listNutritionRecipesForCoach(
  supabase: { from: (table: string) => any },
  coachId: string
) {
  const { data, error } = await supabase
    .from("nutrition_recipes")
    .select("*")
    .eq("coach_id", coachId)
    .eq("is_archived", false)
    .order("name", { ascending: true })

  if (error) throw error
  return (data ?? []) as NutritionRecipe[]
}

export async function createNutritionRecipe(
  supabase: { from: (table: string) => any },
  coachId: string,
  payload: Partial<NutritionRecipe>
) {
  const { data, error } = await supabase
    .from("nutrition_recipes")
    .insert({
      coach_id: coachId,
      name: String(payload.name || "").trim(),
      category: cleanText(payload.category) ?? "general",
      ingredients: cleanText(payload.ingredients),
      notes: cleanText(payload.notes),
      calories_kcal: cleanNumber(payload.calories_kcal),
      protein_grams: cleanNumber(payload.protein_grams),
      carbs_grams: cleanNumber(payload.carbs_grams),
      fats_grams: cleanNumber(payload.fats_grams),
      meal_slot: cleanText(payload.meal_slot) ?? "any",
    })
    .select("*")
    .single()

  if (error) throw error
  await syncCoachNutritionWorkbook(supabase, coachId)
  return data as NutritionRecipe
}

export async function updateNutritionRecipe(
  supabase: { from: (table: string) => any },
  coachId: string,
  recipeId: string,
  payload: Partial<NutritionRecipe>
) {
  const { data, error } = await supabase
    .from("nutrition_recipes")
    .update({
      name: String(payload.name || "").trim(),
      category: cleanText(payload.category) ?? "general",
      ingredients: cleanText(payload.ingredients),
      notes: cleanText(payload.notes),
      calories_kcal: cleanNumber(payload.calories_kcal),
      protein_grams: cleanNumber(payload.protein_grams),
      carbs_grams: cleanNumber(payload.carbs_grams),
      fats_grams: cleanNumber(payload.fats_grams),
      meal_slot: cleanText(payload.meal_slot) ?? "any",
      is_archived: Boolean(payload.is_archived),
      updated_at: new Date().toISOString(),
    })
    .eq("id", recipeId)
    .eq("coach_id", coachId)
    .select("*")
    .single()

  if (error) throw error
  await syncCoachNutritionWorkbook(supabase, coachId)
  return data as NutritionRecipe
}

export async function listNutritionTemplatesForCoach(
  supabase: { from: (table: string) => any },
  coachId: string
) {
  const { data: templates, error } = await supabase
    .from("nutrition_meal_plan_templates")
    .select("*")
    .eq("coach_id", coachId)
    .eq("is_archived", false)
    .order("name", { ascending: true })

  if (error) throw error

  const templateIds = (templates ?? []).map((template: NutritionMealPlanTemplate) => template.id)
  const { data: days, error: daysError } = templateIds.length
    ? await supabase
        .from("nutrition_meal_plan_template_days")
        .select("*")
        .in("template_id", templateIds)
        .order("day", { ascending: true })
    : { data: [], error: null }

  if (daysError) throw daysError

  return ((templates ?? []) as NutritionMealPlanTemplate[]).map((template) => ({
    ...template,
    days: ((days ?? []) as NutritionMealPlanTemplateDay[]).filter((day) => day.template_id === template.id),
  }))
}

export async function createNutritionTemplate(
  supabase: { from: (table: string) => any },
  coachId: string,
  payload: Partial<NutritionMealPlanTemplate> & { days?: TemplateDayInput[] }
) {
  const { data: template, error } = await supabase
    .from("nutrition_meal_plan_templates")
    .insert({
      coach_id: coachId,
      name: String(payload.name || "").trim(),
      description: cleanText(payload.description),
      goal: cleanText(payload.goal),
      target_calories_kcal: cleanNumber(payload.target_calories_kcal),
      target_protein_grams: cleanNumber(payload.target_protein_grams),
      target_carbs_grams: cleanNumber(payload.target_carbs_grams),
      target_fats_grams: cleanNumber(payload.target_fats_grams),
    })
    .select("*")
    .single()

  if (error) throw error

  const days = normalizeTemplateDays(payload.days ?? [])
  const { error: daysInsertError } = await supabase
    .from("nutrition_meal_plan_template_days")
    .insert(
      days.map((day) => ({
        template_id: template.id,
        ...day,
      }))
    )

  if (daysInsertError) throw daysInsertError

  await syncCoachNutritionWorkbook(supabase, coachId)
  return template as NutritionMealPlanTemplate
}

export async function updateNutritionTemplate(
  supabase: { from: (table: string) => any },
  coachId: string,
  templateId: string,
  payload: Partial<NutritionMealPlanTemplate> & { days?: TemplateDayInput[] }
) {
  const { data: template, error } = await supabase
    .from("nutrition_meal_plan_templates")
    .update({
      name: String(payload.name || "").trim(),
      description: cleanText(payload.description),
      goal: cleanText(payload.goal),
      target_calories_kcal: cleanNumber(payload.target_calories_kcal),
      target_protein_grams: cleanNumber(payload.target_protein_grams),
      target_carbs_grams: cleanNumber(payload.target_carbs_grams),
      target_fats_grams: cleanNumber(payload.target_fats_grams),
      is_archived: Boolean(payload.is_archived),
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId)
    .eq("coach_id", coachId)
    .select("*")
    .single()

  if (error) throw error

  if (payload.days) {
    const { error: deleteError } = await supabase
      .from("nutrition_meal_plan_template_days")
      .delete()
      .eq("template_id", templateId)
    if (deleteError) throw deleteError

    const days = normalizeTemplateDays(payload.days)
    const { error: insertError } = await supabase
      .from("nutrition_meal_plan_template_days")
      .insert(
        days.map((day) => ({
          template_id: templateId,
          ...day,
        }))
      )
    if (insertError) throw insertError
  }

  await syncCoachNutritionWorkbook(supabase, coachId)
  return template as NutritionMealPlanTemplate
}

export function buildMealPlanFromTemplate(
  template: NutritionMealPlanTemplate & { days?: NutritionMealPlanTemplateDay[] }
): MealPlanDay[] {
  const dayMap = new Map((template.days ?? []).map((day) => [day.day, day]))

  return DAYS.map((day) => {
    const match = dayMap.get(day)
    return {
      day,
      breakfast: match?.breakfast ?? "",
      lunch: match?.lunch ?? "",
      dinner: match?.dinner ?? "",
      snacks: match?.snacks ?? "",
    }
  })
}

export async function listNutritionHabitTemplatesForCoach(
  supabase: { from: (table: string) => any },
  coachId: string
) {
  const { data, error } = await supabase
    .from("nutrition_habit_templates")
    .select("*")
    .eq("coach_id", coachId)
    .eq("is_archived", false)
    .order("name", { ascending: true })

  if (error) throw error
  return (data ?? []) as NutritionHabitTemplate[]
}

export async function createNutritionHabitTemplate(
  supabase: { from: (table: string) => any },
  coachId: string,
  payload: Partial<NutritionHabitTemplate>
) {
  const { data, error } = await supabase
    .from("nutrition_habit_templates")
    .insert({
      coach_id: coachId,
      name: String(payload.name || "").trim(),
      description: cleanText(payload.description),
      category: cleanText(payload.category) ?? "general",
      target_count: cleanNumber(payload.target_count) ?? 1,
      target_period: cleanText(payload.target_period) ?? "day",
      meal_slot: cleanText(payload.meal_slot) ?? "any",
      coaching_notes: cleanText(payload.coaching_notes),
    })
    .select("*")
    .single()

  if (error) throw error
  await syncCoachNutritionWorkbook(supabase, coachId)
  return data as NutritionHabitTemplate
}

export async function updateNutritionHabitTemplate(
  supabase: { from: (table: string) => any },
  coachId: string,
  habitTemplateId: string,
  payload: Partial<NutritionHabitTemplate>
) {
  const { data, error } = await supabase
    .from("nutrition_habit_templates")
    .update({
      name: String(payload.name || "").trim(),
      description: cleanText(payload.description),
      category: cleanText(payload.category) ?? "general",
      target_count: cleanNumber(payload.target_count) ?? 1,
      target_period: cleanText(payload.target_period) ?? "day",
      meal_slot: cleanText(payload.meal_slot) ?? "any",
      coaching_notes: cleanText(payload.coaching_notes),
      is_archived: Boolean(payload.is_archived),
      updated_at: new Date().toISOString(),
    })
    .eq("id", habitTemplateId)
    .eq("coach_id", coachId)
    .select("*")
    .single()

  if (error) throw error
  await syncCoachNutritionWorkbook(supabase, coachId)
  return data as NutritionHabitTemplate
}

export async function listClientNutritionHabitAssignmentsForCoach(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string
) {
  const { data, error } = await supabase
    .from("client_nutrition_habit_assignments")
    .select("*")
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as ClientNutritionHabitAssignment[]
}

export async function assignNutritionHabitToClient(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string,
  habitTemplateId: string,
  assignedStartDate?: string | null
) {
  const { data: habitTemplate, error: habitError } = await supabase
    .from("nutrition_habit_templates")
    .select("*")
    .eq("id", habitTemplateId)
    .eq("coach_id", coachId)
    .single()

  if (habitError || !habitTemplate) {
    throw habitError ?? new Error("Habit template not found")
  }

  const { data, error } = await supabase
    .from("client_nutrition_habit_assignments")
    .insert({
      coach_id: coachId,
      client_id: clientId,
      habit_template_id: habitTemplate.id,
      habit_name_snapshot: habitTemplate.name,
      description_snapshot: habitTemplate.description,
      category_snapshot: habitTemplate.category,
      target_count: habitTemplate.target_count,
      target_period: habitTemplate.target_period,
      meal_slot: habitTemplate.meal_slot,
      coaching_notes: habitTemplate.coaching_notes,
      assigned_start_date: assignedStartDate || null,
      status: "active",
    })
    .select("*")
    .single()

  if (error) throw error
  await syncClientNutritionWorkbook(supabase, coachId, clientId)
  return data as ClientNutritionHabitAssignment
}

export async function updateClientNutritionHabitAssignment(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string,
  assignmentId: string,
  payload: Partial<ClientNutritionHabitAssignment>
) {
  const { data, error } = await supabase
    .from("client_nutrition_habit_assignments")
    .update({
      assigned_start_date: payload.assigned_start_date ?? null,
      status: cleanText(payload.status) ?? "active",
      coaching_notes: cleanText(payload.coaching_notes),
      updated_at: new Date().toISOString(),
    })
    .eq("id", assignmentId)
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .select("*")
    .single()

  if (error) throw error
  await syncClientNutritionWorkbook(supabase, coachId, clientId)
  return data as ClientNutritionHabitAssignment
}

export async function listClientNutritionHabitLogsForCoach(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string
) {
  const { data, error } = await supabase
    .from("client_nutrition_habit_logs")
    .select("*")
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .order("completion_date", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as ClientNutritionHabitLog[]
}

export async function createClientNutritionHabitLog(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string,
  payload: Partial<ClientNutritionHabitLog> & { assignment_id: string }
) {
  const { data: assignment, error: assignmentError } = await supabase
    .from("client_nutrition_habit_assignments")
    .select("id, coach_id, client_id")
    .eq("id", payload.assignment_id)
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .single()

  if (assignmentError || !assignment) {
    throw assignmentError ?? new Error("Nutrition habit assignment not found")
  }

  const completionDate =
    typeof payload.completion_date === "string" && payload.completion_date.length > 0
      ? payload.completion_date
      : new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from("client_nutrition_habit_logs")
    .insert({
      coach_id: coachId,
      client_id: clientId,
      assignment_id: assignment.id,
      logged_at: payload.logged_at ?? new Date().toISOString(),
      completion_date: completionDate,
      completion_status:
        payload.completion_status === "missed"
          ? "missed"
          : payload.completion_status === "partial"
            ? "partial"
            : "completed",
      adherence_score: cleanNumber(payload.adherence_score),
      notes: cleanText(payload.notes),
      coach_note: cleanText(payload.coach_note),
    })
    .select("*")
    .single()

  if (error) throw error
  await syncClientNutritionWorkbook(supabase, coachId, clientId)
  return data as ClientNutritionHabitLog
}

export async function listClientNutritionCheckInsForCoach(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string
) {
  const { data, error } = await supabase
    .from("client_nutrition_check_ins")
    .select("*")
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .order("submitted_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as ClientNutritionCheckIn[]
}

export async function createClientNutritionCheckIn(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string,
  payload: Partial<ClientNutritionCheckIn>
) {
  const { data, error } = await supabase
    .from("client_nutrition_check_ins")
    .insert({
      coach_id: coachId,
      client_id: clientId,
      submitted_at: payload.submitted_at ?? new Date().toISOString(),
      week_label: cleanText(payload.week_label),
      adherence_score: cleanNumber(payload.adherence_score),
      energy_score: cleanNumber(payload.energy_score),
      hunger_score: cleanNumber(payload.hunger_score),
      digestion_score: cleanNumber(payload.digestion_score),
      sleep_score: cleanNumber(payload.sleep_score),
      wins: cleanText(payload.wins),
      struggles: cleanText(payload.struggles),
      coach_follow_up_note: cleanText(payload.coach_follow_up_note),
    })
    .select("*")
    .single()

  if (error) throw error
  await syncClientNutritionWorkbook(supabase, coachId, clientId)
  return data as ClientNutritionCheckIn
}

export async function updateClientNutritionCheckIn(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string,
  checkInId: string,
  payload: Partial<ClientNutritionCheckIn>
) {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if ("submitted_at" in payload) updates.submitted_at = payload.submitted_at ?? new Date().toISOString()
  if ("week_label" in payload) updates.week_label = cleanText(payload.week_label)
  if ("adherence_score" in payload) updates.adherence_score = cleanNumber(payload.adherence_score)
  if ("energy_score" in payload) updates.energy_score = cleanNumber(payload.energy_score)
  if ("hunger_score" in payload) updates.hunger_score = cleanNumber(payload.hunger_score)
  if ("digestion_score" in payload) updates.digestion_score = cleanNumber(payload.digestion_score)
  if ("sleep_score" in payload) updates.sleep_score = cleanNumber(payload.sleep_score)
  if ("wins" in payload) updates.wins = cleanText(payload.wins)
  if ("struggles" in payload) updates.struggles = cleanText(payload.struggles)
  if ("coach_follow_up_note" in payload) updates.coach_follow_up_note = cleanText(payload.coach_follow_up_note)

  const { data, error } = await supabase
    .from("client_nutrition_check_ins")
    .update(updates)
    .eq("id", checkInId)
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .select("*")
    .single()

  if (error) throw error
  await syncClientNutritionWorkbook(supabase, coachId, clientId)
  return data as ClientNutritionCheckIn
}

export async function listClientNutritionLogEntriesForCoach(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string
) {
  const { data, error } = await supabase
    .from("client_nutrition_log_entries")
    .select("*")
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .order("logged_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as ClientNutritionLogEntry[]
}

export async function createClientNutritionLogEntry(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string,
  payload: Partial<ClientNutritionLogEntry>
) {
  const { data, error } = await supabase
    .from("client_nutrition_log_entries")
    .insert({
      coach_id: coachId,
      client_id: clientId,
      logged_at: payload.logged_at ?? new Date().toISOString(),
      meal_slot: cleanText(payload.meal_slot) ?? "any",
      entry_title: String(payload.entry_title || "").trim(),
      notes: cleanText(payload.notes),
      adherence_flag: cleanText(payload.adherence_flag) ?? "flexible",
      hunger_score: cleanNumber(payload.hunger_score),
      coach_note: cleanText(payload.coach_note),
    })
    .select("*")
    .single()

  if (error) throw error
  await syncClientNutritionWorkbook(supabase, coachId, clientId)
  return data as ClientNutritionLogEntry
}

export async function updateClientNutritionLogEntry(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string,
  logEntryId: string,
  payload: Partial<ClientNutritionLogEntry>
) {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if ("logged_at" in payload) updates.logged_at = payload.logged_at ?? new Date().toISOString()
  if ("meal_slot" in payload) updates.meal_slot = cleanText(payload.meal_slot) ?? "any"
  if ("entry_title" in payload) updates.entry_title = String(payload.entry_title || "").trim()
  if ("notes" in payload) updates.notes = cleanText(payload.notes)
  if ("adherence_flag" in payload) updates.adherence_flag = cleanText(payload.adherence_flag) ?? "flexible"
  if ("hunger_score" in payload) updates.hunger_score = cleanNumber(payload.hunger_score)
  if ("coach_note" in payload) updates.coach_note = cleanText(payload.coach_note)

  const { data, error } = await supabase
    .from("client_nutrition_log_entries")
    .update(updates)
    .eq("id", logEntryId)
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .select("*")
    .single()

  if (error) throw error
  await syncClientNutritionWorkbook(supabase, coachId, clientId)
  return data as ClientNutritionLogEntry
}

export async function getClientNutritionContextForUser(
  supabase: { from: (table: string) => any },
  userId: string
) {
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, coach_id, name, sheet_id")
    .eq("user_id", userId)
    .maybeSingle()

  if (clientError || !client || !client.coach_id) {
    throw clientError ?? new Error("Client workspace not found")
  }

  const [habits, habitLogs, checkIns, logs] = await Promise.all([
    listClientNutritionHabitAssignmentsForCoach(supabase, client.coach_id, client.id),
    listClientNutritionHabitLogsForCoach(supabase, client.coach_id, client.id),
    listClientNutritionCheckInsForCoach(supabase, client.coach_id, client.id),
    listClientNutritionLogEntriesForCoach(supabase, client.coach_id, client.id),
  ])

  return {
    client,
    habits,
    habit_logs: habitLogs,
    check_ins: checkIns,
    logs,
  }
}

export async function createClientNutritionCheckInForUser(
  supabase: { from: (table: string) => any },
  userId: string,
  payload: Partial<ClientNutritionCheckIn>
) {
  const { data: client, error } = await supabase
    .from("clients")
    .select("id, coach_id")
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !client?.coach_id) {
    throw error ?? new Error("Client workspace not found")
  }

  return createClientNutritionCheckIn(supabase, client.coach_id, client.id, payload)
}

export async function createClientNutritionLogEntryForUser(
  supabase: { from: (table: string) => any },
  userId: string,
  payload: Partial<ClientNutritionLogEntry>
) {
  const { data: client, error } = await supabase
    .from("clients")
    .select("id, coach_id")
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !client?.coach_id) {
    throw error ?? new Error("Client workspace not found")
  }

  return createClientNutritionLogEntry(supabase, client.coach_id, client.id, payload)
}

export async function createClientNutritionHabitLogForUser(
  supabase: { from: (table: string) => any },
  userId: string,
  payload: Partial<ClientNutritionHabitLog> & { assignment_id: string }
) {
  const { data: client, error } = await supabase
    .from("clients")
    .select("id, coach_id")
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !client?.coach_id) {
    throw error ?? new Error("Client workspace not found")
  }

  return createClientNutritionHabitLog(supabase, client.coach_id, client.id, payload)
}
