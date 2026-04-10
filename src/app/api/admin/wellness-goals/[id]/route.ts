import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { updateWellnessGoalTemplate } from "@/lib/wellness"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const { id } = await params
  const body = await request.json()

  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "Goal name is required" }, { status: 400 })
  }

  try {
    const goal = await updateWellnessGoalTemplate(supabase, user.id, id, body)
    return NextResponse.json({ goal })
  } catch {
    return NextResponse.json({ error: "Failed to update wellness goal" }, { status: 500 })
  }
}
