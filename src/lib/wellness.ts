import type {
  ClientWellnessCheckIn,
  ClientWellnessGoalAssignment,
  ClientWellnessHabitAssignment,
  ClientWellnessHabitLog,
  ClientWellnessSessionNote,
  WellnessGoalTemplate,
  WellnessHabitTemplate,
} from "@/types"
import { resolveActiveModules } from "@/lib/modules"
import { syncClientWellnessSheets, syncCoachWellnessLibrarySheets } from "@/lib/google/sheets"

export class WellnessAccessError extends Error {
  status: number

  constructor(message: string, status = 403) {
    super(message)
    this.name = "WellnessAccessError"
    this.status = status
  }
}

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function cleanNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function cleanScore(value: unknown, label: string) {
  const number = cleanNumber(value)
  if (number === null) return null
  if (number < 1 || number > 10) {
    throw new Error(`${label} must be between 1 and 10.`)
  }
  return number
}

function cleanRequiredText(value: unknown, label: string) {
  const text = typeof value === "string" ? value.trim() : ""
  if (!text) throw new Error(`${label} is required.`)
  return text
}

function normalizeDateTime(value: unknown, fallback = new Date().toISOString()) {
  if (typeof value !== "string" || value.trim().length === 0) return fallback
  const trimmed = value.trim()
  const normalized = trimmed.length === 10 ? `${trimmed}T12:00:00.000Z` : trimmed
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date provided.")
  }
  return date.toISOString()
}

function defaultWeekLabel(submittedAt: string) {
  return `Week of ${new Date(submittedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`
}

async function assertCoachWellnessEnabled(
  supabase: { from: (table: string) => any },
  coachId: string
) {
  const { data: settings, error } = await supabase
    .from("admin_settings")
    .select("coach_type_preset, active_modules")
    .eq("user_id", coachId)
    .maybeSingle()

  if (error) throw error

  const modules = resolveActiveModules(settings ?? {})
  if (!modules.has_module("wellness_core")) {
    throw new WellnessAccessError("Wellness Core is not active for this workspace.")
  }

  return modules
}

async function getClientWellnessAccessForUser(
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

  await assertCoachWellnessEnabled(supabase, client.coach_id)

  return client
}

async function syncCoachWellnessWorkbook(
  supabase: { from: (table: string) => any },
  coachId: string
) {
  try {
    const { data: settings } = await supabase
      .from("admin_settings")
      .select("managed_wellness_library_sheet_id")
      .eq("user_id", coachId)
      .maybeSingle()

    const sheetId = settings?.managed_wellness_library_sheet_id
    if (!sheetId) return

    const [goals, habits] = await Promise.all([
      listWellnessGoalTemplatesForCoach(supabase, coachId),
      listWellnessHabitTemplatesForCoach(supabase, coachId),
    ])

    await syncCoachWellnessLibrarySheets(sheetId, coachId, { goals, habits })
  } catch (error) {
    console.error("Wellness coach workbook sync failed", error)
  }
}

async function syncClientWellnessWorkbook(
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

    const [goals, habits, habitLogs, checkIns, sessionNotes] = await Promise.all([
      listClientWellnessGoalAssignmentsForCoach(supabase, coachId, clientId),
      listClientWellnessHabitAssignmentsForCoach(supabase, coachId, clientId),
      listClientWellnessHabitLogsForCoach(supabase, coachId, clientId),
      listClientWellnessCheckInsForCoach(supabase, coachId, clientId),
      listClientWellnessSessionNotesForCoach(supabase, coachId, clientId),
    ])

    await syncClientWellnessSheets(
      client.sheet_id,
      coachId,
      goals,
      habits,
      habitLogs,
      checkIns,
      sessionNotes
    )
  } catch (error) {
    console.error("Client wellness workbook sync failed", error)
  }
}

export async function listWellnessGoalTemplatesForCoach(
  supabase: { from: (table: string) => any },
  coachId: string
) {
  const { data, error } = await supabase
    .from("wellness_goal_templates")
    .select("*")
    .eq("coach_id", coachId)
    .eq("is_archived", false)
    .order("name", { ascending: true })

  if (error) throw error
  return (data ?? []) as WellnessGoalTemplate[]
}

