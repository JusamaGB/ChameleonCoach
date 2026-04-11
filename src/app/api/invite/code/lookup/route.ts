import { NextResponse, type NextRequest } from "next/server"
import { createAdmin } from "@/lib/supabase/server"
import { getCoachBrandingByCoachId } from "@/lib/branding-server"
import { findClientInviteByCode, getClientInviteContactType } from "@/lib/clients"
import { normalizeInviteCode } from "@/lib/utils"

export async function POST(request: NextRequest) {
  const { code } = await request.json().catch(() => ({}))
  const inviteCode = normalizeInviteCode(code ?? "")

  if (!inviteCode) {
    return NextResponse.json({ error: "Invite code is required." }, { status: 400 })
  }

  const supabase = createAdmin()
  const { data: client } = await findClientInviteByCode(
    supabase,
    inviteCode,
    "id, coach_id, invite_expires_at, onboarding_completed, invite_contact_type, sheet_shared_permission_id, invite_code, drive_folder_url, invite_token"
  )

  if (!client) {
    return NextResponse.json({ error: "Invite code not found." }, { status: 404 })
  }

  const branding = await getCoachBrandingByCoachId(client.coach_id)

  if (client.onboarding_completed) {
    return NextResponse.json({ error: "This invite has already been used.", branding }, { status: 409 })
  }

  if (client.invite_expires_at && new Date(client.invite_expires_at) < new Date()) {
    return NextResponse.json({ error: "This invite has expired.", branding }, { status: 410 })
  }

  return NextResponse.json({
    ok: true,
    identifier_type: getClientInviteContactType(client),
    branding,
  })
}
