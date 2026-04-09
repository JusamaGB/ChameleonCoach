import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { updateClientNutritionHabitLog } from "@/lib/nutrition"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const { id, logId } = await params
  const body = await request.json()

  try {
    const habitLog = await updateClientNutritionHabitLog(supabase, user.id, id, logId, {
      adherence_score: body.adherence_score,
      coach_note: body.coach_note,
      notes: body.notes,
      completion_status: body.completion_status,
      completion_date: body.completion_date,
      logged_at: body.logged_at,
    })
    return NextResponse.json({ habitLog })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update nutrition habit log" },
      { status: 400 }
    )
  }
}
