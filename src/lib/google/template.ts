import { google } from "googleapis"
import { getAuthedClient } from "./auth"
import { PLATFORM_NAME } from "@/lib/platform"
import type { OnboardingData } from "@/types"
import {
  COACH_TYPE_LABELS,
  MODULE_LABELS,
  type CoachTypePreset,
  type EnableableModule,
} from "@/lib/modules"

const ROOT_FOLDER_NAME = `${PLATFORM_NAME} Workspace`
const CONTROL_WORKBOOK_NAME = `${PLATFORM_NAME} Workspace Control`
const CLIENTS_FOLDER_NAME = "Clients"
const PT_LIBRARY_WORKBOOK_NAME = `${PLATFORM_NAME} PT Library`
const NUTRITION_LIBRARY_WORKBOOK_NAME = `${PLATFORM_NAME} Nutrition Library`
const WELLNESS_LIBRARY_WORKBOOK_NAME = `${PLATFORM_NAME} Wellness Library`

type DriveFileRef = {
  id: string
  url: string
}

type CoachWorkspaceMetadata = {
  managed_workspace_sheet_id?: string | null
  managed_workspace_sheet_url?: string | null
  managed_workspace_root_folder_id?: string | null
  managed_workspace_root_folder_url?: string | null
  managed_clients_folder_id?: string | null
  managed_clients_folder_url?: string | null
  managed_pt_library_sheet_id?: string | null
  managed_pt_library_sheet_url?: string | null
  managed_nutrition_library_sheet_id?: string | null
  managed_nutrition_library_sheet_url?: string | null
  managed_wellness_library_sheet_id?: string | null
  managed_wellness_library_sheet_url?: string | null
}

type CoachWorkspaceProvisionResult = CoachWorkspaceMetadata & {
  createdAny: boolean
}

export type CoachDriveWorkspaceHealth = {
  status: "healthy" | "missing" | "not_provisioned" | "disconnected"
  missingArtifacts: string[]
}

type ClientWorkspaceMetadata = {
  sheet_id?: string | null
  drive_folder_id?: string | null
  drive_folder_url?: string | null
  sheet_shared_email?: string | null
  sheet_shared_permission_id?: string | null
  sheet_shared_at?: string | null
}

