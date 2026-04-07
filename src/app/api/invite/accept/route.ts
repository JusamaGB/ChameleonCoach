import { NextResponse, type NextRequest } from "next/server"
import { createAdmin } from "@/lib/supabase/server"
import { createClientSheet } from "@/lib/google/template"
import type { OnboardingData } from "@/types"

// GET: validate token
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")

  if (!token) {
    return NextResponse.json({ valid: false, reason: "missing" })
  }

  const supabase = createAdmin()
  const { data: client } = await supabase
    .from("clients")
    .select("email, invite_expires_at, onboarding_completed")
    .eq("invite_token", token)
    .single()

  if (!client) {
    return NextResponse.json({ valid: false, reason: "invalid" })
  }

  if (client.onboarding_completed) {
    return NextResponse.json({ valid: false, reason: "already_used" })
  }

  if (
    client.invite_expires_at &&
    new Date(client.invite_expires_at) < new Date()
  ) {
    return NextResponse.json({ valid: false, reason: "expired" })
  }

  return NextResponse.json({ valid: true, email: client.email })
}

// POST: complete onboarding
export async function POST(request: NextRequest) {
  const { token, password, onboarding } = (await request.json()) as {
    token: string
    password: string
    onboarding: OnboardingData
  }

  if (!token || !password || !onboarding) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    )
  }

  const supabase = createAdmin()

  // Validate token
  const { data: client } = await supabase
    .from("clients")
    .select("*, coach_id")
    .eq("invite_token", token)
    .single()

  if (!client) {
    return NextResponse.json({ error: "Invalid invite" }, { status: 400 })
  }

  if (client.onboarding_completed) {
    return NextResponse.json(
      { error: "Already onboarded" },
      { status: 400 }
    )
  }

  if (
    client.invite_expires_at &&
    new Date(client.invite_expires_at) < new Date()
  ) {
    return NextResponse.json({ error: "Invite expired" }, { status: 400 })
  }

  // Create Supabase auth user
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: client.email,
      password,
      email_confirm: true,
    })

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message || "Failed to create account" },
      { status: 500 }
    )
  }

  // Create Google Sheet (scoped to the coach's Google account)
  let sheetId: string | null = null
  try {
    if (client.coach_id) {
      sheetId = await createClientSheet(onboarding.name, onboarding, client.coach_id)
    }
  } catch {
    // Google might not be connected yet — continue without sheet
  }

  // Update client record
  await supabase
    .from("clients")
    .update({
      user_id: authData.user.id,
      name: onboarding.name,
      sheet_id: sheetId,
      invite_accepted_at: new Date().toISOString(),
      onboarding_completed: true,
      invite_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", client.id)

  return NextResponse.json({ ok: true })
}
