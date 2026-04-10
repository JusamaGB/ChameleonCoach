import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { createAdmin } from "@/lib/supabase/server"
import { getAuthUrl } from "@/lib/google/auth"
import { resolveActiveModules } from "@/lib/modules"
import { getCoachDriveWorkspaceHealth } from "@/lib/google/template"

export async function GET(request: NextRequest) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user } = result

  const action = request.nextUrl.searchParams.get("action")

  if (action === "auth") {
    const url = getAuthUrl()
    return NextResponse.redirect(url)
  }

  const admin = createAdmin()
  const { data: settings } = await admin
    .from("admin_settings")
    .select("google_refresh_token, coach_type_preset, active_modules, managed_workspace_sheet_id, managed_workspace_sheet_url, managed_workspace_sheet_modules, managed_workspace_sheet_provisioned_at, managed_workspace_root_folder_id, managed_workspace_root_folder_url, managed_clients_folder_id, managed_clients_folder_url, managed_pt_library_sheet_id, managed_pt_library_sheet_url, managed_nutrition_library_sheet_id, managed_nutrition_library_sheet_url, managed_wellness_library_sheet_id, managed_wellness_library_sheet_url")
    .eq("user_id", user.id)
    .maybeSingle()

  const modules = resolveActiveModules(settings ?? {})
  const currentModules = modules.enableable_modules
  const workspaceHealth = await getCoachDriveWorkspaceHealth({
    coachId: user.id,
    activeModules: currentModules,
    settings,
  })
  const provisionedForCurrentModules = workspaceHealth.status === "healthy"

  return NextResponse.json({
    connected: !!settings?.google_refresh_token,
    sheets_provisioned: provisionedForCurrentModules,
    workspace_status: workspaceHealth.status,
    missing_artifacts: workspaceHealth.missingArtifacts,
    managed_workspace_sheet_id: settings?.managed_workspace_sheet_id ?? null,
    managed_workspace_sheet_url: settings?.managed_workspace_sheet_url ?? null,
    managed_workspace_root_folder_id: settings?.managed_workspace_root_folder_id ?? null,
    managed_workspace_root_folder_url: settings?.managed_workspace_root_folder_url ?? null,
    managed_clients_folder_id: settings?.managed_clients_folder_id ?? null,
    managed_clients_folder_url: settings?.managed_clients_folder_url ?? null,
    managed_pt_library_sheet_id: settings?.managed_pt_library_sheet_id ?? null,
    managed_pt_library_sheet_url: settings?.managed_pt_library_sheet_url ?? null,
    managed_nutrition_library_sheet_id: settings?.managed_nutrition_library_sheet_id ?? null,
    managed_nutrition_library_sheet_url: settings?.managed_nutrition_library_sheet_url ?? null,
    managed_wellness_library_sheet_id: settings?.managed_wellness_library_sheet_id ?? null,
    managed_wellness_library_sheet_url: settings?.managed_wellness_library_sheet_url ?? null,
    active_modules: currentModules,
  })
}
