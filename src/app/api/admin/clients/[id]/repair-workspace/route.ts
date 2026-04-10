import { NextResponse } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { createClientSheet, getCoachDriveWorkspaceHealth } from "@/lib/google/template"
import { findClientByIdForCoach } from "@/lib/clients"
import { normalizeCoachTypePreset, resolveActiveModules } from "@/lib/modules"

function buildFallbackOnboarding(client: { name: string }) {
  return {
    name: client.name,
    age: 0,
    gender: "",
    height: "",
    current_weight: "",
    goal_weight: "",
    fitness_goals: "",
    dietary_restrictions: "",
    health_conditions: "",
    activity_level: "moderately_active" as const,
    notes: "Profile fields were backfilled during workspace repair.",
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const { id } = await params

  const { data: client, error: clientError } = await findClientByIdForCoach(
    supabase,
    user.id,
    id,
    "*"
  )

  if (clientError || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }

  const { data: settings } = await supabase
    .from("admin_settings")
    .select("google_refresh_token, coach_type_preset, active_modules, managed_workspace_sheet_id, managed_workspace_sheet_url, managed_workspace_root_folder_id, managed_workspace_root_folder_url, managed_clients_folder_id, managed_clients_folder_url, managed_pt_library_sheet_id, managed_pt_library_sheet_url, managed_nutrition_library_sheet_id, managed_nutrition_library_sheet_url, managed_wellness_library_sheet_id, managed_wellness_library_sheet_url, managed_workspace_sheet_modules, managed_workspace_sheet_provisioned_at")
    .eq("user_id", user.id)
    .maybeSingle()

  const modules = resolveActiveModules(settings ?? {})
  const workspaceHealth = await getCoachDriveWorkspaceHealth({
    coachId: user.id,
    activeModules: modules.enableable_modules,
    settings,
  })

  if (workspaceHealth.status !== "healthy") {
    return NextResponse.json(
      {
        error:
          workspaceHealth.status === "disconnected"
            ? "Reconnect Google before repairing this client workspace."
            : workspaceHealth.status === "not_provisioned"
              ? "Create Chameleon Sheets before repairing this client workspace."
              : `Repair the coach workspace first. Missing: ${workspaceHealth.missingArtifacts.join(", ")}.`,
      },
      { status: 409 }
    )
  }

  const repairStartedAt = new Date().toISOString()

  await supabase
    .from("clients")
    .update({
      provisioning_status: "provisioning",
      provisioning_started_at: repairStartedAt,
      provisioning_completed_at: null,
      provisioning_last_error: null,
      updated_at: repairStartedAt,
    })
    .eq("id", client.id)

  try {
    const clientWorkspace = await createClientSheet({
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      onboarding: buildFallbackOnboarding(client),
      coachId: user.id,
      coachTypePreset: normalizeCoachTypePreset(settings?.coach_type_preset),
      activeModules: modules.enableable_modules,
      coachWorkspace: settings,
      clientWorkspace: client,
      shareWithClient: Boolean(client.email),
    })

    const completedAt = new Date().toISOString()

    const { error: adminSettingsError } = await supabase
      .from("admin_settings")
      .upsert(
        {
          user_id: user.id,
          managed_workspace_sheet_id: clientWorkspace.coachWorkspace.managed_workspace_sheet_id ?? null,
          managed_workspace_sheet_url: clientWorkspace.coachWorkspace.managed_workspace_sheet_url ?? null,
          managed_workspace_root_folder_id:
            clientWorkspace.coachWorkspace.managed_workspace_root_folder_id ?? null,
          managed_workspace_root_folder_url:
            clientWorkspace.coachWorkspace.managed_workspace_root_folder_url ?? null,
          managed_clients_folder_id: clientWorkspace.coachWorkspace.managed_clients_folder_id ?? null,
          managed_clients_folder_url:
            clientWorkspace.coachWorkspace.managed_clients_folder_url ?? null,
          managed_pt_library_sheet_id:
            clientWorkspace.coachWorkspace.managed_pt_library_sheet_id ?? null,
          managed_pt_library_sheet_url:
            clientWorkspace.coachWorkspace.managed_pt_library_sheet_url ?? null,
          managed_nutrition_library_sheet_id:
            clientWorkspace.coachWorkspace.managed_nutrition_library_sheet_id ?? null,
          managed_nutrition_library_sheet_url:
            clientWorkspace.coachWorkspace.managed_nutrition_library_sheet_url ?? null,
          managed_wellness_library_sheet_id:
            clientWorkspace.coachWorkspace.managed_wellness_library_sheet_id ?? null,
          managed_wellness_library_sheet_url:
            clientWorkspace.coachWorkspace.managed_wellness_library_sheet_url ?? null,
          managed_workspace_sheet_modules: modules.enableable_modules,
          managed_workspace_sheet_provisioned_at: completedAt,
          updated_at: completedAt,
        },
        { onConflict: "user_id" }
      )

    if (adminSettingsError) {
      throw new Error("Failed to save repaired workspace metadata.")
    }

    const { error: clientUpdateError } = await supabase
      .from("clients")
      .update({
        sheet_id: clientWorkspace.sheetId,
        drive_folder_id: clientWorkspace.driveFolderId,
        drive_folder_url: clientWorkspace.driveFolderUrl,
        sheet_shared_email: clientWorkspace.sheet_shared_email ?? null,
        sheet_shared_permission_id: clientWorkspace.sheet_shared_permission_id ?? null,
        sheet_shared_at: clientWorkspace.sheet_shared_at ?? null,
        provisioning_status: "ready",
        provisioning_started_at: client.provisioning_started_at ?? repairStartedAt,
        provisioning_completed_at: completedAt,
        provisioning_last_error: null,
        updated_at: completedAt,
      })
      .eq("id", client.id)

    if (clientUpdateError) {
      throw new Error("Failed to save repaired client workspace state.")
    }

    return NextResponse.json({
      ok: true,
      sheet_id: clientWorkspace.sheetId,
      drive_folder_id: clientWorkspace.driveFolderId,
      drive_folder_url: clientWorkspace.driveFolderUrl,
      sheet_shared_at: clientWorkspace.sheet_shared_at ?? null,
    })
  } catch (error) {
    await supabase
      .from("clients")
      .update({
        provisioning_status: "failed",
        provisioning_last_error:
          error instanceof Error && error.message
            ? error.message
            : "Workspace repair failed.",
        provisioning_completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", client.id)

    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : "Workspace repair failed.",
      },
      { status: 500 }
    )
  }
}
