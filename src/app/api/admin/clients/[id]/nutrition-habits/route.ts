import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import {
  assignNutritionHabitToClient,
  listClientNutritionHabitAssignmentsForCoach,
} from "@/lib/nutrition"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const { id } = await params

  try {
    const assignments = await listClientNutritionHabitAssignmentsForCoach(supabase, user.id, id)
    return NextResponse.json({ assignments })
  } catch {
    return NextResponse.json({ error: "Failed to load nutrition habit assignments" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const { id } = await params
  const body = await request.json()

  if (typeof body.habit_template_id !== "string" || body.habit_template_id.trim().length === 0) {
    return NextResponse.json({ error: "Habit template is required" }, { status: 400 })
  }

  try {
    const assignment = await assignNutritionHabitToClient(
      supabase,
      user.id,
      id,
      body.habit_template_id,
      typeof body.assigned_start_date === "string" ? body.assigned_start_date : null
    )
    return NextResponse.json({ assignment })
  } catch {
    return NextResponse.json({ error: "Failed to assign nutrition habit" }, { status: 500 })
  }
}
