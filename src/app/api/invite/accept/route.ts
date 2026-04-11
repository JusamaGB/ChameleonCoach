import { NextResponse, type NextRequest } from "next/server"
import { createAdmin } from "@/lib/supabase/server"
import { createClientSheet, getCoachDriveWorkspaceHealth } from "@/lib/google/template"
import type { OnboardingData } from "@/types"
import { getCoachBrandingByCoachId } from "@/lib/branding-server"
import { normalizeCoachTypePreset, resolveActiveModules } from "@/lib/modules"
import { findClientInviteByToken, getClientInviteContactType, isMissingInviteMetadataColumns } from "@/lib/clients"
import { isPendingInviteEmail, normalizeEmail } from "@/lib/utils"

async function markProvisioningState(
  supabase: ReturnType<typeof createAdmin>,
  clientId: string,
  state: {
    provisioning_status: "pending" | "provisioning" | "ready" | "failed"
    provisioning_started_at?: string | null
    provisioning_completed_at?: string | null
    provisioning_last_error?: string | null
    invite_accepted_at?: string | null
    onboarding_completed?: boolean
  }
) {
  await supabase
    .from("clients")
    .update({
      ...state,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId)
}

// GET: validate token
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")

  if (!token) {
    return NextResponse.json({ valid: false, reason: "missing" })
  }

  const supabase = createAdmin()
  const { data: client } = await findClientInviteByToken(
    supabase,
    token,
    "email, invite_expires_at, onboarding_completed, coach_id"
  )

  if (!client) {
    return NextResponse.json({ valid: false, reason: "invalid" })
  }

  const branding = await getCoachBrandingByCoachId(client.coach_id)

  if (client.onboarding_completed) {
    return NextResponse.json({ valid: false, reason: "already_used", branding })
  }

  if (
    client.invite_expires_at &&
    new Date(client.invite_expires_at) < new Date()
  ) {
    return NextResponse.json({ valid: false, reason: "expired", branding })
  }

  return NextResponse.json({
    valid: true,
    email: isPendingInviteEmail(client.email) ? "" : client.email,
    branding,
  })
}

