import { google } from "googleapis"
import { getAuthedClient } from "./auth"
import type {
  ClientNutritionCheckIn,
  ClientNutritionHabitAssignment,
  ClientNutritionHabitLog,
  ClientNutritionLogEntry,
  ClientPTLog,
  ClientPTLogExercise,
  ClientPTProgramAssignment,
  ClientPTSession,
  ClientPTSessionExercise,
  Exercise,
  MealPlanDay,
  NutritionHabitTemplate,
  NutritionMealPlanTemplate,
  NutritionMealPlanTemplateDay,
  NutritionRecipe,
  ProgressEntry,
  ProfileData,
  PTProgram,
  PTProgramSession,
  PTWorkout,
  PTWorkoutExercise,
} from "@/types"

async function getSheetsApi(coachId: string) {
  const auth = await getAuthedClient(coachId)
  return google.sheets({ version: "v4", auth })
}

async function getSheetTitles(
  sheetId: string,
  coachId: string
) {
  const sheets = await getSheetsApi(coachId)
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: "sheets.properties.title",
  })

  return new Set(
    (spreadsheet.data.sheets ?? [])
      .map((sheet) => sheet.properties?.title)
      .filter((title): title is string => Boolean(title))
  )
}

async function ensureSpreadsheetTabs(
  sheetId: string,
  tabTitles: string[],
  coachId: string
) {
  const existingTitles = await getSheetTitles(sheetId, coachId)
  const missingTitles = tabTitles.filter((title) => !existingTitles.has(title))

  if (missingTitles.length === 0) {
    return
  }

  const sheets = await getSheetsApi(coachId)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: missingTitles.map((title) => ({
        addSheet: {
          properties: { title },
        },
      })),
    },
  })
}

async function overwriteTab(
  sheetId: string,
  tabName: string,
  values: Array<Array<string | number | boolean | null>>,
  coachId: string
) {
  const sheets = await getSheetsApi(coachId)

  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: `${tabName}!A:ZZ`,
  })

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${tabName}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: values.map((row) => row.map((value) => value ?? "")),
    },
  })
}

export async function getMealPlan(sheetId: string, coachId: string): Promise<MealPlanDay[]> {
  const sheets = await getSheetsApi(coachId)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Meal Plan!A:E",
  })

  const rows = res.data.values || []
  if (rows.length <= 1) return []

  return rows.slice(1).map((row) => ({
    day: row[0] || "",
    breakfast: row[1] || "",
    lunch: row[2] || "",
    dinner: row[3] || "",
    snacks: row[4] || "",
  }))
}

export async function updateMealPlan(
  sheetId: string,
  mealPlan: MealPlanDay[],
  coachId: string
): Promise<void> {
  const sheets = await getSheetsApi(coachId)
  const values = [
    ["Day", "Breakfast", "Lunch", "Dinner", "Snacks"],
    ...mealPlan.map((day) => [day.day, day.breakfast, day.lunch, day.dinner, day.snacks]),
  ]
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `Meal Plan!A1:E${values.length}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  })
}

export async function getProfile(sheetId: string, coachId: string): Promise<ProfileData> {
  const sheets = await getSheetsApi(coachId)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Profile!A:B",
  })

  const rows = res.data.values || []
  const data: Record<string, string> = {}
  for (const [key, value] of rows) {
    if (key) data[key.toLowerCase().replace(/\s+/g, "_")] = value || ""
  }

  return {
    name: data.name || "",
    email: data.email || "",
    age: data.age || "",
    gender: data.gender || "",
    height: data.height || "",
    current_weight: data.current_weight || "",
    goal_weight: data.goal_weight || "",
    fitness_goals: data.fitness_goals || "",
    dietary_restrictions: data.dietary_restrictions || "",
    health_conditions: data.health_conditions || "",
    activity_level: data.activity_level || "",
    notes: data.notes || "",
  }
}

export async function updateProfile(
  sheetId: string,
  profile: Partial<ProfileData>,
  coachId: string
): Promise<void> {
  const sheets = await getSheetsApi(coachId)

  const fields = [
    ["Name", profile.name],
    ["Email", profile.email],
    ["Age", profile.age],
    ["Gender", profile.gender],
    ["Height", profile.height],
    ["Current weight", profile.current_weight],
    ["Goal weight", profile.goal_weight],
    ["Fitness goals", profile.fitness_goals],
    ["Dietary restrictions", profile.dietary_restrictions],
    ["Health conditions", profile.health_conditions],
    ["Activity level", profile.activity_level],
    ["Notes", profile.notes],
  ].filter(([, v]) => v !== undefined)

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `Profile!A1:B${fields.length}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: fields },
  })
}

