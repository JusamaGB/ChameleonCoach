import { NextResponse } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { listClientsForCoach } from "@/lib/clients"
import { createAdmin } from "@/lib/supabase/server"
import { resolveActiveModules } from "@/lib/modules"
import { getCoachDriveWorkspaceHealth } from "@/lib/google/template"

export async function GET() {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result

  const { data: clients, error: clientsError } = await listClientsForCoach(supabase, user.id)
  if (clientsError) {
    return NextResponse.json({ error: clientsError.message }, { status: 500 })
  }

  const admin = createAdmin()
  const { data: settings } = await admin
    .from("admin_settings")
    .select("google_refresh_token, coach_type_preset, active_modules, managed_workspace_sheet_id, managed_workspace_sheet_url, managed_workspace_sheet_modules, managed_workspace_sheet_provisioned_at, managed_workspace_root_folder_id, managed_workspace_root_folder_url, managed_clients_folder_id, managed_clients_folder_url, managed_pt_library_sheet_id, managed_pt_library_sheet_url, managed_nutrition_library_sheet_id, managed_nutrition_library_sheet_url, managed_wellness_library_sheet_id, managed_wellness_library_sheet_url")
    .eq("user_id", user.id)
    .maybeSingle()

  const modules = resolveActiveModules(settings ?? {})
  const workspaceHealth = await getCoachDriveWorkspaceHealth({
    coachId: user.id,
    activeModules: modules.enableable_modules,
    settings,
  })

  return NextResponse.json({
    google_connected: Boolean(settings?.google_refresh_token),
    workspace_status: workspaceHealth.status,
    missing_artifacts: workspaceHealth.missingArtifacts,
    clients: clients ?? [],
    openai_configured: Boolean(process.env.OPENAI_API_KEY),
  })
}
