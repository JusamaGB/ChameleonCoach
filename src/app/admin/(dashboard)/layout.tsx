import { AdminNav } from "@/components/layout/admin-nav"
import { MigrationWidget } from "@/components/admin/migration-widget"
import { createClient, createAdmin } from "@/lib/supabase/server"
import { resolveActiveModules } from "@/lib/modules"
import { getCoachDriveWorkspaceHealth } from "@/lib/google/template"

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let activeModules = ["shared_core"]

  if (user) {
    const admin = createAdmin()
    const { data: settings } = await admin
      .from("admin_settings")
      .select("google_refresh_token, active_modules, coach_type_preset, managed_workspace_sheet_id, managed_workspace_sheet_url, managed_workspace_sheet_modules, managed_workspace_sheet_provisioned_at, managed_workspace_root_folder_id, managed_workspace_root_folder_url, managed_clients_folder_id, managed_clients_folder_url, managed_pt_library_sheet_id, managed_pt_library_sheet_url, managed_nutrition_library_sheet_id, managed_nutrition_library_sheet_url")
      .eq("user_id", user.id)
      .maybeSingle()
    const modules = resolveActiveModules(settings ?? {})
    activeModules = modules.active_modules

    if (settings?.google_refresh_token) {
      try {
        await getCoachDriveWorkspaceHealth({
          coachId: user.id,
          activeModules: modules.enableable_modules,
          settings,
        })
      } catch {
        // Ignore background health-check failures here; the settings route reports the live state.
      }
    }
  }

  return (
    <div className="flex min-h-screen">
      <AdminNav activeModules={activeModules} />
      <main className="flex-1 p-6 md:p-10 pt-20 md:pt-6">{children}</main>
      <MigrationWidget />
    </div>
  )
}
