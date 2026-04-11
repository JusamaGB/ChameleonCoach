import { google } from "googleapis"
import { getAuthedClient } from "./auth"
import { PLATFORM_NAME } from "@/lib/platform"
import * as XLSX from "xlsx"

export type MigrationWorkbook = {
  id: string
  name: string
  url: string
  modifiedAt: string | null
  mimeType: string
}

export type MigrationTabAnalysis = {
  tabName: string
  headers: string[]
  sampleRows: string[][]
  isEmpty: boolean
  classification:
    | "profile"
    | "meal_plan"
    | "progress"
    | "training"
    | "nutrition"
    | "wellness"
    | "unknown"
  suggestedDestination: string
  confidence: "high" | "medium" | "low"
  notes: string[]
}

export type MigrationWorkbookTab = MigrationTabAnalysis & {
  rows: string[][]
}

export type WorkbookMigrationAnalysis = {
  workbook: MigrationWorkbook
  tabs: MigrationTabAnalysis[]
  suggestedClientName: string | null
}

const MANAGED_WORKBOOK_PREFIX = `${PLATFORM_NAME} - `
const MANAGED_WORKBOOK_NAMES = new Set([
  `${PLATFORM_NAME} Workspace Control`,
  `${PLATFORM_NAME} PT Library`,
  `${PLATFORM_NAME} Nutrition Library`,
  `${PLATFORM_NAME} Wellness Library`,
])
const SUPPORTED_SPREADSHEET_MIME_TYPES = new Set([
  "application/vnd.google-apps.spreadsheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
  "text/tab-separated-values",
])
const SPREADSHEET_MIME_QUERY = [
  "application/vnd.google-apps.spreadsheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
  "text/tab-separated-values",
]
  .map((mimeType) => `mimeType = '${mimeType}'`)
  .join(" or ")

function extractSpreadsheetId(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (match?.[1]) {
    return match[1]
  }

  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed
  }

  return null
}

async function getDriveApi(coachId: string) {
  const auth = await getAuthedClient(coachId)
  return google.drive({ version: "v3", auth })
}

async function getSheetsApi(coachId: string) {
  const auth = await getAuthedClient(coachId)
  return google.sheets({ version: "v4", auth })
}

function workbookUrl(id: string) {
  return `https://docs.google.com/spreadsheets/d/${id}/edit`
}

