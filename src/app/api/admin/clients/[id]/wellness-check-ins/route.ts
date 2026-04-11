import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { assertCoachWellnessAccess, createClientWellnessCheckIn, WellnessAccessError } from "@/lib/wellness"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const { id } = await params
  const body = await request.json()

  try {
    await assertCoachWellnessAccess(supabase, user.id)
    const checkIn = await createClientWellnessCheckIn(supabase, user.id, id, body)
    return NextResponse.json({ check_in: checkIn })
  } catch (error) {
    const status = error instanceof WellnessAccessError ? error.status : 400
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create check-in" },
      { status }
    )
  }
}
