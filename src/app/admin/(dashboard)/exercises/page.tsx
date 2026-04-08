import { createClient } from "@/lib/supabase/server"
import { Card } from "@/components/ui/card"
import { ExerciseLibraryManager } from "@/components/admin/exercise-library-manager"
import type { Exercise } from "@/types"

export const dynamic = "force-dynamic"

export default async function AdminExercisesPage() {
  const supabase = await createClient()

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