function fileUrl(id: string) {
  return `https://drive.google.com/file/d/${id}/view`
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

function normalizeCell(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim()
}

function classifyTab(tabName: string, headers: string[]): MigrationTabAnalysis["classification"] {
  const normalizedTabName = tabName.toLowerCase()
  const normalizedHeaders = headers.map((header) => header.toLowerCase())
  const headerSet = new Set(normalizedHeaders)
  const haystack = `${normalizedTabName} ${normalizedHeaders.join(" ")}`

  const looksLikeProfile =
    normalizedTabName.includes("client detail")
    || normalizedTabName.includes("profile")
    || (
      (headerSet.has("name") || headerSet.has("client name"))
      && (headerSet.has("email") || headerSet.has("email address"))
    )

  if (looksLikeProfile) {
    return "profile"
  }

  const looksLikeWellnessHabits =
    (normalizedTabName.includes("wellness") || normalizedTabName.includes("habit"))
    && headerSet.has("habit")
    && (headerSet.has("target") || headerSet.has("frequency") || headerSet.has("status"))

  if (looksLikeWellnessHabits) {
    return "wellness"
  }

  if (haystack.includes("meal") || haystack.includes("breakfast") || haystack.includes("lunch") || haystack.includes("dinner")) {
    return "meal_plan"
  }

  if (haystack.includes("weight") || haystack.includes("measurement") || haystack.includes("progress")) {
    return "progress"
  }

  if (haystack.includes("workout") || haystack.includes("exercise") || haystack.includes("program") || haystack.includes("session")) {
    return "training"
  }

  if (haystack.includes("nutrition") || haystack.includes("habit") || haystack.includes("recipe") || haystack.includes("calorie") || haystack.includes("protein")) {
    return "nutrition"
  }

  if (haystack.includes("wellness") || haystack.includes("goal") || haystack.includes("reflection") || haystack.includes("mood")) {
    return "wellness"
  }

  return "unknown"
}

function destinationForClassification(classification: MigrationTabAnalysis["classification"]) {
  switch (classification) {
    case "profile":
      return "Profile"
    case "meal_plan":
      return "Meal Plan"
    case "progress":
      return "Progress"
    case "training":
      return "PT tabs"
    case "nutrition":
      return "Nutrition tabs"
    case "wellness":
      return "Wellness tabs"
    default:
      return "Needs coach confirmation"
  }
}

function confidenceForClassification(
  classification: MigrationTabAnalysis["classification"],
  headers: string[]
) {
  if (classification === "unknown") {
    return "low"
  }

  if (headers.length >= 3) {
    return "high"
  }

  return "medium"
}

function notesForClassification(
  classification: MigrationTabAnalysis["classification"],
  headers: string[]
) {
  const notes: string[] = []

  if (classification === "unknown") {
    notes.push("This tab needs manual confirmation before any migration step.")
    return notes
  }

  if (classification === "profile") {
    notes.push("Looks like one-record client information that can map into the Profile tab.")
  }

  if (classification === "meal_plan") {
    notes.push("Looks like a structured meal-plan tab and should map into Meal Plan rows.")
  }

  if (classification === "progress") {
    notes.push("Looks like logged client progress and should map into Progress entries.")
  }

  if (classification === "training") {
    notes.push("Looks related to workouts, programs, or sessions and should map into PT tabs.")
  }

  if (classification === "nutrition") {
    notes.push("Looks related to nutrition tracking, habits, templates, or logs.")
  }

  if (classification === "wellness") {
    notes.push("Looks related to wellness goals, habits, or check-ins.")
  }

  if (headers.length === 0) {
    notes.push("No headers were detected, so the tab structure may need more manual mapping.")
  }

  return notes
}

function inferClientNameFromWorkbookName(name: string) {
  const cleaned = name
    .replace(/^legacy\s+/i, "")
    .replace(/^chameleon coach\s*-\s*/i, "")
    .replace(/\.(xlsx|csv|xls)$/i, "")
    .trim()

  const patterns = [
    /^pt demo - (.+)$/i,
    /^nutrition demo - (.+)$/i,
    /^wellness demo - (.+)$/i,
    /^pt - (.+)$/i,
    /^nutrition - (.+)$/i,
    /^wellness - (.+)$/i,
    /^(.+?)\s+(workout|meal plan|nutrition|wellness|progress|check-?in)s?$/i,
  ]

  for (const pattern of patterns) {
    const match = cleaned.match(pattern)
    if (match?.[1]) {
      return match[1].trim()
    }
  }

  return null
}

export async function listCoachMigrationWorkbooks(coachId: string): Promise<MigrationWorkbook[]> {
  const drive = await getDriveApi(coachId)
  const files: Array<{
    id: string
    name: string
    mimeType?: string | null
    modifiedTime?: string | null
    webViewLink?: string | null
  }> = []
  let pageToken: string | undefined

  do {
    const response = await drive.files.list({
      q: `(${SPREADSHEET_MIME_QUERY}) and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, modifiedTime, webViewLink)",
      orderBy: "modifiedTime desc",
      pageSize: 100,
      pageToken,
      corpora: "user",
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    })

    files.push(
      ...(response.data.files ?? []).filter(
        (file): file is { id: string; name: string; mimeType?: string | null; modifiedTime?: string | null; webViewLink?: string | null } =>
          Boolean(file.id && file.name && file.mimeType && SUPPORTED_SPREADSHEET_MIME_TYPES.has(file.mimeType))
      )
    )

    pageToken = response.data.nextPageToken ?? undefined
  } while (pageToken && files.length < 300)

  return files
    .filter((file) => !MANAGED_WORKBOOK_NAMES.has(file.name) && !file.name.startsWith(MANAGED_WORKBOOK_PREFIX))
    .map((file) => ({
      id: file.id,
      name: file.name,
      url:
        file.webViewLink
        || (file.mimeType === "application/vnd.google-apps.spreadsheet" ? workbookUrl(file.id) : fileUrl(file.id)),
      modifiedAt: file.modifiedTime ?? null,
      mimeType: file.mimeType ?? "application/octet-stream",
    }))
}

async function findDriveSpreadsheetByName(
  drive: ReturnType<typeof google.drive>,
  name: string
) {
  const response = await drive.files.list({
    q: `name = '${escapeDriveQueryValue(name)}' and trashed = false and (${SPREADSHEET_MIME_QUERY})`,
    fields: "files(id, name, mimeType, modifiedTime, webViewLink)",
    pageSize: 1,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  })

  const file = response.data.files?.[0]
  if (!file?.id || !file.name || !file.mimeType) {
    return null
  }

  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    modifiedAt: file.modifiedTime ?? null,
    url:
      file.webViewLink
      || (file.mimeType === "application/vnd.google-apps.spreadsheet" ? workbookUrl(file.id) : fileUrl(file.id)),
  } satisfies MigrationWorkbook
}

async function createGoogleSpreadsheet(
  drive: ReturnType<typeof google.drive>,
  name: string
) {
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.spreadsheet",
      parents: ["root"],
    },
    fields: "id, name, webViewLink, modifiedTime, mimeType",
  })

  const fileId = created.data.id
  if (!fileId || !created.data.name) {
    throw new Error(`Failed to create demo workbook ${name}.`)
  }

  return {
    id: fileId,
    name: created.data.name,
    mimeType: "application/vnd.google-apps.spreadsheet",
    modifiedAt: created.data.modifiedTime ?? null,
    url: created.data.webViewLink || workbookUrl(fileId),
  } satisfies MigrationWorkbook
}

async function ensureSpreadsheetTabsForDemo(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  tabTitles: string[]
) {
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  })

  const existingTitles = new Set(
    (spreadsheet.data.sheets ?? [])
      .map((sheet) => sheet.properties?.title)
      .filter((title): title is string => Boolean(title))
  )

  const missingTitles = tabTitles.filter((title) => !existingTitles.has(title))
  if (missingTitles.length === 0) {
    return
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: missingTitles.map((title) => ({
        addSheet: {
          properties: {
            title,
          },
        },
      })),
    },
  })
}

async function removeBlankDefaultDemoSheet(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  protectedTitles: string[]
) {
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title))",
  })

  const sheet1 = (spreadsheet.data.sheets ?? []).find((sheet) => sheet.properties?.title === "Sheet1")
  const otherSheets = (spreadsheet.data.sheets ?? []).filter((sheet) => sheet.properties?.title !== "Sheet1")

  if (!sheet1?.properties?.sheetId || otherSheets.length === 0) {
    return
  }

  if (protectedTitles.includes("Sheet1")) {
    return
  }

  const valuesResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'Sheet1'!A1:Z20",
  }).catch(() => null)

  const hasContent = (valuesResponse?.data.values ?? []).some((row) =>
    row.some((cell) => normalizeCell(cell).length > 0)
  )

  if (hasContent) {
    return
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteSheet: {
            sheetId: sheet1.properties.sheetId,
          },
        },
      ],
    },
  })
}

async function overwriteDemoTab(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  tabName: string,
  values: Array<Array<string | number | boolean>>
) {
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${tabName}!A:ZZ`,
  })

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values,
    },
  })
}

