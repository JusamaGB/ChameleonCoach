import { google } from "googleapis"
import { createAdmin } from "@/lib/supabase/server"

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/calendar.events",
]

export function getAuthUrl(): string {
  const client = makeOAuthClient()
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  })
}

export async function exchangeCode(code: string) {
  const client = makeOAuthClient()
  const { tokens } = await client.getToken(code)
  return tokens
}

function makeOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

export async function getAuthedClient(coachId: string) {
  const supabase = createAdmin()

  const { data: settings } = await supabase
    .from("admin_settings")
    .select("*")
    .eq("user_id", coachId)
    .single()

  if (!settings?.google_refresh_token) {
    throw new Error("Google account not connected")
  }

  const oauth2Client = makeOAuthClient()
  oauth2Client.setCredentials({
    refresh_token: settings.google_refresh_token,
    access_token: settings.google_access_token,
    expiry_date: settings.google_token_expiry
      ? new Date(settings.google_token_expiry).getTime()
      : undefined,
  })

  // Refresh if expired
  const tokenInfo = await oauth2Client.getAccessToken()
  if (tokenInfo.token !== settings.google_access_token) {
    await supabase
      .from("admin_settings")
      .update({
        google_access_token: tokenInfo.token,
        google_token_expiry: new Date(
          oauth2Client.credentials.expiry_date || 0
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id)
  }

  return oauth2Client
}
