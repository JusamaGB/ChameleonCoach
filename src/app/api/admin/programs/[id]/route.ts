import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { updatePTProgram } from "@/lib/pt"

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
    return NextResponse.json({ error: "Program name is required" }, { status: 400 })
  }

  try {
    const program = await updatePTProgram(supabase, user.id, id, {
      name: body.name,
      description: body.description,
      goal: body.goal,
      duration_weeks: body.duration_weeks,
      difficulty: body.difficulty,
      is_archived: body.is_archived,
      sessions: Array.isArray(body.sessions) ? body.sessions : [],
    })
    return NextResponse.json({ program })
  } catch {
    return NextResponse.json({ error: "Failed to update program" }, { status: 500 })
  }
}