// POST: complete onboarding
export async function POST(request: NextRequest) {
  const { token, password, onboarding, accountEmail } = (await request.json()) as {
    token: string
    password: string
    accountEmail?: string
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
  const { data: client } = await findClientInviteByToken(
    supabase,
    token,
    "*, coach_id"
  )

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

  const inviteContactType = getClientInviteContactType(client)
  const resolvedEmail = isPendingInviteEmail(client.email)
    ? normalizeEmail(accountEmail ?? "")
    : normalizeEmail(client.email)

  if (!resolvedEmail) {
    return NextResponse.json(
      {
        error:
          inviteContactType === "phone"
            ? "An email address is required to create the client login."
            : "Missing client email address.",
      },
      { status: 400 }
    )
  }

  const { data: settings } = client.coach_id
    ? await supabase
        .from("admin_settings")
        .select("google_refresh_token, coach_type_preset, active_modules, managed_workspace_sheet_id, managed_workspace_sheet_url, managed_workspace_root_folder_id, managed_workspace_root_folder_url, managed_clients_folder_id, managed_clients_folder_url, managed_pt_library_sheet_id, managed_pt_library_sheet_url, managed_nutrition_library_sheet_id, managed_nutrition_library_sheet_url, managed_wellness_library_sheet_id, managed_wellness_library_sheet_url, managed_workspace_sheet_modules, managed_workspace_sheet_provisioned_at")
        .eq("user_id", client.coach_id)
        .maybeSingle()
    : { data: null }

  const modules = resolveActiveModules(settings ?? {})

  if (client.coach_id) {
    const workspaceHealth = await getCoachDriveWorkspaceHealth({
      coachId: client.coach_id,
      activeModules: modules.enableable_modules,
      settings,
    })

    if (workspaceHealth.status !== "healthy") {
      return NextResponse.json(
        {
          error:
            workspaceHealth.status === "disconnected"
              ? "Your coach needs to reconnect Google before onboarding can finish."
              : workspaceHealth.status === "not_provisioned"
                ? "Your coach still needs to create the Chameleon client workspace before onboarding can finish."
                : `Your coach's client workspace is incomplete. Missing: ${workspaceHealth.missingArtifacts.join(", ")}.`,
        },
        { status: 409 }
      )
    }
  }

  const acceptedAt = new Date().toISOString()
  await markProvisioningState(supabase, client.id, {
    provisioning_status: "provisioning",
    provisioning_started_at: acceptedAt,
    provisioning_completed_at: null,
    provisioning_last_error: null,
    invite_accepted_at: acceptedAt,
    onboarding_completed: false,
  })

  // Create Supabase auth user
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: resolvedEmail,
      password,
      email_confirm: true,
    })

  if (authError || !authData.user) {
    await markProvisioningState(supabase, client.id, {
      provisioning_status: "failed",
      provisioning_last_error: authError?.message || "Failed to create account",
    })
    return NextResponse.json(
      { error: authError?.message || "Failed to create account" },
      { status: 500 }
    )
  }

  // Create client workspace in the coach-owned Google Drive hierarchy.
  let sheetId: string | null = null
  let driveFolderId: string | null = null
  let driveFolderUrl: string | null = null
  let sheetSharedEmail: string | null = null
  let sheetSharedPermissionId: string | null = null
  let sheetSharedAt: string | null = null
  try {
    if (client.coach_id) {
      const clientWorkspace = await createClientSheet({
        clientId: client.id,
        clientName: onboarding.name,
        clientEmail: resolvedEmail,
        onboarding,
        coachId: client.coach_id,
        coachTypePreset: normalizeCoachTypePreset(settings?.coach_type_preset),
        activeModules: modules.enableable_modules,
        coachWorkspace: settings,
        clientWorkspace: client,
        shareWithClient: true,
      })

      sheetId = clientWorkspace.sheetId
      driveFolderId = clientWorkspace.driveFolderId
      driveFolderUrl = clientWorkspace.driveFolderUrl
      sheetSharedEmail = clientWorkspace.sheet_shared_email ?? null
      sheetSharedPermissionId = clientWorkspace.sheet_shared_permission_id ?? null
      sheetSharedAt = clientWorkspace.sheet_shared_at ?? null

      const { error: adminSettingsError } = await supabase
        .from("admin_settings")
        .upsert(
          {
            user_id: client.coach_id,
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
            managed_workspace_sheet_provisioned_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )

      if (adminSettingsError) {
        throw new Error("Failed to save coach workspace metadata.")
      }
    }

    let { error: clientUpdateError } = await supabase
      .from("clients")
      .update({
        user_id: authData.user.id,
        name: onboarding.name,
        email: resolvedEmail,
        sheet_id: sheetId,
        drive_folder_id: driveFolderId,
        drive_folder_url: driveFolderUrl,
        sheet_shared_email: sheetSharedEmail,
        sheet_shared_permission_id: sheetSharedPermissionId,
        sheet_shared_at: sheetSharedAt,
        invite_code: null,
        invite_contact_type: null,
        invite_contact_value: null,
        invite_accepted_at: acceptedAt,
        onboarding_completed: true,
        provisioning_status: "ready",
        provisioning_started_at: acceptedAt,
        provisioning_completed_at: new Date().toISOString(),
        provisioning_last_error: null,
        invite_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", client.id)

    if (isMissingInviteMetadataColumns(clientUpdateError)) {
      const fallbackUpdate = await supabase
        .from("clients")
        .update({
          user_id: authData.user.id,
          name: onboarding.name,
          email: resolvedEmail,
          sheet_id: sheetId,
          drive_folder_id: driveFolderId,
          drive_folder_url: driveFolderUrl,
          sheet_shared_email: sheetSharedEmail,
          sheet_shared_permission_id: sheetSharedPermissionId,
          sheet_shared_at: sheetSharedAt,
          invite_accepted_at: acceptedAt,
          onboarding_completed: true,
          provisioning_status: "ready",
          provisioning_started_at: acceptedAt,
          provisioning_completed_at: new Date().toISOString(),
          provisioning_last_error: null,
          invite_token: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", client.id)

      clientUpdateError = fallbackUpdate.error
    }

    if (clientUpdateError) {
      throw new Error("Failed to finish onboarding.")
    }
  } catch (error) {
    await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {})

    await markProvisioningState(supabase, client.id, {
      provisioning_status: "failed",
      provisioning_last_error:
        error instanceof Error && error.message
          ? error.message
          : "Client workspace provisioning failed",
      provisioning_completed_at: null,
      onboarding_completed: false,
    })

    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message
            ? `We couldn't finish setting up your client workspace: ${error.message}`
            : "We couldn't finish setting up your client workspace. Please ask your coach to verify the Google workspace and try again.",
      },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
