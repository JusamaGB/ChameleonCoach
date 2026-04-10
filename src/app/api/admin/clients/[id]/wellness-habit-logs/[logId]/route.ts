import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { updateClientWellnessHabitLog } from "@/lib/wellness"

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
    const log = await updateClientWellnessHabitLog(supabase, user.id, id, logId, body)
    return NextResponse.json({ log })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update habit log" },
      { status: 400 }
    )
  }
}
