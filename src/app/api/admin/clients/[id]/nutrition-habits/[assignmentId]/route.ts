import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { updateClientNutritionHabitAssignment } from "@/lib/nutrition"

const ALLOWED_STATUSES = new Set(["active", "completed", "cancelled"])

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const { id, assignmentId } = await params
  const body = await request.json()

  if (body.status && !ALLOWED_STATUSES.has(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  try {
    const assignment = await updateClientNutritionHabitAssignment(
      supabase,
      user.id,
      id,
      assignmentId,
      body
    )
    return NextResponse.json({ assignment })
  } catch {
    return NextResponse.json({ error: "Failed to update nutrition habit assignment" }, { status: 500 })
  }
}
