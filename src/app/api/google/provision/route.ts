import { NextResponse } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { createAdmin } from "@/lib/supabase/server"
import {
  normalizeActiveModules,
  normalizeCoachTypePreset,
  resolveActiveModules,
} from "@/lib/modules"
import {
  createCoachWorkspaceSheet,
  getCoachDriveWorkspaceHealth,
} from "@/lib/google/template"

export async function POST() {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user } = result

  const admin = createAdmin()
  const { data: settings } = await admin
    .from("admin_settings")
    .select("id, user_id, google_refresh_token, coach_type_preset, active_modules, managed_workspace_sheet_id, managed_workspace_sheet_url, managed_workspace_sheet_modules, managed_workspace_sheet_provisioned_at, managed_workspace_root_folder_id, managed_workspace_root_folder_url, managed_clients_folder_id, managed_clients_folder_url, managed_pt_library_sheet_id, managed_pt_library_sheet_url, managed_nutrition_library_sheet_id, managed_nutrition_library_sheet_url, managed_wellness_library_sheet_id, managed_wellness_library_sheet_url")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!settings?.google_refresh_token) {
    return NextResponse.json(
      { error: "Connect Google before creating Chameleon Sheets." },
      { status: 400 }
    )
  }

  const modules = resolveActiveModules(settings)
  const currentModules = modules.enableable_modules
  try {
    const workspaceSheet = await createCoachWorkspaceSheet({
      coachId: user.id,
      coachTypePreset: normalizeCoachTypePreset(settings.coach_type_preset),
      activeModules: currentModules,
      existing: settings,
    })

    const provisionedAt = new Date().toISOString()
    const verifiedHealth = await getCoachDriveWorkspaceHealth({
      coachId: user.id,
      activeModules: currentModules,
      settings: {
        google_refresh_token: settings.google_refresh_token,
        managed_workspace_sheet_id: workspaceSheet.sheetId,
        managed_workspace_root_folder_id: workspaceSheet.rootFolderId,
        managed_clients_folder_id: workspaceSheet.clientsFolderId,
        managed_pt_library_sheet_id: workspaceSheet.ptLibrarySheetId,
        managed_nutrition_library_sheet_id: workspaceSheet.nutritionLibrarySheetId,
        managed_wellness_library_sheet_id: workspaceSheet.wellnessLibrarySheetId,
        managed_workspace_sheet_provisioned_at: provisionedAt,
      },
    })

    if (verifiedHealth.status !== "healthy") {
      return NextResponse.json(
        {
          error: `Provisioning did not complete the full Drive workspace: ${verifiedHealth.missingArtifacts.join(", ")}`,
          workspace_status: verifiedHealth.status,
          missing_artifacts: verifiedHealth.missingArtifacts,
        },
        { status: 500 }
      )
    }

    const updatePayload = {
      user_id: user.id,
      managed_workspace_sheet_id: workspaceSheet.sheetId,
      managed_workspace_sheet_url: workspaceSheet.sheetUrl,
      managed_workspace_root_folder_id: workspaceSheet.rootFolderId,
      managed_workspace_root_folder_url: workspaceSheet.rootFolderUrl,
      managed_clients_folder_id: workspaceSheet.clientsFolderId,
      managed_clients_folder_url: workspaceSheet.clientsFolderUrl,
      managed_pt_library_sheet_id: workspaceSheet.ptLibrarySheetId,
      managed_pt_library_sheet_url: workspaceSheet.ptLibrarySheetUrl,
      managed_nutrition_library_sheet_id: workspaceSheet.nutritionLibrarySheetId,
      managed_nutrition_library_sheet_url: workspaceSheet.nutritionLibrarySheetUrl,
      managed_wellness_library_sheet_id: workspaceSheet.wellnessLibrarySheetId,
      managed_wellness_library_sheet_url: workspaceSheet.wellnessLibrarySheetUrl,
      managed_workspace_sheet_modules: currentModules,
      managed_workspace_sheet_provisioned_at: provisionedAt,
      updated_at: new Date().toISOString(),
    }

    const query = admin.from("admin_settings")

    const { error } = settings?.id
      ? await query.update(updatePayload).eq("id", settings.id)
      : await query.upsert(updatePayload, { onConflict: "user_id" })

    if (error) {
      return NextResponse.json(
        { error: "Chameleon Sheets were created but provisioning state could not be saved." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      already_provisioned: !workspaceSheet.createdAny,
      managed_workspace_sheet_id: workspaceSheet.sheetId,
      managed_workspace_sheet_url: workspaceSheet.sheetUrl,
      managed_workspace_root_folder_id: workspaceSheet.rootFolderId,
      managed_workspace_root_folder_url: workspaceSheet.rootFolderUrl,
      managed_clients_folder_id: workspaceSheet.clientsFolderId,
      managed_clients_folder_url: workspaceSheet.clientsFolderUrl,
      managed_pt_library_sheet_id: workspaceSheet.ptLibrarySheetId,
      managed_pt_library_sheet_url: workspaceSheet.ptLibrarySheetUrl,
      managed_nutrition_library_sheet_id: workspaceSheet.nutritionLibrarySheetId,
      managed_nutrition_library_sheet_url: workspaceSheet.nutritionLibrarySheetUrl,
      managed_wellness_library_sheet_id: workspaceSheet.wellnessLibrarySheetId,
      managed_wellness_library_sheet_url: workspaceSheet.wellnessLibrarySheetUrl,
      active_modules: currentModules,
      workspace_status: verifiedHealth.status,
      missing_artifacts: verifiedHealth.missingArtifacts,
    })
  } catch (error) {
    console.error("Failed to provision Chameleon Sheets", error)

    const message =
      error instanceof Error && error.message
        ? error.message
        : "Failed to create Chameleon Sheets in your Google Drive."

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