type ClientWorkspaceProvisionResult = ClientWorkspaceMetadata & {
  sheetId: string
  sheetUrl: string
  driveFolderId: string
  driveFolderUrl: string
  shared: boolean
  coachWorkspace: CoachWorkspaceMetadata
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

function spreadsheetUrl(fileId: string) {
  return `https://docs.google.com/spreadsheets/d/${fileId}/edit`
}

function folderUrl(fileId: string) {
  return `https://drive.google.com/drive/folders/${fileId}`
}

async function lookupDriveFileById(
  drive: ReturnType<typeof google.drive>,
  fileId: string | null | undefined
) {
  if (!fileId) {
    return null
  }

  try {
    const file = await drive.files.get({
      fileId,
      fields: "id, mimeType, webViewLink, trashed, parents",
    })

    if (!file.data.id || file.data.trashed) {
      return null
    }

    return {
      id: file.data.id,
      parents: file.data.parents ?? [],
      url:
        file.data.webViewLink
        || (file.data.mimeType === "application/vnd.google-apps.folder"
          ? folderUrl(file.data.id)
          : spreadsheetUrl(file.data.id)),
    }
  } catch {
    return null
  }
}

async function findDriveFileByName(
  drive: ReturnType<typeof google.drive>,
  {
    name,
    mimeType,
    parentId,
  }: {
    name: string
    mimeType: string
    parentId?: string | null
  }
) {
  const parentClause = parentId ? ` and '${escapeDriveQueryValue(parentId)}' in parents` : ""
  const fileSearch = await drive.files.list({
    q: `name = '${escapeDriveQueryValue(name)}' and mimeType = '${mimeType}' and trashed = false${parentClause}`,
    fields: "files(id, webViewLink)",
    orderBy: "createdTime",
    pageSize: 1,
  })

  const file = fileSearch.data.files?.[0]
  if (!file?.id) {
    return null
  }

  return {
    id: file.id,
    url:
      file.webViewLink
      || (mimeType === "application/vnd.google-apps.folder" ? folderUrl(file.id) : spreadsheetUrl(file.id)),
  }
}

async function createDriveFile(
  drive: ReturnType<typeof google.drive>,
  {
    name,
    mimeType,
    parentId,
  }: {
    name: string
    mimeType: string
    parentId?: string | null
  }
) {
  const file = await drive.files.create({
    requestBody: {
      name,
      mimeType,
      ...(parentId ? { parents: [parentId] } : {}),
    },
    fields: "id, webViewLink",
  })

  const fileId = file.data.id
  if (!fileId) {
    throw new Error(`Failed to create ${name} in Google Drive.`)
  }

  return {
    id: fileId,
    url:
      file.data.webViewLink
      || (mimeType === "application/vnd.google-apps.folder" ? folderUrl(fileId) : spreadsheetUrl(fileId)),
  }
}

async function ensureDriveFolder(
  drive: ReturnType<typeof google.drive>,
  {
    folderName,
    parentId,
    existingId,
  }: {
    folderName: string
    parentId?: string | null
    existingId?: string | null
  }
) {
  const existing = await lookupDriveFileById(drive, existingId)
  if (existing) {
    if (parentId && !existing.parents.includes(parentId)) {
      const moved = await drive.files.update({
        fileId: existing.id,
        addParents: parentId,
        removeParents: existing.parents.join(","),
        fields: "id, webViewLink, parents",
      })

      return {
        id: moved.data.id ?? existing.id,
        url: moved.data.webViewLink || folderUrl(moved.data.id ?? existing.id),
        parents: moved.data.parents ?? [parentId],
        created: false,
        moved: true,
      }
    }

    return { ...existing, created: false, moved: false }
  }

  const found = await findDriveFileByName(drive, {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    parentId,
  })
  if (found) {
    return { ...found, created: false }
  }

  const created = await createDriveFile(drive, {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    parentId,
  })
  return { ...created, parents: parentId ? [parentId] : [], created: true, moved: false }
}

async function ensureSpreadsheetFile(
  drive: ReturnType<typeof google.drive>,
  {
    fileName,
    parentId,
    existingId,
  }: {
    fileName: string
    parentId: string
    existingId?: string | null
  }
) {
  const existing = await lookupDriveFileById(drive, existingId)
  if (existing) {
    if (!existing.parents.includes(parentId)) {
      const moved = await drive.files.update({
        fileId: existing.id,
        addParents: parentId,
        removeParents: existing.parents.join(","),
        fields: "id, webViewLink, parents",
      })

      return {
        id: moved.data.id ?? existing.id,
        url: moved.data.webViewLink || spreadsheetUrl(moved.data.id ?? existing.id),
        parents: moved.data.parents ?? [parentId],
        created: false,
        moved: true,
      }
    }

    return { ...existing, created: false, moved: false }
  }

  const found = await findDriveFileByName(drive, {
    name: fileName,
    mimeType: "application/vnd.google-apps.spreadsheet",
    parentId,
  })
  if (found) {
    return { ...found, created: false }
  }

  const created = await createDriveFile(drive, {
    name: fileName,
    mimeType: "application/vnd.google-apps.spreadsheet",
    parentId,
  })
  return { ...created, parents: [parentId], created: true, moved: false }
}

async function getSheetTitles(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
) {
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  })

  return new Set(
    (spreadsheet.data.sheets ?? [])
      .map((sheet) => sheet.properties?.title)
      .filter((title): title is string => Boolean(title))
  )
}

async function ensureSpreadsheetTabs(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  tabTitles: string[]
) {
  const existingTitles = await getSheetTitles(sheets, spreadsheetId)
  const addSheetRequests = tabTitles
    .filter((title) => !existingTitles.has(title))
    .map((title) => ({
      addSheet: {
        properties: {
          title,
        },
      },
    }))

  if (addSheetRequests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: addSheetRequests,
      },
    })
  }
}

async function updateValues(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  range: string,
  values: string[][]
) {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values,
    },
  })
}

async function ensureControlWorkbookContent(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  {
    coachTypePreset,
    activeModules,
  }: {
    coachTypePreset: CoachTypePreset | null
    activeModules: EnableableModule[]
  }
) {
  const moduleTitles = activeModules.map((module) => MODULE_LABELS[module])
  await ensureSpreadsheetTabs(sheets, spreadsheetId, [
    "Workspace Guide",
    "Module Catalog",
    "Client Index",
  ])

  await updateValues(sheets, spreadsheetId, "Workspace Guide!A1:B8", [
    ["Status", "Provisioned"],
    ["Coach preset", coachTypePreset ? COACH_TYPE_LABELS[coachTypePreset] : "Legacy workspace"],
    ["Active modules", moduleTitles.join(", ") || "Shared core only"],
    ["Control workbook role", "Workspace control plane only"],
    ["Client data location", "Client-specific records live in per-client workbooks"],
    ["Coach library location", "Coach-scoped libraries live in separate private workbooks"],
    ["Provisioning rule", "Chameleon reuses this workspace and creates client folders/workbooks on demand"],
    ["Source of truth", "Chameleon-managed Google files in the coach-owned Drive workspace"],
  ])

  await updateValues(sheets, spreadsheetId, `Module Catalog!A1:D${activeModules.length + 2}`, [
    ["Module", "Status", "Scope", "Notes"],
    ["Shared Core", "Enabled", "Workspace + client", "Base workspace surfaces and client workbooks"],
    ...activeModules.map((module) => [
      MODULE_LABELS[module],
      "Enabled",
      "Coach library",
      module === "pt_core"
        ? "Separate PT library workbook provisioned when active"
        : module === "nutrition_core"
          ? "Separate nutrition library workbook provisioned when active"
          : "Separate wellness library workbook provisioned when active",
    ]),
  ])

  await updateValues(sheets, spreadsheetId, "Client Index!A1:F2", [
    ["Client ID", "Client Name", "Client Email", "Folder URL", "Workbook URL", "Sharing Status"],
    ["", "", "", "", "", ""],
  ])
}

