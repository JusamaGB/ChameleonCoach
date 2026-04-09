import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getClientPortalContext } from "@/lib/client-portal"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { client, branding, modules } = await getClientPortalContext(user.id)

  return NextResponse.json({
    client_id: client?.id ?? null,
    coach_id: client?.coach_id ?? null,
    active_modules: modules.active_modules,
    enableable_modules: modules.enableable_modules,
    is_legacy_workspace: modules.is_legacy_workspace,
    coach_type_preset: modules.coach_type_preset,
    ...branding,
  })
}
