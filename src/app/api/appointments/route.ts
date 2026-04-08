import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdmin } from "@/lib/supabase/server"
import { sendAppointmentRequestEmail } from "@/lib/resend"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: appointments } = await supabase
    .from("appointments")
    .select("*")
    .order("created_at", { ascending: false })

  return NextResponse.json({ appointments: appointments ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { note, requested_for, slot_id } = await request.json()

  // Get client record to find coach_id
  const { data: client } = await supabase
    .from("clients")
    .select("id, coach_id, name, email")
    .eq("user_id", user.id)
    .single()

  if (!client) {
    return NextResponse.json({ error: "Client record not found" }, { status: 400 })
  }

  const admin = createAdmin()

  let preferredTime = requested_for || null
  if (slot_id) {
    const { data: slot } = await admin
      .from("appointment_slots")
      .select("id, starts_at, appointment_id")
      .eq("id", slot_id)
      .eq("coach_id", client.coach_id)
      .is("appointment_id", null)
      .single()

    if (!slot) {
      return NextResponse.json({ error: "This slot is no longer available" }, { status: 400 })
    }

    preferredTime = slot.starts_at
  }

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      coach_id: client.coach_id,
      client_id: client.id,
      requested_note: note || null,
      confirmed_at: preferredTime,
      status: "pending",
    })
    .select("id")
    .single()

  if (error) {
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 })
  }

  if (slot_id && appointment?.id) {
    const { data: claimedSlot } = await admin
      .from("appointment_slots")
      .update({
        appointment_id: appointment.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", slot_id)
      .is("appointment_id", null)
      .select("id")
      .single()

    if (!claimedSlot) {
      await admin.from("appointments").delete().eq("id", appointment.id)
      return NextResponse.json({ error: "This slot is no longer available" }, { status: 400 })
    }
  }

  // Notify coach by email
  try {
    const { data: coachUser } = await admin.auth.admin.getUserById(client.coach_id)
    if (coachUser.user?.email) {
      await sendAppointmentRequestEmail(
        coachUser.user.email,
        client.name || "Your client",
        note || ""
      )
    }
  } catch {
    // Email failure is non-fatal
  }

  return NextResponse.json({ ok: true })
}
