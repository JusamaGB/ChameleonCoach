import type {
  ClientPTLog,
  ClientPTLogExercise,
  ClientPTProgramAssignment,
  ClientPTSession,
  ClientPTSessionExercise,
  Exercise,
  PTProgram,
  PTProgramSession,
  PTWorkout,
  PTWorkoutExercise,
} from "@/types"

export type WorkoutExerciseInput = {
  exercise_id: string | null
  exercise_name?: string | null
  sort_order: number
  block_label?: string | null
  prescription_type: "reps" | "time" | "distance"
  sets?: number | null
  reps?: string | null
  rep_range_min?: number | null
  rep_range_max?: number | null
  duration_seconds?: number | null
  distance_value?: number | null
  distance_unit?: string | null
  rest_seconds?: number | null
  tempo?: string | null
  load_guidance?: string | null
  rpe_target?: number | null
  notes?: string | null
}

export type ProgramSessionInput = {
  week_number: number
  day_number: number
  sort_order: number
  session_name: string
  workout_id: string | null
  focus?: string | null
  notes?: string | null
}

export type PTLogExerciseInput = {
  client_session_exercise_id: string | null
  exercise_id: string | null
  exercise_name_snapshot: string
  set_number: number
  target_reps?: number | null
  completed_reps?: number | null
  weight_value?: number | null
  weight_unit?: string | null
  duration_seconds?: number | null
  distance_value?: number | null
  distance_unit?: string | null
  rpe?: number | null
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

function normalizeWorkoutExerciseInput(input: WorkoutExerciseInput) {
  return {
    exercise_id: input.exercise_id ?? null,
    sort_order: Number(input.sort_order) || 0,
    block_label: cleanText(input.block_label),
    prescription_type:
      input.prescription_type === "time" || input.prescription_type === "distance"
        ? input.prescription_type
        : "reps",
    sets: cleanNumber(input.sets),
    reps: cleanText(input.reps),
    rep_range_min: cleanNumber(input.rep_range_min),
    rep_range_max: cleanNumber(input.rep_range_max),
    duration_seconds: cleanNumber(input.duration_seconds),
    distance_value: cleanNumber(input.distance_value),
    distance_unit: cleanText(input.distance_unit),
    rest_seconds: cleanNumber(input.rest_seconds),
    tempo: cleanText(input.tempo),
    load_guidance: cleanText(input.load_guidance),
    rpe_target: cleanNumber(input.rpe_target),
    notes: cleanText(input.notes),
  }
}

function normalizeProgramSessionInput(input: ProgramSessionInput) {
  return {
    week_number: Math.max(1, Number(input.week_number) || 1),
    day_number: Math.max(1, Number(input.day_number) || 1),
    sort_order: Number(input.sort_order) || 0,
    session_name: String(input.session_name || "").trim(),
    workout_id: input.workout_id ?? null,
    focus: cleanText(input.focus),
    notes: cleanText(input.notes),
  }
}

function normalizeLogExerciseInput(input: PTLogExerciseInput) {
  return {
    client_session_exercise_id: input.client_session_exercise_id ?? null,
    exercise_id: input.exercise_id ?? null,
    exercise_name_snapshot: input.exercise_name_snapshot,
    set_number: Math.max(1, Number(input.set_number) || 1),
    target_reps: cleanNumber(input.target_reps),
    completed_reps: cleanNumber(input.completed_reps),
    weight_value: cleanNumber(input.weight_value),
    weight_unit: cleanText(input.weight_unit),
    duration_seconds: cleanNumber(input.duration_seconds),
    distance_value: cleanNumber(input.distance_value),
    distance_unit: cleanText(input.distance_unit),
    rpe: cleanNumber(input.rpe),
    notes: cleanText(input.notes),
  }
}

export async function getCoachClientRecord(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string
) {
  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .eq("coach_id", coachId)
    .maybeSingle()

  if (error || !client) {
    return null
  }

  return client
}

export async function listPTWorkoutsForCoach(
  supabase: { from: (table: string) => any },
  coachId: string
) {
  const { data: workouts, error } = await supabase
    .from("pt_workouts")
    .select("*")
    .eq("coach_id", coachId)
    .eq("is_archived", false)
    .order("name", { ascending: true })

  if (error) throw error

  const workoutIds = (workouts ?? []).map((workout: PTWorkout) => workout.id)
  const { data: workoutExercises } = workoutIds.length
    ? await supabase
        .from("pt_workout_exercises")
        .select("*, exercises(*)")
        .in("workout_id", workoutIds)
        .order("sort_order", { ascending: true })
    : { data: [] }

  const groupedExercises = (workoutExercises ?? []).reduce((acc: Record<string, any[]>, row: any) => {
    const workoutId = row.workout_id
    if (!acc[workoutId]) acc[workoutId] = []
    acc[workoutId].push({
      ...row,
      exercise: Array.isArray(row.exercises) ? row.exercises[0] : row.exercises,
    })
    return acc
  }, {})

  return (workouts ?? []).map((workout: PTWorkout) => ({
    ...workout,
    exercises: groupedExercises[workout.id] ?? [],
  }))
}

export async function createPTWorkout(
  supabase: { from: (table: string) => any },
  coachId: string,
  payload: {
    name: string
    description?: string | null
    goal?: string | null
    estimated_duration_minutes?: number | null
    difficulty?: string | null
    exercises: WorkoutExerciseInput[]
  }
) {
  const { data: workout, error } = await supabase
    .from("pt_workouts")
    .insert({
      coach_id: coachId,
      name: payload.name.trim(),
      description: cleanText(payload.description),
      goal: cleanText(payload.goal),
      estimated_duration_minutes: cleanNumber(payload.estimated_duration_minutes),
      difficulty: cleanText(payload.difficulty),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single()

  if (error || !workout) throw error ?? new Error("Failed to create workout")

  if (payload.exercises.length > 0) {
    const rows = payload.exercises.map((exercise) => ({
      workout_id: workout.id,
      ...normalizeWorkoutExerciseInput(exercise),
    }))

    const { error: exerciseError } = await supabase
      .from("pt_workout_exercises")
      .insert(rows)

    if (exerciseError) throw exerciseError
  }

  return workout
}

export async function updatePTWorkout(
  supabase: { from: (table: string) => any },
  coachId: string,
  workoutId: string,
  payload: {
    name: string
    description?: string | null
    goal?: string | null
    estimated_duration_minutes?: number | null
    difficulty?: string | null
    is_archived?: boolean
    exercises: WorkoutExerciseInput[]
  }
) {
  const { data: workout, error } = await supabase
    .from("pt_workouts")
    .update({
      name: payload.name.trim(),
      description: cleanText(payload.description),
      goal: cleanText(payload.goal),
      estimated_duration_minutes: cleanNumber(payload.estimated_duration_minutes),
      difficulty: cleanText(payload.difficulty),
      is_archived: Boolean(payload.is_archived),
      updated_at: new Date().toISOString(),
    })
    .eq("id", workoutId)
    .eq("coach_id", coachId)
    .select("*")
    .single()

  if (error || !workout) throw error ?? new Error("Failed to update workout")

  await supabase.from("pt_workout_exercises").delete().eq("workout_id", workoutId)
  if (payload.exercises.length > 0) {
    const rows = payload.exercises.map((exercise) => ({
      workout_id: workoutId,
      ...normalizeWorkoutExerciseInput(exercise),
    }))
    const { error: exerciseError } = await supabase.from("pt_workout_exercises").insert(rows)
    if (exerciseError) throw exerciseError
  }

  return workout
}

export async function listPTProgramsForCoach(
  supabase: { from: (table: string) => any },
  coachId: string
) {
  const { data: programs, error } = await supabase
    .from("pt_programs")
    .select("*")
    .eq("coach_id", coachId)
    .eq("is_archived", false)
    .order("name", { ascending: true })

  if (error) throw error

  const programIds = (programs ?? []).map((program: PTProgram) => program.id)
  const { data: sessions } = programIds.length
    ? await supabase
        .from("pt_program_sessions")
        .select("*, pt_workouts(name)")
        .in("program_id", programIds)
        .order("week_number", { ascending: true })
        .order("day_number", { ascending: true })
        .order("sort_order", { ascending: true })
    : { data: [] }

  const groupedSessions = (sessions ?? []).reduce((acc: Record<string, any[]>, row: any) => {
    const programId = row.program_id
    if (!acc[programId]) acc[programId] = []
    acc[programId].push({
      ...row,
      workout_name: Array.isArray(row.pt_workouts) ? row.pt_workouts[0]?.name : row.pt_workouts?.name,
    })
    return acc
  }, {})

  return (programs ?? []).map((program: PTProgram) => ({
    ...program,
    sessions: groupedSessions[program.id] ?? [],
  }))
}

export async function createPTProgram(
  supabase: { from: (table: string) => any },
  coachId: string,
  payload: {
    name: string
    description?: string | null
    goal?: string | null
    duration_weeks?: number | null
    difficulty?: string | null
    sessions: ProgramSessionInput[]
  }
) {
  const { data: program, error } = await supabase
    .from("pt_programs")
    .insert({
      coach_id: coachId,
      name: payload.name.trim(),
      description: cleanText(payload.description),
      goal: cleanText(payload.goal),
      duration_weeks: Math.max(1, Number(payload.duration_weeks) || 1),
      difficulty: cleanText(payload.difficulty),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single()

  if (error || !program) throw error ?? new Error("Failed to create program")

  if (payload.sessions.length > 0) {
    const rows = payload.sessions.map((session) => ({
      program_id: program.id,
      ...normalizeProgramSessionInput(session),
    }))
    const { error: sessionError } = await supabase.from("pt_program_sessions").insert(rows)
    if (sessionError) throw sessionError
  }

  return program
}

export async function updatePTProgram(
  supabase: { from: (table: string) => any },
  coachId: string,
  programId: string,
  payload: {
    name: string
    description?: string | null
    goal?: string | null
    duration_weeks?: number | null
    difficulty?: string | null
    is_archived?: boolean
    sessions: ProgramSessionInput[]
  }
) {
  const { data: program, error } = await supabase
    .from("pt_programs")
    .update({
      name: payload.name.trim(),
      description: cleanText(payload.description),
      goal: cleanText(payload.goal),
      duration_weeks: Math.max(1, Number(payload.duration_weeks) || 1),
      difficulty: cleanText(payload.difficulty),
      is_archived: Boolean(payload.is_archived),
      updated_at: new Date().toISOString(),
    })
    .eq("id", programId)
    .eq("coach_id", coachId)
    .select("*")
    .single()

  if (error || !program) throw error ?? new Error("Failed to update program")

  await supabase.from("pt_program_sessions").delete().eq("program_id", programId)
  if (payload.sessions.length > 0) {
    const rows = payload.sessions.map((session) => ({
      program_id: programId,
      ...normalizeProgramSessionInput(session),
    }))
    const { error: sessionError } = await supabase.from("pt_program_sessions").insert(rows)
    if (sessionError) throw sessionError
  }

  return program
}

function addDays(baseDate: string, days: number) {
  const date = new Date(`${baseDate}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export async function assignPTProgramToClient(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string,
  payload: {
    program_id: string
    assigned_start_date?: string | null
    assignment_notes?: string | null
  }
) {
  const client = await getCoachClientRecord(supabase, coachId, clientId)
  if (!client) {
    throw new Error("Client not found")
  }

  const { data: program, error: programError } = await supabase
    .from("pt_programs")
    .select("*")
    .eq("id", payload.program_id)
    .eq("coach_id", coachId)
    .single()
  if (programError || !program) throw new Error("Program not found")

  const { data: programSessions, error: sessionError } = await supabase
    .from("pt_program_sessions")
    .select("*")
    .eq("program_id", payload.program_id)
    .order("week_number", { ascending: true })
    .order("day_number", { ascending: true })
    .order("sort_order", { ascending: true })
  if (sessionError) throw sessionError

  const workoutIds = Array.from(
    new Set((programSessions ?? []).map((session: PTProgramSession) => session.workout_id).filter(Boolean))
  )
  const { data: workoutRows } = workoutIds.length
    ? await supabase.from("pt_workouts").select("*").in("id", workoutIds)
    : { data: [] }
  const { data: workoutExerciseRows } = workoutIds.length
    ? await supabase
        .from("pt_workout_exercises")
        .select("*, exercises(name)")
        .in("workout_id", workoutIds)
        .order("sort_order", { ascending: true })
    : { data: [] }

  const workoutMap = new Map<string, PTWorkout>(
    ((workoutRows ?? []) as PTWorkout[]).map((workout) => [workout.id, workout])
  )
  const workoutExercisesByWorkout = (workoutExerciseRows ?? []).reduce((acc: Record<string, any[]>, row: any) => {
    if (!acc[row.workout_id]) acc[row.workout_id] = []
    acc[row.workout_id].push({
      ...row,
      exercise_name: Array.isArray(row.exercises) ? row.exercises[0]?.name : row.exercises?.name,
    })
    return acc
  }, {})

  await supabase
    .from("client_pt_program_assignments")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("client_id", clientId)
    .eq("coach_id", coachId)
    .eq("status", "active")

  const assignmentStatus = "active"
  const totalSessions = (programSessions ?? []).length
  const { data: assignment, error: assignmentError } = await supabase
    .from("client_pt_program_assignments")
    .insert({
      coach_id: coachId,
      client_id: clientId,
      program_id: program.id,
      program_name_snapshot: program.name,
      assigned_start_date: payload.assigned_start_date ?? null,
      status: assignmentStatus,
      assignment_notes: cleanText(payload.assignment_notes),
      total_sessions_count: totalSessions,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single()
  if (assignmentError || !assignment) throw assignmentError ?? new Error("Failed to assign program")

  const sessionInserts = (programSessions ?? []).map((session: PTProgramSession) => {
    const workout = session.workout_id ? workoutMap.get(session.workout_id) : null
    const scheduledDate = payload.assigned_start_date
      ? addDays(payload.assigned_start_date, (session.week_number - 1) * 7 + (session.day_number - 1))
      : null

    return {
      assignment_id: assignment.id,
      client_id: clientId,
      coach_id: coachId,
      program_id: program.id,
      program_session_id: session.id,
      workout_id: session.workout_id,
      session_name: session.session_name || workout?.name || `Session ${session.day_number}`,
      scheduled_date: scheduledDate,
      week_number: session.week_number,
      day_number: session.day_number,
      sort_order: session.sort_order,
      status: scheduledDate ? "upcoming" : "available",
      coach_note: cleanText(session.notes),
      updated_at: new Date().toISOString(),
    }
  })

  const { data: clientSessions, error: clientSessionError } = await supabase
    .from("client_pt_sessions")
    .insert(sessionInserts)
    .select("*")
  if (clientSessionError || !clientSessions) throw clientSessionError ?? new Error("Failed to materialize sessions")

  const sessionExerciseInserts = clientSessions.flatMap((clientSession: ClientPTSession) => {
    const exercises = workoutExercisesByWorkout[clientSession.workout_id ?? ""] ?? []
    return exercises.map((exercise: any) => ({
      client_session_id: clientSession.id,
      exercise_id: exercise.exercise_id,
      exercise_name_snapshot: exercise.exercise_name || "Exercise",
      sort_order: exercise.sort_order,
      block_label: exercise.block_label,
      prescription_type: exercise.prescription_type,
      sets: exercise.sets,
      reps: exercise.reps,
      rep_range_min: exercise.rep_range_min,
      rep_range_max: exercise.rep_range_max,
      duration_seconds: exercise.duration_seconds,
      distance_value: exercise.distance_value,
      distance_unit: exercise.distance_unit,
      rest_seconds: exercise.rest_seconds,
      tempo: exercise.tempo,
      load_guidance: exercise.load_guidance,
      rpe_target: exercise.rpe_target,
      notes: exercise.notes,
      updated_at: new Date().toISOString(),
    }))
  })

  if (sessionExerciseInserts.length > 0) {
    const { error: sessionExerciseError } = await supabase
      .from("client_pt_session_exercises")
      .insert(sessionExerciseInserts)
    if (sessionExerciseError) throw sessionExerciseError
  }

  return assignment
}

export async function getClientPTOverviewForCoach(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string
) {
  const client = await getCoachClientRecord(supabase, coachId, clientId)
  if (!client) return null

  const { data: assignment } = await supabase
    .from("client_pt_program_assignments")
    .select("*")
    .eq("client_id", clientId)
    .eq("coach_id", coachId)
    .eq("status", "active")
    .maybeSingle()

  if (!assignment) {
    return {
      assignment: null,
      sessions: [],
      logs: [],
    }
  }

  const { data: sessions } = await supabase
    .from("client_pt_sessions")
    .select("*")
    .eq("assignment_id", assignment.id)
    .order("week_number", { ascending: true })
    .order("day_number", { ascending: true })
    .order("sort_order", { ascending: true })

  const { data: logs } = await supabase
    .from("client_pt_logs")
    .select("*")
    .eq("client_id", clientId)
    .eq("coach_id", coachId)
    .order("logged_at", { ascending: false })
    .limit(10)

  return {
    assignment: assignment as ClientPTProgramAssignment,
    sessions: (sessions ?? []) as ClientPTSession[],
    logs: (logs ?? []) as ClientPTLog[],
  }
}

export async function getClientTrainingForUser(
  supabase: { from: (table: string) => any },
  userId: string
) {
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (!client) {
    return null
  }

  const { data: assignment } = await supabase
    .from("client_pt_program_assignments")
    .select("*")
    .eq("client_id", client.id)
    .eq("status", "active")
    .maybeSingle()

  const { data: sessions } = assignment
    ? await supabase
        .from("client_pt_sessions")
        .select("*")
        .eq("assignment_id", assignment.id)
        .order("week_number", { ascending: true })
        .order("day_number", { ascending: true })
        .order("sort_order", { ascending: true })
    : { data: [] }

  const sessionIds = (sessions ?? []).map((session: ClientPTSession) => session.id)
  const { data: sessionExercises } = sessionIds.length
    ? await supabase
        .from("client_pt_session_exercises")
        .select("*")
        .in("client_session_id", sessionIds)
        .order("sort_order", { ascending: true })
    : { data: [] }
  const { data: logs } = sessionIds.length
    ? await supabase
        .from("client_pt_logs")
        .select("*")
        .in("client_session_id", sessionIds)
        .order("logged_at", { ascending: false })
    : { data: [] }
  const logIds = (logs ?? []).map((log: ClientPTLog) => log.id)
  const { data: logExercises } = logIds.length
    ? await supabase
        .from("client_pt_log_exercises")
        .select("*")
        .in("pt_log_id", logIds)
        .order("set_number", { ascending: true })
    : { data: [] }

  const exercisesBySession = (sessionExercises ?? []).reduce((acc: Record<string, ClientPTSessionExercise[]>, row: ClientPTSessionExercise) => {
    if (!acc[row.client_session_id]) acc[row.client_session_id] = []
    acc[row.client_session_id].push(row)
    return acc
  }, {})
  const logsBySession = (logs ?? []).reduce((acc: Record<string, ClientPTLog | null>, row: ClientPTLog) => {
    acc[row.client_session_id] = row
    return acc
  }, {})
  const logExercisesByLog = (logExercises ?? []).reduce((acc: Record<string, ClientPTLogExercise[]>, row: ClientPTLogExercise) => {
    if (!acc[row.pt_log_id]) acc[row.pt_log_id] = []
    acc[row.pt_log_id].push(row)
    return acc
  }, {})

  return {
    client,
    assignment: assignment as ClientPTProgramAssignment | null,
    sessions: (sessions ?? []).map((session: ClientPTSession) => ({
      ...session,
      exercises: exercisesBySession[session.id] ?? [],
      log: logsBySession[session.id] ?? null,
      log_exercises: logsBySession[session.id]
        ? logExercisesByLog[logsBySession[session.id]!.id] ?? []
        : [],
    })),
  }
}

export async function recalculatePTAssignmentRollup(
  supabase: { from: (table: string) => any },
  assignmentId: string
) {
  const { data: assignment } = await supabase
    .from("client_pt_program_assignments")
    .select("*")
    .eq("id", assignmentId)
    .single()

  const { data: sessions } = await supabase
    .from("client_pt_sessions")
    .select("id, completed_at, status, week_number")
    .eq("assignment_id", assignmentId)

  const totalSessionsCount = (sessions ?? []).length
  const completedSessions = (sessions ?? []).filter(
    (session: Pick<ClientPTSession, "status" | "completed_at">) =>
      session.status === "completed" || session.status === "skipped"
  )
  const completedSessionsCount = completedSessions.filter(
    (session: Pick<ClientPTSession, "status">) => session.status === "completed"
  ).length
  const lastCompleted = completedSessions
    .map((session: Pick<ClientPTSession, "completed_at">) => session.completed_at)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null
  const adherencePercent =
    totalSessionsCount > 0 ? Math.round((completedSessionsCount / totalSessionsCount) * 100) : 0
  const currentWeek =
    (sessions ?? [])
      .filter((session: Pick<ClientPTSession, "status">) => session.status !== "completed")
      .map((session: Pick<ClientPTSession, "week_number">) => session.week_number)
      .sort((a: number, b: number) => a - b)[0]
    ?? assignment?.current_week
    ?? 1

  await supabase
    .from("client_pt_program_assignments")
    .update({
      last_session_completed_at: lastCompleted,
      completed_sessions_count: completedSessionsCount,
      total_sessions_count: totalSessionsCount,
      adherence_percent: adherencePercent,
      current_week: currentWeek,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assignmentId)
}

export async function logPTSessionForClient(
  supabase: { from: (table: string) => any },
  userId: string,
  payload: {
    client_session_id: string
    completion_status: "completed" | "partial" | "skipped"
    session_rpe?: number | null
    energy_rating?: number | null
    client_feedback?: string | null
    client_note?: string | null
    exercises: PTLogExerciseInput[]
  }
) {
  const training = await getClientTrainingForUser(supabase, userId)
  if (!training) {
    throw new Error("Client not found")
  }

  const session = training.sessions.find((entry: any) => entry.id === payload.client_session_id)
  if (!session || !training.assignment) {
    throw new Error("Training session not found")
  }

  const now = new Date().toISOString()
  let logId = session.log?.id ?? null

  if (logId) {
    const { error: logUpdateError } = await supabase
      .from("client_pt_logs")
      .update({
        completion_status: payload.completion_status,
        session_rpe: cleanNumber(payload.session_rpe),
        energy_rating: cleanNumber(payload.energy_rating),
        client_feedback: cleanText(payload.client_feedback),
        updated_at: now,
      })
      .eq("id", logId)
    if (logUpdateError) throw logUpdateError

    await supabase.from("client_pt_log_exercises").delete().eq("pt_log_id", logId)
  } else {
    const { data: log, error: logError } = await supabase
      .from("client_pt_logs")
      .insert({
        client_session_id: payload.client_session_id,
        client_id: training.client.id,
        coach_id: training.client.coach_id,
        completion_status: payload.completion_status,
        session_rpe: cleanNumber(payload.session_rpe),
        energy_rating: cleanNumber(payload.energy_rating),
        client_feedback: cleanText(payload.client_feedback),
        logged_at: now,
        updated_at: now,
      })
      .select("*")
      .single()
    if (logError || !log) throw logError ?? new Error("Failed to create workout log")
    logId = log.id
  }

  if (payload.exercises.length > 0) {
    const exerciseRows = payload.exercises.map((exercise) => ({
      pt_log_id: logId,
      ...normalizeLogExerciseInput(exercise),
      updated_at: now,
    }))
    const { error: exerciseError } = await supabase
      .from("client_pt_log_exercises")
      .insert(exerciseRows)
    if (exerciseError) throw exerciseError
  }

  const sessionStatus = payload.completion_status === "skipped" ? "skipped" : "completed"
  const { error: sessionUpdateError } = await supabase
    .from("client_pt_sessions")
    .update({
      status: sessionStatus,
      completed_at: payload.completion_status === "skipped" ? null : now,
      client_note: cleanText(payload.client_note),
      updated_at: now,
    })
    .eq("id", payload.client_session_id)
  if (sessionUpdateError) throw sessionUpdateError

  await recalculatePTAssignmentRollup(supabase, training.assignment.id)

  return { ok: true }
}
