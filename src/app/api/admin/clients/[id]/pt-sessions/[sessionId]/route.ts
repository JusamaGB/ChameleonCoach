import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { updateClientPTSessionForCoach } from "@/lib/pt"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const { id, sessionId } = await params

  const body = await request.json()

  try {
    const session = await updateClientPTSessionForCoach(supabase, user.id, id, sessionId, {
      scheduled_date: body.scheduled_date,
      status: body.status,
      coach_note: body.coach_note,
    })
    return NextResponse.json({ session })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update PT session" },
      { status: 500 }
    )
  }
}