async function ensurePtLibraryWorkbookContent(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
) {
  await ensureSpreadsheetTabs(sheets, spreadsheetId, [
    "Exercise Library",
    "PT_Exercises",
    "PT_Workouts",
    "PT_Workout_Exercises",
    "PT_Programs",
    "PT_Program_Sessions",
  ])
  await updateValues(sheets, spreadsheetId, "Exercise Library!A1:E2", [
    ["Name", "Category", "Description", "Coaching Notes", "Media URL"],
    ["", "", "", "", ""],
  ])
  await updateValues(sheets, spreadsheetId, "PT_Exercises!A1:N2", [
    ["exercise_id", "name", "category", "movement_pattern", "primary_muscles", "secondary_muscles", "equipment", "difficulty", "default_units", "description", "coaching_notes", "demo_url", "is_archived", "updated_at"],
    ["", "", "", "", "", "", "", "", "", "", "", "", "", ""],
  ])
  await updateValues(sheets, spreadsheetId, "PT_Workouts!A1:H2", [
    ["workout_id", "name", "description", "goal", "estimated_duration_minutes", "difficulty", "is_template", "updated_at"],
    ["", "", "", "", "", "", "", ""],
  ])
  await updateValues(sheets, spreadsheetId, "PT_Workout_Exercises!A1:T2", [
    ["workout_exercise_id", "workout_id", "workout_name", "sort_order", "block_label", "exercise_id", "exercise_name", "prescription_type", "sets", "reps", "rep_range_min", "rep_range_max", "duration_seconds", "distance_value", "distance_unit", "rest_seconds", "tempo", "load_guidance", "rpe_target", "notes"],
    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
  ])
  await updateValues(sheets, spreadsheetId, "PT_Programs!A1:L2", [
    ["program_id", "name", "version_label", "description", "goal", "duration_weeks", "difficulty", "progression_mode", "progression_notes", "is_template", "is_archived", "updated_at"],
    ["", "", "", "", "", "", "", "", "", "", "", ""],
  ])
  await updateValues(sheets, spreadsheetId, "PT_Program_Sessions!A1:L2", [
    ["program_session_id", "program_id", "program_name", "week_number", "day_number", "sort_order", "session_name", "workout_id", "workout_name", "focus", "notes", "updated_at"],
    ["", "", "", "", "", "", "", "", "", "", "", ""],
  ])
}

async function ensureNutritionLibraryWorkbookContent(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
) {
  await ensureSpreadsheetTabs(sheets, spreadsheetId, [
    "Recipe Library",
    "Nutrition_Templates",
    "Nutrition_Template_Days",
    "Nutrition_Habit_Templates",
  ])
  await updateValues(sheets, spreadsheetId, "Recipe Library!A1:J2", [
    ["recipe_id", "name", "category", "ingredients", "notes", "calories_kcal", "protein_grams", "carbs_grams", "fats_grams", "meal_slot"],
    ["", "", "", "", "", "", "", "", "", ""],
  ])
  await updateValues(sheets, spreadsheetId, "Nutrition_Templates!A1:I2", [
    ["template_id", "name", "description", "goal", "target_calories_kcal", "target_protein_grams", "target_carbs_grams", "target_fats_grams", "updated_at"],
    ["", "", "", "", "", "", "", "", ""],
  ])
  await updateValues(sheets, spreadsheetId, "Nutrition_Template_Days!A1:H2", [
    ["template_day_id", "template_id", "day", "breakfast", "lunch", "dinner", "snacks", "notes"],
    ["", "", "", "", "", "", "", ""],
  ])
  await updateValues(sheets, spreadsheetId, "Nutrition_Habit_Templates!A1:I2", [
    ["habit_template_id", "name", "category", "target_count", "target_period", "meal_slot", "description", "coaching_notes", "updated_at"],
    ["", "", "", "", "", "", "", "", ""],
  ])
}

