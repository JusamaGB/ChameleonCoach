import { NextResponse, type NextRequest } from "next/server"
import { createAdmin, createClient } from "@/lib/supabase/server"
import { createClientNutritionHabitLogForUser } from "@/lib/nutrition"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const admin = createAdmin()
    const body = await request.json()
    if (typeof body.assignment_id !== "string" || body.assignment_id.length === 0) {
      return NextResponse.json({ error: "assignment_id is required" }, { status: 400 })
    }

    const habitLog = await createClientNutritionHabitLogForUser(admin, user.id, {
      assignment_id: body.assignment_id,
      completion_date: body.completion_date || null,
      completion_status: body.completion_status,
      adherence_score: body.adherence_score,
      notes: body.notes,
    })
    return NextResponse.json({ ok: true, habit_log: habitLog })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save nutrition habit log" },
      { status: 500 }
    )
  }
}