export async function createWellnessGoalTemplate(
  supabase: { from: (table: string) => any },
  coachId: string,
  payload: Partial<WellnessGoalTemplate>
) {
  const { data, error } = await supabase
    .from("wellness_goal_templates")
    .insert({
      coach_id: coachId,
      name: cleanRequiredText(payload.name, "Goal name"),
      category: cleanText(payload.category) ?? "general",
      description: cleanText(payload.description),
      target_metric: cleanText(payload.target_metric),
      target_value: cleanText(payload.target_value),
      milestone_label: cleanText(payload.milestone_label),
      coaching_notes: cleanText(payload.coaching_notes),
    })
    .select("*")
    .single()

  if (error) throw error
  await syncCoachWellnessWorkbook(supabase, coachId)
  return data as WellnessGoalTemplate
}

export async function updateWellnessGoalTemplate(
  supabase: { from: (table: string) => any },
  coachId: string,
  goalTemplateId: string,
  payload: Partial<WellnessGoalTemplate>
) {
  const { data, error } = await supabase
    .from("wellness_goal_templates")
    .update({
      name: cleanRequiredText(payload.name, "Goal name"),
      category: cleanText(payload.category) ?? "general",
      description: cleanText(payload.description),
      target_metric: cleanText(payload.target_metric),
      target_value: cleanText(payload.target_value),
      milestone_label: cleanText(payload.milestone_label),
      coaching_notes: cleanText(payload.coaching_notes),
      is_archived: Boolean(payload.is_archived),
      updated_at: new Date().toISOString(),
    })
    .eq("id", goalTemplateId)
    .eq("coach_id", coachId)
    .select("*")
    .single()

  if (error) throw error
  await syncCoachWellnessWorkbook(supabase, coachId)
  return data as WellnessGoalTemplate
}

export async function listWellnessHabitTemplatesForCoach(
  supabase: { from: (table: string) => any },
  coachId: string
) {
  const { data, error } = await supabase
    .from("wellness_habit_templates")
    .select("*")
    .eq("coach_id", coachId)
    .eq("is_archived", false)
    .order("name", { ascending: true })

  if (error) throw error
  return (data ?? []) as WellnessHabitTemplate[]
}

export async function createWellnessHabitTemplate(
  supabase: { from: (table: string) => any },
  coachId: string,
  payload: Partial<WellnessHabitTemplate>
) {
  const { data, error } = await supabase
    .from("wellness_habit_templates")
    .insert({
      coach_id: coachId,
      name: cleanRequiredText(payload.name, "Habit name"),
      description: cleanText(payload.description),
      category: cleanText(payload.category) ?? "general",
      target_count: cleanNumber(payload.target_count) ?? 1,
      target_period: cleanText(payload.target_period) ?? "day",
      coaching_notes: cleanText(payload.coaching_notes),
    })
    .select("*")
    .single()

  if (error) throw error
  await syncCoachWellnessWorkbook(supabase, coachId)
  return data as WellnessHabitTemplate
}

export async function updateWellnessHabitTemplate(
  supabase: { from: (table: string) => any },
  coachId: string,
  habitTemplateId: string,
  payload: Partial<WellnessHabitTemplate>
) {
  const { data, error } = await supabase
    .from("wellness_habit_templates")
    .update({
      name: cleanRequiredText(payload.name, "Habit name"),
      description: cleanText(payload.description),
      category: cleanText(payload.category) ?? "general",
      target_count: cleanNumber(payload.target_count) ?? 1,
      target_period: cleanText(payload.target_period) ?? "day",
      coaching_notes: cleanText(payload.coaching_notes),
      is_archived: Boolean(payload.is_archived),
      updated_at: new Date().toISOString(),
    })
    .eq("id", habitTemplateId)
    .eq("coach_id", coachId)
    .select("*")
    .single()

  if (error) throw error
  await syncCoachWellnessWorkbook(supabase, coachId)
  return data as WellnessHabitTemplate
}

export async function listClientWellnessGoalAssignmentsForCoach(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string
) {
  const { data, error } = await supabase
    .from("client_wellness_goal_assignments")
    .select("*")
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as ClientWellnessGoalAssignment[]
}

