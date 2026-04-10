import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { updateClientWellnessGoalAssignment } from "@/lib/wellness"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const { id, assignmentId } = await params
  const body = await request.json()

  try {
    const assignment = await updateClientWellnessGoalAssignment(supabase, user.id, id, assignmentId, body)
    return NextResponse.json({ assignment })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update goal" },
      { status: 400 }
    )
  }
}
