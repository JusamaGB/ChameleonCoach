import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { createPTProgram, listPTProgramsForCoach } from "@/lib/pt"

export async function GET() {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result

  try {
    const programs = await listPTProgramsForCoach(supabase, user.id)
    return NextResponse.json({ programs })
  } catch {
    return NextResponse.json({ error: "Failed to load programs" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result

  const body = await request.json()
  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "Program name is required" }, { status: 400 })
  }

  try {
    const program = await createPTProgram(supabase, user.id, {
      name: body.name,
      description: body.description,
      goal: body.goal,
      duration_weeks: body.duration_weeks,
      difficulty: body.difficulty,
      sessions: Array.isArray(body.sessions) ? body.sessions : [],
    })
    return NextResponse.json({ program })
  } catch {
    return NextResponse.json({ error: "Failed to create program" }, { status: 500 })
  }
}
