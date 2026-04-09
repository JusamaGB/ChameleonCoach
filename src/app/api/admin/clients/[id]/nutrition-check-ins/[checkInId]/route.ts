import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { updateClientNutritionCheckIn } from "@/lib/nutrition"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; checkInId: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const { id, checkInId } = await params
  const body = await request.json()

  try {
    const checkIn = await updateClientNutritionCheckIn(supabase, user.id, id, checkInId, body)
    return NextResponse.json({ checkIn })
  } catch {
    return NextResponse.json({ error: "Failed to update nutrition check-in" }, { status: 500 })
  }
}
