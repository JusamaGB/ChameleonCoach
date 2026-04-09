import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { updateClientNutritionLogEntry } from "@/lib/nutrition"

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
    const log = await updateClientNutritionLogEntry(supabase, user.id, id, logId, body)
    return NextResponse.json({ log })
  } catch {
    return NextResponse.json({ error: "Failed to update nutrition log" }, { status: 500 })
  }
}
