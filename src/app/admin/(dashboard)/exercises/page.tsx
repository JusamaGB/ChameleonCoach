import { createClient } from "@/lib/supabase/server"
import { Card } from "@/components/ui/card"
import { ExerciseLibraryManager } from "@/components/admin/exercise-library-manager"
import type { Exercise } from "@/types"
import { resolveActiveModules } from "@/lib/modules"

export const dynamic = "force-dynamic"

export default async function AdminExercisesPage() {
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
            Enable PT Core from Modules to use the exercise library.
          </p>
        </Card>
      </div>
    )
  }

  let exercises: Exercise[] = []
  let dbError: string | null = null

  try {
    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .order("name", { ascending: true })

    if (error) {
      dbError = error.message
    } else {
      exercises = (data ?? []) as Exercise[]
    }
  } catch (error) {
    dbError = error instanceof Error ? error.message : "Failed to load exercises"
  }

  return (
    <>
      {dbError ? (
        <div className="max-w-6xl mx-auto">
          <Card className="border-yellow-500/30">
            <p className="text-sm text-yellow-400">Database notice: {dbError}</p>
            <p className="mt-1 text-xs text-gf-muted">
              The exercise library migration may still need to be applied in Supabase.
            </p>
          </Card>
        </div>
      ) : null}

      <ExerciseLibraryManager initialExercises={exercises} />
    </>
  )
}
