import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { assignWellnessHabitToClient } from "@/lib/wellness"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const { id } = await params
  const body = await request.json()

  if (typeof body.habit_template_id !== "string" || body.habit_template_id.length === 0) {
    return NextResponse.json({ error: "habit_template_id is required" }, { status: 400 })
  }

  try {
    const assignment = await assignWellnessHabitToClient(
      supabase,
      user.id,
      id,
      body.habit_template_id,
      body.assigned_start_date || null
    )
    return NextResponse.json({ assignment })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to assign habit" },
      { status: 400 }
    )
  }
}
