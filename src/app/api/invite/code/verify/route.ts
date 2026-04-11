import { NextResponse, type NextRequest } from "next/server"
import { createAdmin } from "@/lib/supabase/server"
import { getCoachBrandingByCoachId } from "@/lib/branding-server"
import {
  findClientInviteByCode,
  getClientInviteContactType,
  getClientInviteContactValue,
} from "@/lib/clients"
import { normalizeInviteCode, normalizeInviteContactValue } from "@/lib/utils"

export async function POST(request: NextRequest) {
  const { code, identifier } = await request.json().catch(() => ({}))
  const inviteCode = normalizeInviteCode(code ?? "")

  if (!inviteCode || !identifier) {
    return NextResponse.json({ error: "Invite code and contact details are required." }, { status: 400 })
  }

  const supabase = createAdmin()
  const { data: client } = await findClientInviteByCode(
    supabase,
    inviteCode,
    "id, coach_id, email, invite_token, invite_expires_at, onboarding_completed, invite_contact_type, invite_contact_value, sheet_shared_permission_id, sheet_shared_email, invite_code, drive_folder_url"
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

  const contactType = getClientInviteContactType(client)
  const normalizedIdentifier = normalizeInviteContactValue(contactType, identifier)
  const expectedValue = getClientInviteContactValue(client)

  if (!expectedValue || normalizedIdentifier !== expectedValue) {
    return NextResponse.json(
      { error: "That information does not match this invite.", branding },
      { status: 403 }
    )
  }

  return NextResponse.json({
    ok: true,
    token: client.invite_token,
    email: contactType === "email" ? expectedValue : "",
    identifier_type: contactType,
    branding,
  })
}