export async function getProgress(sheetId: string, coachId: string): Promise<ProgressEntry[]> {
  const sheets = await getSheetsApi(coachId)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Progress!A:D",
  })

  const rows = res.data.values || []
  if (rows.length <= 1) return []

  return rows.slice(1).map((row) => ({
    date: row[0] || "",
    weight: row[1] || "",
    measurements: row[2] || "",
    notes: row[3] || "",
  }))
}

export async function addProgressEntry(
  sheetId: string,
  entry: ProgressEntry,
  coachId: string
): Promise<void> {
  const sheets = await getSheetsApi(coachId)
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Progress!A:D",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[entry.date, entry.weight, entry.measurements, entry.notes]],
    },
  })
}

export async function syncCoachPTLibrarySheets(
  sheetId: string,
  coachId: string,
  payload: {
    exercises: Exercise[]
    workouts: Array<PTWorkout & { exercises?: Array<PTWorkoutExercise & { exercise?: Exercise | null }> }>
    programs: Array<PTProgram & { sessions?: PTProgramSession[] }>
  }
) {
  await ensureSpreadsheetTabs(
    sheetId,
    ["PT_Exercises", "PT_Workouts", "PT_Workout_Exercises", "PT_Programs", "PT_Program_Sessions"],
    coachId
  )

  const workoutExerciseRows = payload.workouts.flatMap((workout) =>
    (workout.exercises ?? []).map((exercise) => [
      exercise.id,
      workout.id,
      workout.name,
      exercise.sort_order,
      exercise.block_label ?? "",
      exercise.exercise_id ?? "",
      exercise.exercise?.name ?? "",
      exercise.prescription_type,
      exercise.sets ?? "",
      exercise.reps ?? "",
      exercise.rep_range_min ?? "",
      exercise.rep_range_max ?? "",
      exercise.duration_seconds ?? "",
      exercise.distance_value ?? "",
      exercise.distance_unit ?? "",
      exercise.rest_seconds ?? "",
      exercise.tempo ?? "",
      exercise.load_guidance ?? "",
      exercise.rpe_target ?? "",
      exercise.notes ?? "",
    ])
  )

  const programSessionRows = payload.programs.flatMap((program) =>
    (program.sessions ?? []).map((session) => [
      session.id,
      program.id,
      program.name,
      session.week_number,
      session.day_number,
      session.sort_order,
      session.session_name,
      session.workout_id ?? "",
      "",
      session.focus ?? "",
      session.notes ?? "",
      session.updated_at,
    ])
  )

  await overwriteTab(
    sheetId,
    "PT_Exercises",
    [
      ["exercise_id", "name", "category", "movement_pattern", "primary_muscles", "secondary_muscles", "equipment", "difficulty", "default_units", "description", "coaching_notes", "demo_url", "is_archived", "updated_at"],
      ...payload.exercises.map((exercise) => [
        exercise.id,
        exercise.name,
        exercise.category,
        exercise.movement_pattern ?? "",
        exercise.primary_muscles ?? "",
        exercise.secondary_muscles ?? "",
        exercise.equipment ?? "",
        exercise.difficulty ?? "",
        exercise.default_units ?? "",
        exercise.description ?? "",
        exercise.coaching_notes ?? "",
        exercise.media_url ?? "",
        exercise.is_archived ?? false,
        exercise.updated_at,
      ]),
    ],
    coachId
  )

  await overwriteTab(
    sheetId,
    "PT_Workouts",
    [
      ["workout_id", "name", "description", "goal", "estimated_duration_minutes", "difficulty", "is_template", "updated_at"],
      ...payload.workouts.map((workout) => [
        workout.id,
        workout.name,
        workout.description ?? "",
        workout.goal ?? "",
        workout.estimated_duration_minutes ?? "",
        workout.difficulty ?? "",
        workout.is_template ?? true,
        workout.updated_at,
      ]),
    ],
    coachId
  )

  await overwriteTab(
    sheetId,
    "PT_Workout_Exercises",
    [
      ["workout_exercise_id", "workout_id", "workout_name", "sort_order", "block_label", "exercise_id", "exercise_name", "prescription_type", "sets", "reps", "rep_range_min", "rep_range_max", "duration_seconds", "distance_value", "distance_unit", "rest_seconds", "tempo", "load_guidance", "rpe_target", "notes"],
      ...workoutExerciseRows,
    ],
    coachId
  )

  await overwriteTab(
    sheetId,
    "PT_Programs",
    [
      ["program_id", "name", "version_label", "description", "goal", "duration_weeks", "difficulty", "progression_mode", "progression_notes", "is_template", "is_archived", "updated_at"],
      ...payload.programs.map((program) => [
        program.id,
        program.name,
        program.version_label ?? "v1",
        program.description ?? "",
        program.goal ?? "",
        program.duration_weeks ?? "",
        program.difficulty ?? "",
        program.progression_mode ?? "manual",
        program.progression_notes ?? "",
        program.is_template ?? true,
        program.is_archived ?? false,
        program.updated_at,
      ]),
    ],
    coachId
  )

  await overwriteTab(
    sheetId,
    "PT_Program_Sessions",
    [
      ["program_session_id", "program_id", "program_name", "week_number", "day_number", "sort_order", "session_name", "workout_id", "workout_name", "focus", "notes", "updated_at"],
      ...programSessionRows,
    ],
    coachId
  )
}

