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

export type WorkbookMigrationAnalysis = {
  workbook: MigrationWorkbook
  tabs: MigrationTabAnalysis[]
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

function normalizeCell(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim()
}

function classifyTab(tabName: string, headers: string[]): MigrationTabAnalysis["classification"] {
  const haystack = `${tabName} ${headers.join(" ")}`.toLowerCase()

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

  if (haystack.includes("profile") || haystack.includes("name") || haystack.includes("email") || haystack.includes("gender") || haystack.includes("age")) {
    return "profile"
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
): MigrationTabAnalysis[] {
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

    const headers = (rows[0] ?? []).map(normalizeCell).filter(Boolean)
    const sampleRows = rows.slice(1, 4).map((row) => row.map(normalizeCell))
    const classification = classifyTab(sheetName, headers)

    return {
      tabName: sheetName,
      headers,
      sampleRows,
      classification,
      suggestedDestination: destinationForClassification(classification),
      confidence: confidenceForClassification(classification, headers),
      notes: [
        ...notesForClassification(classification, headers),
        mimeType === "text/csv" || mimeType === "application/csv"
          ? "Source file is CSV, so this import is based on a single flat sheet."
          : "Source file is an uploaded spreadsheet rather than a native Google Sheet.",
      ],
    }
  })
}

export async function analyzeCoachMigrationWorkbook(
  coachId: string,
  workbook: MigrationWorkbook
): Promise<WorkbookMigrationAnalysis> {
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

    return {
      workbook,
      tabs: readUploadedWorkbook(buffer, workbook.mimeType),
    }
  }

  const sheets = await getSheetsApi(coachId)
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: workbook.id,
    fields: "sheets.properties.title",
  })

  const tabTitles = (spreadsheet.data.sheets ?? [])
    .map((sheet) => sheet.properties?.title)
    .filter((title): title is string => Boolean(title))

  const tabs: MigrationTabAnalysis[] = []

  for (const tabName of tabTitles.slice(0, 20)) {
    const valuesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: workbook.id,
      range: `'${tabName}'!A1:Z8`,
    }).catch(() => null)

    const values = valuesResponse?.data.values ?? []
    const headers = (values[0] ?? []).map(normalizeCell).filter(Boolean)
    const sampleRows = values.slice(1, 4).map((row) => row.map(normalizeCell))
    const classification = classifyTab(tabName, headers)

    tabs.push({
      tabName,
      headers,
      sampleRows,
      classification,
      suggestedDestination: destinationForClassification(classification),
      confidence: confidenceForClassification(classification, headers),
      notes: notesForClassification(classification, headers),
    })
  }

  return {
    workbook,
    tabs,
  }
}