async function resetDefaultDemoSheet(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
) {
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  })

  const hasSheet1 = (spreadsheet.data.sheets ?? []).some((sheet) => sheet.properties?.title === "Sheet1")
  if (!hasSheet1) {
    return
  }

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: "Sheet1!A:ZZ",
  })
}

type DemoWorkbookSeed = {
  name: string
  tabs: Array<{
    title: string
    rows: Array<Array<string | number | boolean>>
  }>
}

const DEMO_WORKBOOK_SEEDS: DemoWorkbookSeed[] = [
  {
    name: "Legacy PT Demo - Alex Carter",
    tabs: [
      {
        title: "Client Profile",
        rows: [
          ["Name", "Email", "Goal", "Injury Notes", "Sessions Per Week"],
          ["Alex Carter", "alex@example.com", "Build muscle and improve consistency", "Tight right shoulder", 4],
        ],
      },
      {
        title: "Workout Plan",
        rows: [
          ["Week", "Day", "Exercise", "Sets", "Reps", "Notes"],
          [1, "Push", "Bench Press", 4, "8", "Leave 2 reps in reserve"],
          [1, "Push", "Incline Dumbbell Press", 3, "10", "Slow eccentric"],
          [1, "Pull", "Lat Pulldown", 4, "10", "Full stretch"],
          [1, "Legs", "Back Squat", 4, "6", "Controlled descent"],
        ],
      },
      {
        title: "Progress Tracker",
        rows: [
          ["Date", "Weight", "Chest", "Waist", "Notes"],
          ["2026-03-18", "82.4", "101", "86", "Energy improved this week"],
          ["2026-03-25", "82.9", "102", "85", "Recovered well after session 3"],
        ],
      },
    ],
  },
  {
    name: "Legacy Nutrition Demo - Maya Lewis",
    tabs: [
      {
        title: "Client Overview",
        rows: [
          ["Name", "Email", "Calories", "Protein", "Goal"],
          ["Maya Lewis", "maya@example.com", "2100", "140g", "Improve adherence and reduce weekend overeating"],
        ],
      },
      {
        title: "Meal Plan",
        rows: [
          ["Day", "Breakfast", "Lunch", "Dinner", "Snacks"],
          ["Monday", "Greek yogurt + berries", "Chicken wrap + fruit", "Salmon, rice, veg", "Protein shake"],
          ["Tuesday", "Overnight oats", "Turkey salad bowl", "Lean beef pasta", "Apple + peanut butter"],
        ],
      },
      {
        title: "Nutrition Check In",
        rows: [
          ["Week", "Hunger", "Energy", "Adherence", "Coach Notes"],
          ["2026-W12", "6/10", "7/10", "85%", "Late-night snacking still the main issue"],
          ["2026-W13", "5/10", "8/10", "90%", "Meal prep improved consistency"],
        ],
      },
    ],
  },
  {
    name: "Legacy Wellness Demo - Jordan Hayes",
    tabs: [
      {
        title: "Client Details",
        rows: [
          ["Name", "Email", "Focus", "Sleep Goal", "Stress Goal"],
          ["Jordan Hayes", "jordan@example.com", "Reduce burnout and improve routine stability", "7.5 hours", "Daily decompression walk"],
        ],
      },
      {
        title: "Wellness Habits",
        rows: [
          ["Habit", "Target", "Frequency", "Status"],
          ["Morning sunlight", "10 minutes", "Daily", "Active"],
          ["Evening reflection", "5 minutes", "5x weekly", "Active"],
          ["Phone-free walk", "20 minutes", "3x weekly", "Active"],
        ],
      },
      {
        title: "Weekly Check-ins",
        rows: [
          ["Date", "Mood", "Stress", "Sleep", "Wins", "Blockers"],
          ["2026-03-19", "7/10", "5/10", "6.5h", "Kept walk routine", "Worked late twice"],
          ["2026-03-26", "8/10", "4/10", "7.1h", "Better shutdown routine", "Weekend drift"],
        ],
      },
    ],
  },
]

