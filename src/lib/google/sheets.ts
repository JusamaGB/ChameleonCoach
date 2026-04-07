import { google } from "googleapis"
import { getAuthedClient } from "./auth"
import type { MealPlanDay, ProgressEntry, ProfileData } from "@/types"

async function getSheetsApi(coachId: string) {
  const auth = await getAuthedClient(coachId)
  return google.sheets({ version: "v4", auth })
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
