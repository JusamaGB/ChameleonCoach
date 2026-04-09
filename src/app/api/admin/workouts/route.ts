import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { createPTWorkout, listPTWorkoutsForCoach } from "@/lib/pt"

export async function GET() {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result

  try {
    const workouts = await listPTWorkoutsForCoach(supabase, user.id)
    return NextResponse.json({ workouts })
  } catch {
    return NextResponse.json({ error: "Failed to load workouts" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result

  const body = await request.json()
  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "Workout name is required" }, { status: 400 })
  }

  try {
    const workout = await createPTWorkout(supabase, user.id, {
      name: body.name,
      description: body.description,
      goal: body.goal,
      estimated_duration_minutes: body.estimated_duration_minutes,
      difficulty: body.difficulty,
      exercises: Array.isArray(body.exercises) ? body.exercises : [],
    })
    return NextResponse.json({ workout })
  } catch {
    return NextResponse.json({ error: "Failed to create workout" }, { status: 500 })
  }
}
