import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { sendInviteEmail } from "@/lib/resend"
import { generateToken } from "@/lib/utils"
import { getCoachBrandingByCoachId } from "@/lib/branding-server"
import { resolveActiveModules } from "@/lib/modules"
import { getCoachDriveWorkspaceHealth } from "@/lib/google/template"

export async function POST(request: NextRequest) {
  try {
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

    const { data: existing } = await supabase
      .from("clients")
      .select("id, onboarding_completed")
      .eq("email", email)
      .eq("coach_id", user.id)
      .maybeSingle()

    if (existing?.onboarding_completed) {
      return NextResponse.json(
        { error: "This client is already onboarded" },
        { status: 400 }
      )
    }

    const token = generateToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    if (existing) {
      const { error } = await supabase
        .from("clients")
        .update({
          name,
          invite_token: token,
          invite_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)

      if (error) {
        throw new Error(error.message || "Failed to update client invite")
      }
    } else {
      const { error } = await supabase.from("clients").insert({
        name,
        email,
        coach_id: user.id,
        invite_token: token,
        invite_expires_at: expiresAt,
      })

      if (error) {
        throw new Error(error.message || "Failed to create client invite")
      }
    }

    const branding = await getCoachBrandingByCoachId(user.id)
    await sendInviteEmail(email, name, token, branding)

    return NextResponse.json({ ok: true })
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