export async function syncClientPTSheets(
  sheetId: string,
  coachId: string,
  payload: {
    assignment: ClientPTProgramAssignment | null
    sessions: ClientPTSession[]
    sessionExercises: ClientPTSessionExercise[]
    logs: ClientPTLog[]
    logExercises: ClientPTLogExercise[]
  }
) {
  await ensureSpreadsheetTabs(
    sheetId,
    ["Training_Plan", "Training_Plan_Exercises", "Workout_Log", "Workout_Log_Exercises"],
    coachId
  )

  const sessionNameById = new Map(payload.sessions.map((session) => [session.id, session.session_name]))
  const logBySessionId = new Map(payload.logs.map((log) => [log.client_session_id, log]))
  const logExerciseRows = payload.logExercises.map((exercise) => [
    exercise.id,
    exercise.pt_log_id,
    sessionNameById.get(payload.logs.find((log) => log.id === exercise.pt_log_id)?.client_session_id ?? "") ?? "",
    exercise.client_session_exercise_id ?? "",
    exercise.exercise_id ?? "",
    exercise.exercise_name_snapshot,
    exercise.set_number,
    exercise.target_reps ?? "",
    exercise.completed_reps ?? "",
    exercise.weight_value ?? "",
    exercise.weight_unit ?? "",
    exercise.duration_seconds ?? "",
    exercise.distance_value ?? "",
    exercise.distance_unit ?? "",
    exercise.rpe ?? "",
    exercise.notes ?? "",
    exercise.updated_at,
  ])

  await overwriteTab(
    sheetId,
    "Training_Plan",
    [
      ["client_session_id", "assignment_id", "program_id", "program_name", "week_number", "day_number", "sort_order", "session_name", "workout_id", "workout_name", "scheduled_date", "status", "coach_note", "completed_at", "updated_at"],
      ...payload.sessions.map((session) => [
        session.id,
        session.assignment_id,
        session.program_id ?? "",
        payload.assignment?.program_name_snapshot ?? "",
        session.week_number,
        session.day_number,
        session.sort_order,
        session.session_name,
        session.workout_id ?? "",
        session.session_name,
        session.scheduled_date ?? "",
        session.status,
        session.coach_note ?? "",
        session.completed_at ?? "",
        session.updated_at,
      ]),
    ],
    coachId
  )

  await overwriteTab(
    sheetId,
    "Training_Plan_Exercises",
    [
      ["client_session_exercise_id", "client_session_id", "session_name", "sort_order", "block_label", "exercise_id", "exercise_name", "prescription_type", "sets", "reps", "rep_range_min", "rep_range_max", "duration_seconds", "distance_value", "distance_unit", "rest_seconds", "tempo", "load_guidance", "rpe_target", "notes", "updated_at"],
      ...payload.sessionExercises.map((exercise) => [
        exercise.id,
        exercise.client_session_id,
        sessionNameById.get(exercise.client_session_id) ?? "",
        exercise.sort_order,
        exercise.block_label ?? "",
        exercise.exercise_id ?? "",
        exercise.exercise_name_snapshot,
        exercise.prescription_type,
        exercise.sets ?? "",
        exercise.reps ?? "",
        exercise.rep_range_min ?? "",
        exercise.rep_range_max ?? "",
        exercise.duration_seconds ?? "",
        exercise.distance_value ?? "",
        exercise.distance_unit ?? "",
        exercise.rest_seconds ?? "",
        exercise.tempo ?? "",
        exercise.load_guidance ?? "",
        exercise.rpe_target ?? "",
        exercise.notes ?? "",
        exercise.updated_at,
      ]),
    ],
    coachId
  )

  await overwriteTab(
    sheetId,
    "Workout_Log",
    [
      ["pt_log_id", "client_session_id", "assignment_id", "program_name", "session_name", "logged_at", "completion_status", "session_rpe", "energy_rating", "client_feedback", "coach_follow_up_note", "updated_at"],
      ...payload.logs.map((log) => [
        log.id,
        log.client_session_id,
        payload.assignment?.id ?? "",
        payload.assignment?.program_name_snapshot ?? "",
        sessionNameById.get(log.client_session_id) ?? "",
        log.logged_at,
        log.completion_status,
        log.session_rpe ?? "",
        log.energy_rating ?? "",
        log.client_feedback ?? "",
        logBySessionId.get(log.client_session_id)?.coach_follow_up_note ?? "",
        log.updated_at,
      ]),
    ],
    coachId
  )

  await overwriteTab(
    sheetId,
    "Workout_Log_Exercises",
    [
      ["pt_log_exercise_id", "pt_log_id", "session_name", "client_session_exercise_id", "exercise_id", "exercise_name", "set_number", "target_reps", "completed_reps", "weight_value", "weight_unit", "duration_seconds", "distance_value", "distance_unit", "rpe", "notes", "updated_at"],
      ...logExerciseRows,
    ],
    coachId
  )
}

