import { createClient } from "@/lib/supabase/server"
import { Card } from "@/components/ui/card"
import { resolveActiveModules } from "@/lib/modules"
import { WorkoutBuilder } from "@/components/admin/workout-builder"
import { listPTWorkoutsForCoach } from "@/lib/pt"
import type { Exercise } from "@/types"

export const dynamic = "force-dynamic"

export default async function AdminWorkoutsPage() {
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
            Enable PT Core from Modules to build reusable workouts.
          </p>
        </Card>
      </div>
    )
  }

  const [{ data: exercises }, workouts] = await Promise.all([
    supabase.from("exercises").select("*").eq("coach_id", user?.id).order("name", { ascending: true }),
    user ? listPTWorkoutsForCoach(supabase, user.id) : Promise.resolve([]),
  ])

  return (
    <WorkoutBuilder
      initialExercises={(exercises ?? []) as Exercise[]}
      initialWorkouts={workouts as any}
    />
  )
}
