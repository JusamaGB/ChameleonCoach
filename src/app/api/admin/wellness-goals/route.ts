import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { createWellnessGoalTemplate, listWellnessGoalTemplatesForCoach } from "@/lib/wellness"

export async function GET() {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result

  try {
    const goals = await listWellnessGoalTemplatesForCoach(supabase, user.id)
    return NextResponse.json({ goals })
  } catch {
    return NextResponse.json({ error: "Failed to load wellness goals" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const body = await request.json()

  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "Goal name is required" }, { status: 400 })
  }

  try {
    const goal = await createWellnessGoalTemplate(supabase, user.id, body)
    return NextResponse.json({ goal })
  } catch {
    return NextResponse.json({ error: "Failed to create wellness goal" }, { status: 500 })
  }
}
