import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { updateWellnessHabitTemplate } from "@/lib/wellness"

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
    return NextResponse.json({ error: "Habit name is required" }, { status: 400 })
  }

  try {
    const habit = await updateWellnessHabitTemplate(supabase, user.id, id, body)
    return NextResponse.json({ habit })
  } catch {
    return NextResponse.json({ error: "Failed to update wellness habit" }, { status: 500 })
  }
}