export async function assignWellnessGoalToClient(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string,
  goalTemplateId: string,
  assignedStartDate?: string | null
) {
  const { data: template, error: templateError } = await supabase
    .from("wellness_goal_templates")
    .select("*")
    .eq("id", goalTemplateId)
    .eq("coach_id", coachId)
    .single()

  if (templateError || !template) {
    throw templateError ?? new Error("Goal template not found")
  }

  const { data, error } = await supabase
    .from("client_wellness_goal_assignments")
    .insert({
      coach_id: coachId,
      client_id: clientId,
      goal_template_id: template.id,
      goal_name_snapshot: template.name,
      description_snapshot: template.description,
      category_snapshot: template.category,
      target_metric: template.target_metric,
      target_value: template.target_value,
      milestone_label: template.milestone_label,
      coaching_notes: template.coaching_notes,
      assigned_start_date: assignedStartDate || null,
      status: "active",
    })
    .select("*")
    .single()

  if (error) throw error
  await syncClientWellnessWorkbook(supabase, coachId, clientId)
  return data as ClientWellnessGoalAssignment
}

export async function updateClientWellnessGoalAssignment(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string,
  assignmentId: string,
  payload: Partial<ClientWellnessGoalAssignment>
) {
  const { data, error } = await supabase
    .from("client_wellness_goal_assignments")
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
  await syncClientWellnessWorkbook(supabase, coachId, clientId)
  return data as ClientWellnessGoalAssignment
}

export async function listClientWellnessHabitAssignmentsForCoach(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string
) {
  const { data, error } = await supabase
    .from("client_wellness_habit_assignments")
    .select("*")
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as ClientWellnessHabitAssignment[]
}

export async function assignWellnessHabitToClient(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string,
  habitTemplateId: string,
  assignedStartDate?: string | null
) {
  const { data: template, error: templateError } = await supabase
    .from("wellness_habit_templates")
    .select("*")
    .eq("id", habitTemplateId)
    .eq("coach_id", coachId)
    .single()

  if (templateError || !template) {
    throw templateError ?? new Error("Habit template not found")
  }

  const { data, error } = await supabase
    .from("client_wellness_habit_assignments")
    .insert({
      coach_id: coachId,
      client_id: clientId,
      habit_template_id: template.id,
      habit_name_snapshot: template.name,
      description_snapshot: template.description,
      category_snapshot: template.category,
      target_count: template.target_count,
      target_period: template.target_period,
      coaching_notes: template.coaching_notes,
      assigned_start_date: assignedStartDate || null,
      status: "active",
    })
    .select("*")
    .single()

  if (error) throw error
  await syncClientWellnessWorkbook(supabase, coachId, clientId)
  return data as ClientWellnessHabitAssignment
}

export async function updateClientWellnessHabitAssignment(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string,
  assignmentId: string,
  payload: Partial<ClientWellnessHabitAssignment>
) {
  const { data, error } = await supabase
    .from("client_wellness_habit_assignments")
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
  await syncClientWellnessWorkbook(supabase, coachId, clientId)
  return data as ClientWellnessHabitAssignment
}

