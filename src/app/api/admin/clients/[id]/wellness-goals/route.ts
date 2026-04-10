import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { assignWellnessGoalToClient } from "@/lib/wellness"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const { id } = await params
  const body = await request.json()

  if (typeof body.goal_template_id !== "string" || body.goal_template_id.length === 0) {
    return NextResponse.json({ error: "goal_template_id is required" }, { status: 400 })
  }

  try {
    const assignment = await assignWellnessGoalToClient(
      supabase,
      user.id,
      id,
      body.goal_template_id,
      body.assigned_start_date || null
    )
    return NextResponse.json({ assignment })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to assign goal" },
      { status: 400 }
    )
  }
}