export async function syncCoachNutritionLibrarySheets(
  sheetId: string,
  coachId: string,
  payload: {
    recipes: NutritionRecipe[]
    templates: Array<NutritionMealPlanTemplate & { days?: NutritionMealPlanTemplateDay[] }>
    habits: NutritionHabitTemplate[]
  }
) {
  await ensureSpreadsheetTabs(
    sheetId,
    ["Recipe Library", "Nutrition_Templates", "Nutrition_Template_Days", "Nutrition_Habit_Templates"],
    coachId
  )

  await overwriteTab(
    sheetId,
    "Recipe Library",
    [
      ["recipe_id", "name", "category", "ingredients", "notes", "calories_kcal", "protein_grams", "carbs_grams", "fats_grams", "meal_slot"],
      ...payload.recipes.map((recipe) => [
        recipe.id,
        recipe.name,
        recipe.category,
        recipe.ingredients ?? "",
        recipe.notes ?? "",
        recipe.calories_kcal ?? "",
        recipe.protein_grams ?? "",
        recipe.carbs_grams ?? "",
        recipe.fats_grams ?? "",
        recipe.meal_slot,
      ]),
    ],
    coachId
  )

  await overwriteTab(
    sheetId,
    "Nutrition_Templates",
    [
      ["template_id", "name", "description", "goal", "target_calories_kcal", "target_protein_grams", "target_carbs_grams", "target_fats_grams", "updated_at"],
      ...payload.templates.map((template) => [
        template.id,
        template.name,
        template.description ?? "",
        template.goal ?? "",
        template.target_calories_kcal ?? "",
        template.target_protein_grams ?? "",
        template.target_carbs_grams ?? "",
        template.target_fats_grams ?? "",
        template.updated_at,
      ]),
    ],
    coachId
  )

  await overwriteTab(
    sheetId,
    "Nutrition_Template_Days",
    [
      ["template_day_id", "template_id", "day", "breakfast", "lunch", "dinner", "snacks", "notes"],
      ...payload.templates.flatMap((template) =>
        (template.days ?? []).map((day) => [
          day.id,
          template.id,
          day.day,
          day.breakfast ?? "",
          day.lunch ?? "",
          day.dinner ?? "",
          day.snacks ?? "",
          day.notes ?? "",
        ])
      ),
    ],
    coachId
  )

  await overwriteTab(
    sheetId,
    "Nutrition_Habit_Templates",
    [
      ["habit_template_id", "name", "category", "target_count", "target_period", "meal_slot", "description", "coaching_notes", "updated_at"],
      ...payload.habits.map((habit) => [
        habit.id,
        habit.name,
        habit.category,
        habit.target_count,
        habit.target_period,
        habit.meal_slot,
        habit.description ?? "",
        habit.coaching_notes ?? "",
        habit.updated_at,
      ]),
    ],
    coachId
  )
}

