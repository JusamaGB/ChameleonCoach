import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { sendAppointmentConfirmedEmail } from "@/lib/resend"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { supabase } = result

  const { id } = await params
  const { status, confirmed_at, coach_note } = await request.json()

  if (!status) {
    return NextResponse.json({ error: "status is required" }, { status: 400 })
  }

  const updateData: Record<string, string | null> = {
    status,
    coach_note: coach_note ?? null,
    updated_at: new Date().toISOString(),
  }
  if (status === "confirmed" && confirmed_at) {
    updateData.confirmed_at = confirmed_at
  }

  const { data: appointment, error } = await supabase
    .from("appointments")
    .update(updateData)
    .eq("id", id)
    .select(`*, clients (name, email)`)
    .single()

  if (error || !appointment) {
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 })
  }

  // Email client on confirmation
  if (status === "confirmed" && confirmed_at && appointment.clients) {
    try {
      await sendAppointmentConfirmedEmail(
        appointment.clients.email,
        appointment.clients.name || "there",
        confirmed_at,
        coach_note || ""
      )
    } catch {
      // Email failure is non-fatal
    }
  }

  return NextResponse.json({ ok: true })
}
