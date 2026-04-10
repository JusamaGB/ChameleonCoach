import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { createWellnessHabitTemplate, listWellnessHabitTemplatesForCoach } from "@/lib/wellness"

export async function GET() {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result

  try {
    const habits = await listWellnessHabitTemplatesForCoach(supabase, user.id)
    return NextResponse.json({ habits })
  } catch {
    return NextResponse.json({ error: "Failed to load wellness habits" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const body = await request.json()

  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "Habit name is required" }, { status: 400 })
  }

  try {
    const habit = await createWellnessHabitTemplate(supabase, user.id, body)
    return NextResponse.json({ habit })
  } catch {
    return NextResponse.json({ error: "Failed to create wellness habit" }, { status: 500 })
  }
}
