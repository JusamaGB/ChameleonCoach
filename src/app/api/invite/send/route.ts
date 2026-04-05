import { NextResponse, type NextRequest } from "next/server"
import { createClient, createAdmin } from "@/lib/supabase/server"
import { sendInviteEmail } from "@/lib/resend"
import { generateToken } from "@/lib/utils"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { name, email } = await request.json()

  if (!name || !email) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400 }
    )
  }

  const admin = createAdmin()

  // Check if client already exists
  const { data: existing } = await admin
    .from("clients")
    .select("id, onboarding_completed")
    .eq("email", email)
    .single()

  if (existing?.onboarding_completed) {
    return NextResponse.json(
      { error: "This client is already onboarded" },
      { status: 400 }
    )
  }

  const token = generateToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  if (existing) {
    // Resend invite
    await admin
      .from("clients")
      .update({
        name,
        invite_token: token,
        invite_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
  } else {
    // New client
    await admin.from("clients").insert({
      name,
      email,
      invite_token: token,
      invite_expires_at: expiresAt,
    })
  }

  await sendInviteEmail(email, name, token)

  return NextResponse.json({ ok: true })
}