async function ensureWellnessLibraryWorkbookContent(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
) {
  await ensureSpreadsheetTabs(sheets, spreadsheetId, [
    "Wellness_Goals",
    "Wellness_Habits",
  ])
  await updateValues(sheets, spreadsheetId, "Wellness_Goals!A1:H2", [
    ["goal_template_id", "name", "category", "description", "target_metric", "target_value", "milestone_label", "coaching_notes"],
    ["", "", "", "", "", "", "", ""],
  ])
  await updateValues(sheets, spreadsheetId, "Wellness_Habits!A1:G2", [
    ["habit_template_id", "name", "category", "description", "target_count", "target_period", "coaching_notes"],
    ["", "", "", "", "", "", ""],
  ])
}

async function ensureClientWorkbookContent(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  {
    clientEmail,
    onboarding,
    activeModules,
  }: {
    clientEmail: string
    onboarding: OnboardingData
    activeModules: EnableableModule[]
  }
) {
  const clientTabs = ["Profile", "Meal Plan", "Progress"]
  if (activeModules.includes("nutrition_core")) {
    clientTabs.push("Nutrition_Habits", "Nutrition_Habit_Log", "Nutrition_Check_Ins", "Nutrition_Log")
  }
  if (activeModules.includes("pt_core")) {
    clientTabs.push("Training_Plan", "Training_Plan_Exercises", "Workout_Log", "Workout_Log_Exercises")
  }
  if (activeModules.includes("wellness_core")) {
    clientTabs.push(
      "Wellness_Goals",
      "Wellness_Habits",
      "Wellness_Habit_Log",
      "Wellness_Check_Ins",
      "Wellness_Session_Notes"
    )
  }
  await ensureSpreadsheetTabs(sheets, spreadsheetId, clientTabs)

  await updateValues(sheets, spreadsheetId, "Profile!A1:B12", [
    ["Name", onboarding.name],
    ["Email", clientEmail],
    ["Age", String(onboarding.age)],
    ["Gender", onboarding.gender],
    ["Height", onboarding.height],
    ["Current weight", onboarding.current_weight],
    ["Goal weight", onboarding.goal_weight],
    ["Fitness goals", onboarding.fitness_goals],
    ["Dietary restrictions", onboarding.dietary_restrictions],
    ["Health conditions", onboarding.health_conditions],
    ["Activity level", onboarding.activity_level.replace(/_/g, " ")],
    ["Notes", onboarding.notes],
  ])

  await updateValues(sheets, spreadsheetId, "Meal Plan!A1:E8", [
    ["Day", "Breakfast", "Lunch", "Dinner", "Snacks"],
    ["Monday", "", "", "", ""],
    ["Tuesday", "", "", "", ""],
    ["Wednesday", "", "", "", ""],
    ["Thursday", "", "", "", ""],
    ["Friday", "", "", "", ""],
    ["Saturday", "", "", "", ""],
    ["Sunday", "", "", "", ""],
  ])

  await updateValues(sheets, spreadsheetId, "Progress!A1:D1", [
    ["Date", "Weight", "Measurements", "Notes"],
  ])

  if (activeModules.includes("nutrition_core")) {
    await updateValues(sheets, spreadsheetId, "Nutrition_Habits!A1:J2", [
      ["assignment_id", "habit_template_id", "habit_name", "category", "target_count", "target_period", "meal_slot", "assigned_start_date", "status", "coaching_notes"],
      ["", "", "", "", "", "", "", "", "", ""],
    ])
    await updateValues(sheets, spreadsheetId, "Nutrition_Habit_Log!A1:I2", [
      ["habit_log_id", "assignment_id", "habit_name", "completion_date", "completion_status", "adherence_score", "notes", "coach_note", "logged_at"],
      ["", "", "", "", "", "", "", "", ""],
    ])
    await updateValues(sheets, spreadsheetId, "Nutrition_Check_Ins!A1:J2", [
      ["check_in_id", "submitted_at", "week_label", "adherence_score", "energy_score", "hunger_score", "digestion_score", "sleep_score", "wins", "struggles"],
      ["", "", "", "", "", "", "", "", "", ""],
    ])
    await updateValues(sheets, spreadsheetId, "Nutrition_Log!A1:H2", [
      ["log_id", "logged_at", "meal_slot", "entry_title", "notes", "adherence_flag", "hunger_score", "coach_note"],
      ["", "", "", "", "", "", "", ""],
    ])
  }

  if (activeModules.includes("pt_core")) {
    await updateValues(sheets, spreadsheetId, "Training_Plan!A1:O2", [
      ["client_session_id", "assignment_id", "program_id", "program_name", "week_number", "day_number", "sort_order", "session_name", "workout_id", "workout_name", "scheduled_date", "status", "coach_note", "completed_at", "updated_at"],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ])
    await updateValues(sheets, spreadsheetId, "Training_Plan_Exercises!A1:U2", [
      ["client_session_exercise_id", "client_session_id", "session_name", "sort_order", "block_label", "exercise_id", "exercise_name", "prescription_type", "sets", "reps", "rep_range_min", "rep_range_max", "duration_seconds", "distance_value", "distance_unit", "rest_seconds", "tempo", "load_guidance", "rpe_target", "notes", "updated_at"],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ])
    await updateValues(sheets, spreadsheetId, "Workout_Log!A1:L2", [
      ["pt_log_id", "client_session_id", "assignment_id", "program_name", "session_name", "logged_at", "completion_status", "session_rpe", "energy_rating", "client_feedback", "coach_follow_up_note", "updated_at"],
      ["", "", "", "", "", "", "", "", "", "", "", ""],
    ])
    await updateValues(sheets, spreadsheetId, "Workout_Log_Exercises!A1:Q2", [
      ["pt_log_exercise_id", "pt_log_id", "client_session_id", "client_session_exercise_id", "exercise_id", "exercise_name", "set_number", "target_reps", "completed_reps", "weight_value", "weight_unit", "duration_seconds", "distance_value", "distance_unit", "rpe", "notes", "logged_at"],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ])
  }

  if (activeModules.includes("wellness_core")) {
    await updateValues(sheets, spreadsheetId, "Wellness_Goals!A1:J2", [
      ["assignment_id", "goal_template_id", "goal_name", "category", "target_metric", "target_value", "milestone_label", "assigned_start_date", "status", "coaching_notes"],
      ["", "", "", "", "", "", "", "", "", ""],
    ])
    await updateValues(sheets, spreadsheetId, "Wellness_Habits!A1:I2", [
      ["assignment_id", "habit_template_id", "habit_name", "category", "target_count", "target_period", "assigned_start_date", "status", "coaching_notes"],
      ["", "", "", "", "", "", "", "", ""],
    ])
    await updateValues(sheets, spreadsheetId, "Wellness_Habit_Log!A1:I2", [
      ["habit_log_id", "assignment_id", "habit_name", "completion_date", "completion_status", "adherence_score", "notes", "coach_note", "logged_at"],
      ["", "", "", "", "", "", "", "", ""],
    ])
    await updateValues(sheets, spreadsheetId, "Wellness_Check_Ins!A1:J2", [
      ["check_in_id", "submitted_at", "week_label", "energy_score", "stress_score", "sleep_score", "confidence_score", "wins", "blockers", "focus_for_next_week"],
      ["", "", "", "", "", "", "", "", "", ""],
    ])
    await updateValues(sheets, spreadsheetId, "Wellness_Session_Notes!A1:G2", [
      ["session_note_id", "session_date", "session_type", "summary", "client_wins", "priorities", "action_steps"],
      ["", "", "", "", "", "", ""],
    ])
  }
}

