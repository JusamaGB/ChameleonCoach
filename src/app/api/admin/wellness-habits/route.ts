import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { assertCoachWellnessAccess, createWellnessHabitTemplate, listWellnessHabitTemplatesForCoach, WellnessAccessError } from "@/lib/wellness"

export async function GET() {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result

  try {
    await assertCoachWellnessAccess(supabase, user.id)
    const habits = await listWellnessHabitTemplatesForCoach(supabase, user.id)
    return NextResponse.json({ habits })
  } catch (error) {
    const status = error instanceof WellnessAccessError ? error.status : 500
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load wellness habits" }, { status })
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
    await assertCoachWellnessAccess(supabase, user.id)
    const habit = await createWellnessHabitTemplate(supabase, user.id, body)
    return NextResponse.json({ habit })
  } catch (error) {
    const status = error instanceof WellnessAccessError ? error.status : 500
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create wellness habit" }, { status })
  }
}