export async function syncClientNutritionHabitSheets(
  sheetId: string,
  coachId: string,
  habits: ClientNutritionHabitAssignment[],
  habitLogs: ClientNutritionHabitLog[] = [],
  checkIns: ClientNutritionCheckIn[] = [],
  logs: ClientNutritionLogEntry[] = []
) {
  await ensureSpreadsheetTabs(
    sheetId,
    ["Nutrition_Habits", "Nutrition_Habit_Log", "Nutrition_Check_Ins", "Nutrition_Log"],
    coachId
  )

  await overwriteTab(
    sheetId,
    "Nutrition_Habits",
    [
      ["assignment_id", "habit_template_id", "habit_name", "category", "target_count", "target_period", "meal_slot", "assigned_start_date", "status", "coaching_notes"],
      ...habits.map((habit) => [
        habit.id,
        habit.habit_template_id ?? "",
        habit.habit_name_snapshot,
        habit.category_snapshot,
        habit.target_count,
        habit.target_period,
        habit.meal_slot,
        habit.assigned_start_date ?? "",
        habit.status,
        habit.coaching_notes ?? "",
      ]),
    ],
    coachId
  )

  await overwriteTab(
    sheetId,
    "Nutrition_Habit_Log",
    [
      ["habit_log_id", "assignment_id", "habit_name", "completion_date", "completion_status", "adherence_score", "notes", "coach_note", "logged_at"],
      ...habitLogs.map((log) => [
        log.id,
        log.assignment_id,
        habits.find((habit) => habit.id === log.assignment_id)?.habit_name_snapshot ?? "",
        log.completion_date,
        log.completion_status,
        log.adherence_score ?? "",
        log.notes ?? "",
        log.coach_note ?? "",
        log.logged_at,
      ]),
    ],
    coachId
  )

  await overwriteTab(
    sheetId,
    "Nutrition_Check_Ins",
    [
      ["check_in_id", "submitted_at", "week_label", "adherence_score", "energy_score", "hunger_score", "digestion_score", "sleep_score", "wins", "struggles"],
      ...checkIns.map((checkIn) => [
        checkIn.id,
        checkIn.submitted_at,
        checkIn.week_label ?? "",
        checkIn.adherence_score ?? "",
        checkIn.energy_score ?? "",
        checkIn.hunger_score ?? "",
        checkIn.digestion_score ?? "",
        checkIn.sleep_score ?? "",
        checkIn.wins ?? "",
        checkIn.struggles ?? "",
      ]),
    ],
    coachId
  )

  await overwriteTab(
    sheetId,
    "Nutrition_Log",
    [
      ["log_id", "logged_at", "meal_slot", "entry_title", "notes", "adherence_flag", "hunger_score", "coach_note"],
      ...logs.map((log) => [
        log.id,
        log.logged_at,
        log.meal_slot,
        log.entry_title,
        log.notes ?? "",
        log.adherence_flag,
        log.hunger_score ?? "",
        log.coach_note ?? "",
      ]),
    ],
    coachId
  )
}