async function upsertClientIndexRow(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  {
    clientId,
    clientName,
    clientEmail,
    folderUrl,
    workbookUrl,
    sharingStatus,
  }: {
    clientId: string
    clientName: string
    clientEmail: string
    folderUrl: string
    workbookUrl: string
    sharingStatus: string
  }
) {
  const rows = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Client Index!A:F",
  })

  const values = rows.data.values ?? []
  let rowIndex = values.findIndex((row, index) => index > 0 && row[0] === clientId)
  if (rowIndex === -1) {
    rowIndex = values.length > 1 ? values.length : 1
  }

  const sheetRow = rowIndex + 1
  await updateValues(sheets, spreadsheetId, `Client Index!A${sheetRow}:F${sheetRow}`, [
    [clientId, clientName, clientEmail, folderUrl, workbookUrl, sharingStatus],
  ])
}

async function ensureWriterPermission(
  drive: ReturnType<typeof google.drive>,
  fileId: string,
  email: string,
  existingPermissionId?: string | null
) {
  if (existingPermissionId) {
    try {
      const existing = await drive.permissions.get({
        fileId,
        permissionId: existingPermissionId,
        fields: "id, emailAddress, role, type",
      })

      if (
        existing.data.id
        && existing.data.type === "user"
        && existing.data.emailAddress?.toLowerCase() === email.toLowerCase()
        && (existing.data.role === "writer" || existing.data.role === "owner")
      ) {
        return {
          permissionId: existing.data.id,
          created: false,
        }
      }
    } catch {
      // fall back to listing and/or creating the permission again
    }
  }

  const permissions = await drive.permissions.list({
    fileId,
    fields: "permissions(id,emailAddress,role,type)",
  })

  const existingByEmail = permissions.data.permissions?.find(
    (permission) =>
      permission.type === "user"
      && permission.emailAddress?.toLowerCase() === email.toLowerCase()
      && (permission.role === "writer" || permission.role === "owner")
  )

  if (existingByEmail?.id) {
    return {
      permissionId: existingByEmail.id,
      created: false,
    }
  }

  const created = await drive.permissions.create({
    fileId,
    sendNotificationEmail: true,
    requestBody: {
      type: "user",
      role: "writer",
      emailAddress: email,
    },
    fields: "id",
  })

  if (!created.data.id) {
    throw new Error(`Failed to share Google workbook with ${email}.`)
  }

  return {
    permissionId: created.data.id,
    created: true,
  }
}

