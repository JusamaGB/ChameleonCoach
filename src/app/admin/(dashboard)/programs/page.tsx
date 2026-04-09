import { createClient } from "@/lib/supabase/server"
import { Card } from "@/components/ui/card"
import { resolveActiveModules } from "@/lib/modules"
import { ProgramsManager } from "@/components/admin/programs-manager"
import { listPTProgramsForCoach } from "@/lib/pt"
import type { PTWorkout } from "@/types"

export const dynamic = "force-dynamic"

export default async function AdminProgramsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: settings } = user
    ? await supabase
        .from("admin_settings")
        .select("coach_type_preset, active_modules")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null }

  const modules = resolveActiveModules(settings ?? {})

  if (!modules.has_module("pt_core")) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="border-yellow-500/30">
          <p className="text-sm text-yellow-300">PT Core is not active for this workspace.</p>
          <p className="mt-2 text-sm text-gf-muted">
            Enable PT Core from Modules to build reusable programs.
          </p>
        </Card>
      </div>
    )
  }

  const [{ data: workouts }, programs] = await Promise.all([
    supabase.from("pt_workouts").select("*").eq("coach_id", user?.id).eq("is_archived", false).order("name", { ascending: true }),
    user ? listPTProgramsForCoach(supabase, user.id) : Promise.resolve([]),
  ])

  return (
    <ProgramsManager
      initialPrograms={programs as any}
      workouts={(workouts ?? []) as PTWorkout[]}
    />
  )
}
