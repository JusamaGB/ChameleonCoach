import { google } from "googleapis"
import { getAuthedClient } from "./auth"
import type { OnboardingData } from "@/types"

export async function createClientSheet(
  clientName: string,
  onboarding: OnboardingData
): Promise<string> {
  const auth = await getAuthedClient()
  const sheets = google.sheets({ version: "v4", auth })
  const drive = google.drive({ version: "v3", auth })

  // Create the spreadsheet
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: `G-Fitness — ${clientName}`,
      },
      sheets: [
        {
          properties: { title: "Profile", index: 0 },
        },
        {
          properties: { title: "Meal Plan", index: 1 },
        },
        {
          properties: { title: "Progress", index: 2 },
        },
      ],
    },
  })

  const sheetId = spreadsheet.data.spreadsheetId!

  // Fill Profile tab with onboarding data
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: "Profile!A1:B12",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        ["Name", onboarding.name],
        ["Email", ""],
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
      ],
    },
  })

  // Set up Meal Plan headers
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: "Meal Plan!A1:E8",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        ["Day", "Breakfast", "Lunch", "Dinner", "Snacks"],
        ["Monday", "", "", "", ""],
        ["Tuesday", "", "", "", ""],
        ["Wednesday", "", "", "", ""],
        ["Thursday", "", "", "", ""],
        ["Friday", "", "", "", ""],
        ["Saturday", "", "", "", ""],
        ["Sunday", "", "", "", ""],
      ],
    },
  })

  // Set up Progress headers
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: "Progress!A1:D1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [["Date", "Weight", "Measurements", "Notes"]],
    },
  })

  // Move to a G-Fitness folder if it exists, otherwise create one
  const folderSearch = await drive.files.list({
    q: "name = 'G-Fitness Clients' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    fields: "files(id)",
  })

  let folderId: string

  if (folderSearch.data.files && folderSearch.data.files.length > 0) {
    folderId = folderSearch.data.files[0].id!
  } else {
    const folder = await drive.files.create({
      requestBody: {
        name: "G-Fitness Clients",
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
    })
    folderId = folder.data.id!
  }

  // Move spreadsheet into the folder
  const file = await drive.files.get({
    fileId: sheetId,
    fields: "parents",
  })

  await drive.files.update({
    fileId: sheetId,
    addParents: folderId,
    removeParents: file.data.parents?.join(",") || "",
    fields: "id",
  })

  return sheetId
}