function buildClientFolderName(clientId: string, clientName: string) {
  return `${clientName} (${clientId.slice(0, 8)})`
}

function buildClientWorkbookName(clientName: string) {
  return `${PLATFORM_NAME} - ${clientName}`
}

export async function getCoachDriveWorkspaceHealth({
  coachId,
  activeModules,
  settings,
}: {
  coachId: string
  activeModules: EnableableModule[]
  settings?: (CoachWorkspaceMetadata & {
    google_refresh_token?: string | null
    managed_workspace_sheet_modules?: string[] | null
    managed_workspace_sheet_provisioned_at?: string | null
  }) | null
}): Promise<CoachDriveWorkspaceHealth> {
  if (!settings?.google_refresh_token) {
    return {
      status: "disconnected",
      missingArtifacts: [],
    }
  }

  const hasProvisioningMetadata =
    !!settings.managed_workspace_root_folder_id
    && !!settings.managed_workspace_sheet_id
    && !!settings.managed_clients_folder_id
    && !!settings.managed_workspace_sheet_provisioned_at

  if (!hasProvisioningMetadata) {
    return {
      status: "not_provisioned",
      missingArtifacts: [],
    }
  }

  const auth = await getAuthedClient(coachId)
  const drive = google.drive({ version: "v3", auth })
  const missingArtifacts: string[] = []

  const rootFolder = await lookupDriveFileById(drive, settings.managed_workspace_root_folder_id)
  if (!rootFolder) {
    missingArtifacts.push("workspace_root_folder")
  }

  const controlWorkbook = await lookupDriveFileById(drive, settings.managed_workspace_sheet_id)
  if (!controlWorkbook) {
    missingArtifacts.push("workspace_control_workbook")
  }

  const clientsFolder = await lookupDriveFileById(drive, settings.managed_clients_folder_id)
  if (!clientsFolder) {
    missingArtifacts.push("clients_folder")
  }

  if (activeModules.includes("pt_core")) {
    const ptLibrary = await lookupDriveFileById(drive, settings.managed_pt_library_sheet_id)
    if (!ptLibrary) {
      missingArtifacts.push("pt_library_workbook")
    }
  }

  if (activeModules.includes("nutrition_core")) {
    const nutritionLibrary = await lookupDriveFileById(
      drive,
      settings.managed_nutrition_library_sheet_id
    )
    if (!nutritionLibrary) {
      missingArtifacts.push("nutrition_library_workbook")
    }
  }

  if (activeModules.includes("wellness_core")) {
    const wellnessLibrary = await lookupDriveFileById(
      drive,
      settings.managed_wellness_library_sheet_id
    )
    if (!wellnessLibrary) {
      missingArtifacts.push("wellness_library_workbook")
    }
  }

  return {
    status: missingArtifacts.length > 0 ? "missing" : "healthy",
    missingArtifacts,
  }
}

