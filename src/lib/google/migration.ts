import { google } from "googleapis"
import { getAuthedClient } from "./auth"

export type MigrationWorkbook = {
  id: string
  name: string
  url: string
  modifiedAt: string | null
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
  const response = await drive.files.list({
    q: "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
    fields: "files(id, name, modifiedTime, webViewLink)",
    orderBy: "modifiedTime desc",
    pageSize: 25,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  })

  return (response.data.files ?? [])
    .filter((file): file is { id: string; name: string; modifiedTime?: string | null; webViewLink?: string | null } => Boolean(file.id && file.name))
    .map((file) => ({
      id: file.id,
      name: file.name,
      url: file.webViewLink || workbookUrl(file.id),
      modifiedAt: file.modifiedTime ?? null,
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
  }
}

export async function analyzeCoachMigrationWorkbook(
  coachId: string,
  workbook: MigrationWorkbook
): Promise<WorkbookMigrationAnalysis> {
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
