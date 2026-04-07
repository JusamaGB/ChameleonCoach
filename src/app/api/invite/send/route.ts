import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { sendInviteEmail } from "@/lib/resend"
import { generateToken } from "@/lib/utils"

export async function POST(request: NextRequest) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result

  const { name, email } = await request.json()

  if (!name || !email) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400 }
    )
  }

  const { data: existing } = await supabase
    .from("clients")
    .select("id, onboarding_completed")
    .eq("email", email)
    .eq("coach_id", user.id)
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
    await supabase
      .from("clients")
      .update({
        name,
        invite_token: token,
        invite_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
  } else {
    await supabase.from("clients").insert({
      name,
      email,
      coach_id: user.id,
      invite_token: token,
      invite_expires_at: expiresAt,
    })
  }

  await sendInviteEmail(email, name, token)

  return NextResponse.json({ ok: true })
}
