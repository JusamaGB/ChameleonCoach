import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { createCoachInvoice } from "@/lib/coach-payments"
import { createAdmin } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user } = result
  const admin = createAdmin()

  try {
    const body = await request.json()
    const invoice = await createCoachInvoice(admin, {
      coachId: user.id,
      clientId: body.client_id,
      currency: body.currency,
      dueDate: body.due_date,
      description: body.description,
      internalNote: body.internal_note,
      sourceAppointmentId: body.source_appointment_id,
      items: Array.isArray(body.items) ? body.items : [],
    })

    return NextResponse.json({ ok: true, invoice })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create invoice" },
      { status: 400 }
    )
  }
}
