import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { sendInviteEmail } from "@/lib/resend"
import {
  buildPendingInviteEmail,
  generateInviteCode,
  generateToken,
  normalizeInviteContactValue,
} from "@/lib/utils"
import { getCoachBrandingByCoachId } from "@/lib/branding-server"
import { resolveActiveModules } from "@/lib/modules"
import { getCoachDriveWorkspaceHealth } from "@/lib/google/template"
import { findClientByEmailForCoach, findPendingClientInviteForCoach, insertClientForCoach, isMissingInviteMetadataColumns } from "@/lib/clients"

export async function POST(request: NextRequest) {
  try {
    const result = await verifyCoach()
    if (!isCoachResult(result)) return result
    const { user, supabase } = result

    const {
      name,
      contact_type,
      contact_value,
      send_email,
    } = await request.json()

    if (!name || !contact_type || !contact_value) {
      return NextResponse.json(
        { error: "Name and contact details are required" },
        { status: 400 }
      )
    }

    const contactType = contact_type === "phone" ? "phone" : "email"
    const normalizedContactValue = normalizeInviteContactValue(contactType, contact_value)
    const email =
      contactType === "email"
        ? normalizedContactValue
        : buildPendingInviteEmail(generateToken())

    const { data: settings } = await supabase
      .from("admin_settings")
      .select("google_refresh_token, coach_type_preset, active_modules, managed_workspace_sheet_id, managed_workspace_sheet_url, managed_workspace_sheet_modules, managed_workspace_sheet_provisioned_at, managed_workspace_root_folder_id, managed_workspace_root_folder_url, managed_clients_folder_id, managed_clients_folder_url, managed_pt_library_sheet_id, managed_pt_library_sheet_url, managed_nutrition_library_sheet_id, managed_nutrition_library_sheet_url")
      .eq("user_id", user.id)
      .maybeSingle()

    const modules = resolveActiveModules(settings ?? {})
    const workspaceHealth = await getCoachDriveWorkspaceHealth({
      coachId: user.id,
      activeModules: modules.enableable_modules,
      settings,
    })

    if (workspaceHealth.status !== "healthy") {
      const reason =
        workspaceHealth.status === "disconnected"
          ? "Connect Google and create Chameleon Sheets before inviting clients."
          : workspaceHealth.status === "not_provisioned"
            ? "Create Chameleon Sheets before inviting clients."
            : workspaceHealth.missingArtifacts.length > 0
              ? `Repair the managed Drive workspace before inviting clients. Missing: ${workspaceHealth.missingArtifacts.join(", ")}.`
              : "Client invites are blocked until the managed Drive workspace is healthy."

      return NextResponse.json({ error: reason }, { status: 400 })
    }

    const contactLookup =
      contactType === "email"
        ? await findClientByEmailForCoach(supabase, user.id, normalizedContactValue)
        : await findPendingClientInviteForCoach(supabase, user.id, contactType, normalizedContactValue)

    const existing = contactLookup.data
    const existingError = contactLookup.error

    if (existingError) {
      throw new Error(existingError.message || "Failed to look up existing client")
    }

    if (existing?.onboarding_completed) {
      return NextResponse.json(
        { error: "This client is already onboarded" },
        { status: 400 }
      )
    }

    const token = generateToken()
    const inviteCode = generateInviteCode()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    if (existing) {
      let { error } = await supabase
        .from("clients")
        .update({
          name,
          email,
          invite_token: token,
          invite_code: inviteCode,
          invite_contact_type: contactType,
          invite_contact_value: normalizedContactValue,
          drive_folder_url: inviteCode,
          sheet_shared_permission_id: contactType,
          sheet_shared_email: normalizedContactValue,
          invite_expires_at: expiresAt,
          provisioning_status: "pending",
          provisioning_started_at: null,
          provisioning_completed_at: null,
          provisioning_last_error: null,
          onboarding_completed: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)

      if (isMissingInviteMetadataColumns(error)) {
        const fallbackUpdate = await supabase
          .from("clients")
          .update({
            name,
            email,
            invite_token: token,
            drive_folder_url: inviteCode,
            sheet_shared_permission_id: contactType,
            sheet_shared_email: normalizedContactValue,
            invite_expires_at: expiresAt,
            provisioning_status: "pending",
            provisioning_started_at: null,
            provisioning_completed_at: null,
            provisioning_last_error: null,
            onboarding_completed: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)

        error = fallbackUpdate.error
      }

      if (error) {
        throw new Error(error.message || "Failed to update client invite")
      }
    } else {
      const { error } = await insertClientForCoach(supabase, {
        coachId: user.id,
        name,
        email,
        inviteToken: token,
        inviteCode,
        inviteContactType: contactType,
        inviteContactValue: normalizedContactValue,
        inviteExpiresAt: expiresAt,
      })

      if (error) {
        throw new Error(error.message || "Failed to create client invite")
      }
    }

    const branding = await getCoachBrandingByCoachId(user.id)
    if (send_email && contactType === "email") {
      await sendInviteEmail(email, name, inviteCode, contactType, branding)
    }

    return NextResponse.json({
      ok: true,
      invite_code: inviteCode,
      contact_type: contactType,
      contact_value: normalizedContactValue,
      join_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/onboarding`,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : "Failed to send invite",
      },
      { status: 500 }
    )
  }
}
