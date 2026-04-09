import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { updateClientPTSessionExerciseForCoach } from "@/lib/pt"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string; exerciseId: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const { id, sessionId, exerciseId } = await params

  const body = await request.json()

  try {
    const sessionExercise = await updateClientPTSessionExerciseForCoach(
      supabase,
      user.id,
      id,
      sessionId,
      exerciseId,
      {
        block_label: body.block_label,
        sets: body.sets,
        reps: body.reps,
        duration_seconds: body.duration_seconds,
        distance_value: body.distance_value,
        distance_unit: body.distance_unit,
        rest_seconds: body.rest_seconds,
        tempo: body.tempo,
        load_guidance: body.load_guidance,
        rpe_target: body.rpe_target,
        notes: body.notes,
      }
    )

    return NextResponse.json({ sessionExercise })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update PT session exercise" },
      { status: 500 }
    )
  }
}
