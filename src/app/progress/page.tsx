import { createClient } from "@/lib/supabase/server"
import { getProgress } from "@/lib/google/sheets"
import type { ProgressEntry } from "@/types"
import { ClientNav } from "@/components/layout/client-nav"
import { PoweredBy } from "@/components/branding/powered-by"
import { ProgressForm } from "@/components/progress/progress-form"
import { ProgressChart, ProgressHistory } from "@/components/progress/progress-chart"
import { redirect } from "next/navigation"
import { getClientPortalContext } from "@/lib/client-portal"

export const dynamic = 'force-dynamic'

export default async function ProgressPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", user.id)
    .single()
  const portal = await getClientPortalContext(user.id)

  let progress: ProgressEntry[] = []

  if (client?.sheet_id && client?.coach_id) {
    try {
      progress = await getProgress(client.sheet_id, client.coach_id)
    } catch {
      // Sheet not accessible
    }
  }
  const branding = portal.branding

  return (
    <div className="flex min-h-screen">
      <ClientNav branding={branding} activeModules={portal.modules.active_modules} />
      <main className="flex-1 p-6 md:p-10 pb-24 md:pb-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-2" style={{ color: branding.brand_primary_color }}>
            Progress
          </h1>
          <p className="text-gf-muted mb-8">
            Track your journey and see how far you&apos;ve come
          </p>

          <div className="grid gap-6">
            <ProgressForm primaryColor={branding.brand_primary_color} />
            <ProgressChart entries={progress} primaryColor={branding.brand_primary_color} />
            <ProgressHistory entries={progress} primaryColor={branding.brand_primary_color} />
            {branding.show_powered_by && <PoweredBy />}
          </div>
        </div>
      </main>
    </div>
  )
}