export async function listClientWellnessHabitLogsForCoach(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string
) {
  const { data, error } = await supabase
    .from("client_wellness_habit_logs")
    .select("*")
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .order("completion_date", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as ClientWellnessHabitLog[]
}

export async function createClientWellnessHabitLog(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string,
  payload: Partial<ClientWellnessHabitLog> & { assignment_id: string }
) {
  const { data: assignment, error: assignmentError } = await supabase
    .from("client_wellness_habit_assignments")
    .select("id, coach_id, client_id")
    .eq("id", payload.assignment_id)
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .single()

  if (assignmentError || !assignment) {
    throw assignmentError ?? new Error("Wellness habit assignment not found")
  }

  const completionDate =
    typeof payload.completion_date === "string" && payload.completion_date.length > 0
      ? payload.completion_date
      : new Date().toISOString().slice(0, 10)

  const completionStatus =
    payload.completion_status === "missed"
      ? "missed"
      : payload.completion_status === "partial"
        ? "partial"
        : "completed"

  const { data: existing, error: existingError } = await supabase
    .from("client_wellness_habit_logs")
    .select("*")
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .eq("assignment_id", assignment.id)
    .eq("completion_date", completionDate)
    .order("created_at", { ascending: false })
    .maybeSingle()

  if (existingError) throw existingError

  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from("client_wellness_habit_logs")
      .update({
        logged_at: normalizeDateTime(payload.logged_at),
        completion_status: completionStatus,
        adherence_score: cleanScore(payload.adherence_score, "Adherence score"),
        notes: cleanText(payload.notes),
        coach_note: cleanText(payload.coach_note),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("coach_id", coachId)
      .eq("client_id", clientId)
      .select("*")
      .single()

    if (updateError) throw updateError
    await syncClientWellnessWorkbook(supabase, coachId, clientId)
    return updated as ClientWellnessHabitLog
  }

  const { data, error } = await supabase
    .from("client_wellness_habit_logs")
    .insert({
      coach_id: coachId,
      client_id: clientId,
      assignment_id: assignment.id,
      logged_at: normalizeDateTime(payload.logged_at),
      completion_date: completionDate,
      completion_status: completionStatus,
      adherence_score: cleanScore(payload.adherence_score, "Adherence score"),
      notes: cleanText(payload.notes),
      coach_note: cleanText(payload.coach_note),
    })
    .select("*")
    .single()

  if (error) throw error
  await syncClientWellnessWorkbook(supabase, coachId, clientId)
  return data as ClientWellnessHabitLog
}

export async function updateClientWellnessHabitLog(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string,
  logId: string,
  payload: Partial<ClientWellnessHabitLog>
) {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if ("logged_at" in payload) updates.logged_at = normalizeDateTime(payload.logged_at)
  if ("completion_date" in payload && typeof payload.completion_date === "string" && payload.completion_date.trim()) {
    updates.completion_date = payload.completion_date
  }
  if ("completion_status" in payload) {
    updates.completion_status =
      payload.completion_status === "missed"
        ? "missed"
        : payload.completion_status === "partial"
          ? "partial"
          : "completed"
  }
  if ("adherence_score" in payload) updates.adherence_score = cleanScore(payload.adherence_score, "Adherence score")
  if ("notes" in payload) updates.notes = cleanText(payload.notes)
  if ("coach_note" in payload) updates.coach_note = cleanText(payload.coach_note)

  const { data, error } = await supabase
    .from("client_wellness_habit_logs")
    .update(updates)
    .eq("id", logId)
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .select("*")
    .single()

  if (error) throw error
  await syncClientWellnessWorkbook(supabase, coachId, clientId)
  return data as ClientWellnessHabitLog
}

export async function listClientWellnessCheckInsForCoach(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string
) {
  const { data, error } = await supabase
    .from("client_wellness_check_ins")
    .select("*")
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .order("submitted_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as ClientWellnessCheckIn[]
}

export async function createClientWellnessCheckIn(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string,
  payload: Partial<ClientWellnessCheckIn>
) {
  const submittedAt = normalizeDateTime(payload.submitted_at)
  const { data, error } = await supabase
    .from("client_wellness_check_ins")
    .insert({
      coach_id: coachId,
      client_id: clientId,
      submitted_at: submittedAt,
      week_label: cleanText(payload.week_label) ?? defaultWeekLabel(submittedAt),
      energy_score: cleanScore(payload.energy_score, "Energy score"),
      stress_score: cleanScore(payload.stress_score, "Stress score"),
      sleep_score: cleanScore(payload.sleep_score, "Sleep score"),
      confidence_score: cleanScore(payload.confidence_score, "Confidence score"),
      wins: cleanText(payload.wins),
      blockers: cleanText(payload.blockers),
      focus_for_next_week: cleanText(payload.focus_for_next_week),
      coach_follow_up_note: cleanText(payload.coach_follow_up_note),
    })
    .select("*")
    .single()

  if (error) throw error
  await syncClientWellnessWorkbook(supabase, coachId, clientId)
  return data as ClientWellnessCheckIn
}

export async function updateClientWellnessCheckIn(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string,
  checkInId: string,
  payload: Partial<ClientWellnessCheckIn>
) {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if ("submitted_at" in payload) updates.submitted_at = normalizeDateTime(payload.submitted_at)
  if ("week_label" in payload) {
    const weekLabel = cleanText(payload.week_label)
    updates.week_label =
      weekLabel
      ?? defaultWeekLabel(typeof updates.submitted_at === "string" ? updates.submitted_at : new Date().toISOString())
  }
  if ("energy_score" in payload) updates.energy_score = cleanScore(payload.energy_score, "Energy score")
  if ("stress_score" in payload) updates.stress_score = cleanScore(payload.stress_score, "Stress score")
  if ("sleep_score" in payload) updates.sleep_score = cleanScore(payload.sleep_score, "Sleep score")
  if ("confidence_score" in payload) updates.confidence_score = cleanScore(payload.confidence_score, "Confidence score")
  if ("wins" in payload) updates.wins = cleanText(payload.wins)
  if ("blockers" in payload) updates.blockers = cleanText(payload.blockers)
  if ("focus_for_next_week" in payload) updates.focus_for_next_week = cleanText(payload.focus_for_next_week)
  if ("coach_follow_up_note" in payload) updates.coach_follow_up_note = cleanText(payload.coach_follow_up_note)

  const { data, error } = await supabase
    .from("client_wellness_check_ins")
    .update(updates)
    .eq("id", checkInId)
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .select("*")
    .single()

  if (error) throw error
  await syncClientWellnessWorkbook(supabase, coachId, clientId)
  return data as ClientWellnessCheckIn
}

export async function listClientWellnessSessionNotesForCoach(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string
) {
  const { data, error } = await supabase
    .from("client_wellness_session_notes")
    .select("*")
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as ClientWellnessSessionNote[]
}

export async function createClientWellnessSessionNote(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string,
  payload: Partial<ClientWellnessSessionNote>
) {
  const { data, error } = await supabase
    .from("client_wellness_session_notes")
    .insert({
      coach_id: coachId,
      client_id: clientId,
      session_date: cleanRequiredText(payload.session_date, "Session date"),
      session_type: cleanText(payload.session_type) ?? "coaching_session",
      summary: cleanRequiredText(payload.summary, "Session summary"),
      client_wins: cleanText(payload.client_wins),
      priorities: cleanText(payload.priorities),
      action_steps: cleanText(payload.action_steps),
    })
    .select("*")
    .single()

  if (error) throw error
  await syncClientWellnessWorkbook(supabase, coachId, clientId)
  return data as ClientWellnessSessionNote
}

export async function updateClientWellnessSessionNote(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string,
  noteId: string,
  payload: Partial<ClientWellnessSessionNote>
) {
  const { data, error } = await supabase
    .from("client_wellness_session_notes")
    .update({
      session_date: "session_date" in payload ? cleanRequiredText(payload.session_date, "Session date") : undefined,
      session_type: "session_type" in payload ? cleanText(payload.session_type) ?? "coaching_session" : undefined,
      summary: "summary" in payload ? cleanRequiredText(payload.summary, "Session summary") : undefined,
      client_wins: "client_wins" in payload ? cleanText(payload.client_wins) : undefined,
      priorities: "priorities" in payload ? cleanText(payload.priorities) : undefined,
      action_steps: "action_steps" in payload ? cleanText(payload.action_steps) : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .select("*")
    .single()

  if (error) throw error
  await syncClientWellnessWorkbook(supabase, coachId, clientId)
  return data as ClientWellnessSessionNote
}

export async function getClientWellnessContextForUser(
  supabase: { from: (table: string) => any },
  userId: string
) {
  const client = await getClientWellnessAccessForUser(supabase, userId)

  const [goals, habits, habitLogs, checkIns, sessionNotes] = await Promise.all([
    listClientWellnessGoalAssignmentsForCoach(supabase, client.coach_id, client.id),
    listClientWellnessHabitAssignmentsForCoach(supabase, client.coach_id, client.id),
    listClientWellnessHabitLogsForCoach(supabase, client.coach_id, client.id),
    listClientWellnessCheckInsForCoach(supabase, client.coach_id, client.id),
    listClientWellnessSessionNotesForCoach(supabase, client.coach_id, client.id),
  ])

  return {
    client,
    goals,
    habits,
    habit_logs: habitLogs,
    check_ins: checkIns,
    session_notes: sessionNotes,
  }
}

export async function createClientWellnessCheckInForUser(
  supabase: { from: (table: string) => any },
  userId: string,
  payload: Partial<ClientWellnessCheckIn>
) {
  const client = await getClientWellnessAccessForUser(supabase, userId)

  return createClientWellnessCheckIn(supabase, client.coach_id, client.id, payload)
}

export async function createClientWellnessHabitLogForUser(
  supabase: { from: (table: string) => any },
  userId: string,
  payload: Partial<ClientWellnessHabitLog> & { assignment_id: string }
) {
  const client = await getClientWellnessAccessForUser(supabase, userId)

  return createClientWellnessHabitLog(supabase, client.coach_id, client.id, payload)
}

export async function assertCoachWellnessAccess(
  supabase: { from: (table: string) => any },
  coachId: string
) {
  await assertCoachWellnessEnabled(supabase, coachId)
}
