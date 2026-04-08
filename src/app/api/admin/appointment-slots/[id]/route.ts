import { NextResponse } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const { id } = await params
  const { client_id, note } = await request.json()

  if (!client_id) {
    return NextResponse.json({ error: "client_id is required" }, { status: 400 })
  }

  const { data: slot } = await supabase
    .from("appointment_slots")
    .select("id, starts_at, appointment_id")
    .eq("id", id)
    .eq("coach_id", user.id)
    .is("appointment_id", null)
    .single()

  if (!slot) {
    return NextResponse.json({ error: "Slot is not available" }, { status: 400 })
  }

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      coach_id: user.id,
      client_id,
      requested_note: note || "Proposed by coach",
      confirmed_at: slot.starts_at,
      status: "pending",
    })
    .select("id")
    .single()

  if (appointmentError || !appointment) {
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 })
  }

  const { data: claimedSlot } = await supabase
    .from("appointment_slots")
    .update({
      appointment_id: appointment.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .is("appointment_id", null)
    .select("id")
    .single()

  if (!claimedSlot) {
    await supabase.from("appointments").delete().eq("id", appointment.id)
    return NextResponse.json({ error: "Slot is no longer available" }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const { id } = await params

  const { error } = await supabase
    .from("appointment_slots")
    .delete()
    .eq("id", id)
    .eq("coach_id", user.id)
    .is("appointment_id", null)

  if (error) {
    return NextResponse.json({ error: "Failed to remove slot" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