export async function createMockMigrationWorkbooks(coachId: string) {
  const auth = await getAuthedClient(coachId)
  const drive = google.drive({ version: "v3", auth })
  const sheets = google.sheets({ version: "v4", auth })
  const created: MigrationWorkbook[] = []

  for (const seed of DEMO_WORKBOOK_SEEDS) {
    const workbook = await findDriveSpreadsheetByName(drive, seed.name)
      ?? await createGoogleSpreadsheet(drive, seed.name)

    await ensureSpreadsheetTabsForDemo(
      sheets,
      workbook.id,
      seed.tabs.map((tab) => tab.title)
    )

    for (const tab of seed.tabs) {
      await overwriteDemoTab(sheets, workbook.id, tab.title, tab.rows)
    }

    await resetDefaultDemoSheet(sheets, workbook.id)

    await removeBlankDefaultDemoSheet(
      sheets,
      workbook.id,
      seed.tabs.map((tab) => tab.title)
    )

    created.push(workbook)
  }

  return created
}

export async function resolveCoachMigrationWorkbook(
  coachId: string,
  source: string
): Promise<MigrationWorkbook> {
  const spreadsheetId = extractSpreadsheetId(source)
  if (!spreadsheetId) {
    throw new Error("Paste a valid Google Sheets URL or spreadsheet ID.")
  }

  const sheets = await getSheetsApi(coachId)
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "spreadsheetId,properties.title,spreadsheetUrl",
  })

  const resolvedId = spreadsheet.data.spreadsheetId
  const resolvedName = spreadsheet.data.properties?.title

  if (!resolvedId || !resolvedName) {
    throw new Error("Unable to load that Google Sheet.")
  }

  return {
    id: resolvedId,
    name: resolvedName,
    url: spreadsheet.data.spreadsheetUrl || workbookUrl(resolvedId),
    modifiedAt: null,
    mimeType: "application/vnd.google-apps.spreadsheet",
  }
}