export async function ensureCoachDriveWorkspace({
  coachId,
  coachTypePreset,
  activeModules,
  existing,
}: {
  coachId: string
  coachTypePreset: CoachTypePreset | null
  activeModules: EnableableModule[]
  existing?: CoachWorkspaceMetadata | null
}): Promise<CoachWorkspaceProvisionResult> {
  const auth = await getAuthedClient(coachId)
  const sheets = google.sheets({ version: "v4", auth })
  const drive = google.drive({ version: "v3", auth })

  let createdAny = false

  const rootFolder = await ensureDriveFolder(drive, {
    folderName: ROOT_FOLDER_NAME,
    parentId: "root",
    existingId: existing?.managed_workspace_root_folder_id,
  })
  createdAny = createdAny || rootFolder.created

  const controlWorkbook = await ensureSpreadsheetFile(drive, {
    fileName: CONTROL_WORKBOOK_NAME,
    parentId: rootFolder.id,
    existingId: existing?.managed_workspace_sheet_id,
  })
  createdAny = createdAny || controlWorkbook.created
  await ensureControlWorkbookContent(sheets, controlWorkbook.id, {
    coachTypePreset,
    activeModules,
  })

  const clientsFolder = await ensureDriveFolder(drive, {
    folderName: CLIENTS_FOLDER_NAME,
    parentId: rootFolder.id,
    existingId: existing?.managed_clients_folder_id,
  })
  createdAny = createdAny || clientsFolder.created

  let ptLibrarySheetId = existing?.managed_pt_library_sheet_id ?? null
  let ptLibrarySheetUrl = existing?.managed_pt_library_sheet_url ?? null
  if (activeModules.includes("pt_core")) {
    const ptLibrary = await ensureSpreadsheetFile(drive, {
      fileName: PT_LIBRARY_WORKBOOK_NAME,
      parentId: rootFolder.id,
      existingId: existing?.managed_pt_library_sheet_id,
    })
    createdAny = createdAny || ptLibrary.created
    await ensurePtLibraryWorkbookContent(sheets, ptLibrary.id)
    ptLibrarySheetId = ptLibrary.id
    ptLibrarySheetUrl = ptLibrary.url
  }

  let nutritionLibrarySheetId = existing?.managed_nutrition_library_sheet_id ?? null
  let nutritionLibrarySheetUrl = existing?.managed_nutrition_library_sheet_url ?? null
  if (activeModules.includes("nutrition_core")) {
    const nutritionLibrary = await ensureSpreadsheetFile(drive, {
      fileName: NUTRITION_LIBRARY_WORKBOOK_NAME,
      parentId: rootFolder.id,
      existingId: existing?.managed_nutrition_library_sheet_id,
    })
    createdAny = createdAny || nutritionLibrary.created
    await ensureNutritionLibraryWorkbookContent(sheets, nutritionLibrary.id)
    nutritionLibrarySheetId = nutritionLibrary.id
    nutritionLibrarySheetUrl = nutritionLibrary.url
  }

  let wellnessLibrarySheetId = existing?.managed_wellness_library_sheet_id ?? null
  let wellnessLibrarySheetUrl = existing?.managed_wellness_library_sheet_url ?? null
  if (activeModules.includes("wellness_core")) {
    const wellnessLibrary = await ensureSpreadsheetFile(drive, {
      fileName: WELLNESS_LIBRARY_WORKBOOK_NAME,
      parentId: rootFolder.id,
      existingId: existing?.managed_wellness_library_sheet_id,
    })
    createdAny = createdAny || wellnessLibrary.created
    await ensureWellnessLibraryWorkbookContent(sheets, wellnessLibrary.id)
    wellnessLibrarySheetId = wellnessLibrary.id
    wellnessLibrarySheetUrl = wellnessLibrary.url
  }

  return {
    createdAny,
    managed_workspace_sheet_id: controlWorkbook.id,
    managed_workspace_sheet_url: controlWorkbook.url,
    managed_workspace_root_folder_id: rootFolder.id,
    managed_workspace_root_folder_url: rootFolder.url,
    managed_clients_folder_id: clientsFolder.id,
    managed_clients_folder_url: clientsFolder.url,
    managed_pt_library_sheet_id: ptLibrarySheetId,
    managed_pt_library_sheet_url: ptLibrarySheetUrl,
    managed_nutrition_library_sheet_id: nutritionLibrarySheetId,
    managed_nutrition_library_sheet_url: nutritionLibrarySheetUrl,
    managed_wellness_library_sheet_id: wellnessLibrarySheetId,
    managed_wellness_library_sheet_url: wellnessLibrarySheetUrl,
  }
}

export async function createCoachWorkspaceSheet({
  coachId,
  coachTypePreset,
  activeModules,
  existing,
}: {
  coachId: string
  coachTypePreset: CoachTypePreset | null
  activeModules: EnableableModule[]
  existing?: CoachWorkspaceMetadata | null
}) {
  const workspace = await ensureCoachDriveWorkspace({
    coachId,
    coachTypePreset,
    activeModules,
    existing,
  })

  return {
    createdAny: workspace.createdAny,
    sheetId: workspace.managed_workspace_sheet_id!,
    sheetUrl: workspace.managed_workspace_sheet_url!,
    rootFolderId: workspace.managed_workspace_root_folder_id!,
    rootFolderUrl: workspace.managed_workspace_root_folder_url!,
    clientsFolderId: workspace.managed_clients_folder_id!,
    clientsFolderUrl: workspace.managed_clients_folder_url!,
    ptLibrarySheetId: workspace.managed_pt_library_sheet_id ?? null,
    ptLibrarySheetUrl: workspace.managed_pt_library_sheet_url ?? null,
    nutritionLibrarySheetId: workspace.managed_nutrition_library_sheet_id ?? null,
    nutritionLibrarySheetUrl: workspace.managed_nutrition_library_sheet_url ?? null,
    wellnessLibrarySheetId: workspace.managed_wellness_library_sheet_id ?? null,
    wellnessLibrarySheetUrl: workspace.managed_wellness_library_sheet_url ?? null,
  }
}