function readUploadedWorkbook(
  buffer: Buffer,
  mimeType: string
): MigrationWorkbookTab[] {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    raw: false,
    dense: false,
  })

  return workbook.SheetNames.slice(0, 20).map((sheetName) => {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      blankrows: false,
      raw: false,
      defval: "",
    }) as string[][]

    const hasAnyContent = rows.some((row) => row.some((cell) => normalizeCell(cell).length > 0))
    const headers = (rows[0] ?? []).map(normalizeCell).filter(Boolean)
    const sampleRows = rows.slice(1, 4).map((row) => row.map(normalizeCell))
    const classification = classifyTab(sheetName, headers)

    return {
      tabName: sheetName,
      headers,
      sampleRows,
      rows: rows.slice(1).map((row) => row.map(normalizeCell)),
      isEmpty: !hasAnyContent,
      classification,
      suggestedDestination: destinationForClassification(classification),
      confidence: confidenceForClassification(classification, headers),
      notes: [
        ...(!hasAnyContent ? ["This tab is empty. No rows are available to migrate from it."] : []),
        ...notesForClassification(classification, headers),
        mimeType === "text/csv" || mimeType === "application/csv"
          ? "Source file is CSV, so this import is based on a single flat sheet."
          : "Source file is an uploaded spreadsheet rather than a native Google Sheet.",
      ],
    }
  })
}

export async function readCoachMigrationWorkbookTabs(
  coachId: string,
  workbook: MigrationWorkbook
): Promise<MigrationWorkbookTab[]> {
  if (workbook.mimeType !== "application/vnd.google-apps.spreadsheet") {
    const drive = await getDriveApi(coachId)
    const fileResponse = await drive.files.get(
      {
        fileId: workbook.id,
        alt: "media",
      },
      {
        responseType: "arraybuffer",
      }
    )

    const buffer = Buffer.from(fileResponse.data as ArrayBuffer)
    return readUploadedWorkbook(buffer, workbook.mimeType)
  }

  const sheets = await getSheetsApi(coachId)
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: workbook.id,
    fields: "sheets.properties.title",
  })

  const tabTitles = (spreadsheet.data.sheets ?? [])
    .map((sheet) => sheet.properties?.title)
    .filter((title): title is string => Boolean(title))

  const tabs: MigrationWorkbookTab[] = []

  for (const tabName of tabTitles.slice(0, 20)) {
    const valuesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: workbook.id,
      range: `'${tabName}'!A1:ZZ1000`,
    }).catch(() => null)

    const values = valuesResponse?.data.values ?? []
    const hasAnyContent = values.some((row) => row.some((cell) => normalizeCell(cell).length > 0))

    const headers = (values[0] ?? []).map(normalizeCell).filter(Boolean)
    const sampleRows = values.slice(1, 4).map((row) => row.map(normalizeCell))
    const classification = classifyTab(tabName, headers)

    tabs.push({
      tabName,
      headers,
      sampleRows,
      rows: values.slice(1).map((row) => row.map(normalizeCell)),
      isEmpty: !hasAnyContent,
      classification,
      suggestedDestination: destinationForClassification(classification),
      confidence: confidenceForClassification(classification, headers),
      notes: [
        ...(!hasAnyContent ? ["This tab is empty. No rows are available to migrate from it."] : []),
        ...notesForClassification(classification, headers),
      ],
    })
  }

  return tabs
}

export async function analyzeCoachMigrationWorkbook(
  coachId: string,
  workbook: MigrationWorkbook
): Promise<WorkbookMigrationAnalysis> {
  const tabs = await readCoachMigrationWorkbookTabs(coachId, workbook)

  return {
    workbook,
    tabs: tabs.map(({ rows: _rows, ...tab }) => tab),
    suggestedClientName: inferClientNameFromWorkbookName(workbook.name),
  }
}