export async function createClientSheet({
  clientId,
  clientName,
  clientEmail,
  onboarding,
  coachId,
  coachTypePreset,
  activeModules,
  coachWorkspace,
  clientWorkspace,
  shareWithClient,
}: {
  clientId: string
  clientName: string
  clientEmail: string
  onboarding: OnboardingData
  coachId: string
  coachTypePreset: CoachTypePreset | null
  activeModules: EnableableModule[]
  coachWorkspace?: CoachWorkspaceMetadata | null
  clientWorkspace?: ClientWorkspaceMetadata | null
  shareWithClient?: boolean
}): Promise<ClientWorkspaceProvisionResult> {
  const auth = await getAuthedClient(coachId)
  const sheets = google.sheets({ version: "v4", auth })
  const drive = google.drive({ version: "v3", auth })

  const workspace = await ensureCoachDriveWorkspace({
    coachId,
    coachTypePreset,
    activeModules,
    existing: coachWorkspace,
  })

  const clientFolder = await ensureDriveFolder(drive, {
    folderName: buildClientFolderName(clientId, clientName),
    parentId: workspace.managed_clients_folder_id!,
    existingId: clientWorkspace?.drive_folder_id,
  })

  const clientWorkbook = await ensureSpreadsheetFile(drive, {
    fileName: buildClientWorkbookName(clientName),
    parentId: clientFolder.id,
    existingId: clientWorkspace?.sheet_id,
  })

  await ensureClientWorkbookContent(sheets, clientWorkbook.id, {
    clientEmail,
    onboarding,
    activeModules,
  })

  let permissionId = clientWorkspace?.sheet_shared_permission_id ?? null
  let sharedAt = clientWorkspace?.sheet_shared_at ?? null
  let shared = false

  if (shareWithClient) {
    const permission = await ensureWriterPermission(
      drive,
      clientWorkbook.id,
      clientEmail,
      clientWorkspace?.sheet_shared_permission_id
    )
    permissionId = permission.permissionId
    sharedAt = clientWorkspace?.sheet_shared_at ?? new Date().toISOString()
    shared = true
  }

  await upsertClientIndexRow(sheets, workspace.managed_workspace_sheet_id!, {
    clientId,
    clientName,
    clientEmail,
    folderUrl: clientFolder.url,
    workbookUrl: clientWorkbook.url,
    sharingStatus: shared ? `Workbook shared with ${clientEmail}` : "Provisioned, not shared",
  })

  return {
    sheetId: clientWorkbook.id,
    sheetUrl: clientWorkbook.url,
    driveFolderId: clientFolder.id,
    driveFolderUrl: clientFolder.url,
    shared,
    coachWorkspace: {
      managed_workspace_sheet_id: workspace.managed_workspace_sheet_id,
      managed_workspace_sheet_url: workspace.managed_workspace_sheet_url,
      managed_workspace_root_folder_id: workspace.managed_workspace_root_folder_id,
      managed_workspace_root_folder_url: workspace.managed_workspace_root_folder_url,
      managed_clients_folder_id: workspace.managed_clients_folder_id,
      managed_clients_folder_url: workspace.managed_clients_folder_url,
      managed_pt_library_sheet_id: workspace.managed_pt_library_sheet_id,
      managed_pt_library_sheet_url: workspace.managed_pt_library_sheet_url,
      managed_nutrition_library_sheet_id: workspace.managed_nutrition_library_sheet_id,
      managed_nutrition_library_sheet_url: workspace.managed_nutrition_library_sheet_url,
      managed_wellness_library_sheet_id: workspace.managed_wellness_library_sheet_id,
      managed_wellness_library_sheet_url: workspace.managed_wellness_library_sheet_url,
    },
    drive_folder_id: clientFolder.id,
    drive_folder_url: clientFolder.url,
    sheet_id: clientWorkbook.id,
    sheet_shared_email: shared ? clientEmail : clientWorkspace?.sheet_shared_email ?? null,
    sheet_shared_permission_id: permissionId,
    sheet_shared_at: sharedAt,
  }
}
