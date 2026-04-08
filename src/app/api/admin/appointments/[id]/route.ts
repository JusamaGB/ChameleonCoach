import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import {
  createAppointmentCalendarEvent,
  updateAppointmentCalendarEvent,
} from "@/lib/google/calendar"
import { sendAppointmentConfirmedEmail, sendAppointmentDeclinedEmail } from "@/lib/resend"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result

  const { id } = await params
  const { status, confirmed_at, coach_note } = await request.json()

  if (!status) {
    return NextResponse.json({ error: "status is required" }, { status: 400 })
  }

  if (status === "confirmed" && !confirmed_at) {
    return NextResponse.json({ error: "confirmed_at is required" }, { status: 400 })
  }

  const { data: existingAppointment, error: existingError } = await supabase
    .from("appointments")
    .select(`
      *,
      clients (
        name,
        email
      )
    `)
    .eq("id", id)
    .single()

  if (existingError || !existingAppointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
  }

  const updateData: Record<string, string | null> = {
    status,
    coach_note: coach_note ?? null,
    updated_at: new Date().toISOString(),
  }
  if (status === "confirmed" && confirmed_at) {
    updateData.confirmed_at = confirmed_at
  }

  if (status === "confirmed" && confirmed_at) {
    if (!existingAppointment.clients?.email) {
      return NextResponse.json(
        { error: "Client email is required for Calendar sync" },
        { status: 400 }
      )
    }

    try {
      let calendarEvent
      if (existingAppointment.google_calendar_event_id) {
        try {
          calendarEvent = await updateAppointmentCalendarEvent({
            coachId: user.id,
            eventId: existingAppointment.google_calendar_event_id,
            clientName: existingAppointment.clients.name || "Client",
            clientEmail: existingAppointment.clients.email,
            confirmedAt: confirmed_at,
            durationMinutes: existingAppointment.duration_minutes ?? 60,
            coachNote: coach_note ?? null,
            requestedNote: existingAppointment.requested_note ?? null,
          })
        } catch (error) {
          const googleError = error as { code?: number; status?: number; message?: string }
          if (googleError?.code === 404 || googleError?.status === 404) {
            calendarEvent = await createAppointmentCalendarEvent({
              coachId: user.id,
              clientName: existingAppointment.clients.name || "Client",
              clientEmail: existingAppointment.clients.email,
              confirmedAt: confirmed_at,
              durationMinutes: existingAppointment.duration_minutes ?? 60,
              coachNote: coach_note ?? null,
              requestedNote: existingAppointment.requested_note ?? null,
            })
          } else {
            throw error
          }
        }
      } else {
        calendarEvent = await createAppointmentCalendarEvent({
          coachId: user.id,
          clientName: existingAppointment.clients.name || "Client",
          clientEmail: existingAppointment.clients.email,
          confirmedAt: confirmed_at,
          durationMinutes: existingAppointment.duration_minutes ?? 60,
          coachNote: coach_note ?? null,
          requestedNote: existingAppointment.requested_note ?? null,
        })
      }

      updateData.google_calendar_event_id = calendarEvent.id
      updateData.google_calendar_event_link = calendarEvent.htmlLink
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `Google Calendar sync failed: ${error.message}`
              : "Google Calendar sync failed",
        },
        { status: 400 }
      )
    }
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

  if (status === "declined" && appointment.clients) {
    await supabase
      .from("appointment_slots")
      .update({
        appointment_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("appointment_id", id)

    try {
      await sendAppointmentDeclinedEmail(
        appointment.clients.email,
        appointment.clients.name || "there",
        coach_note || ""
      )
    } catch {
      // Email failure is non-fatal
    }
  }

  return NextResponse.json({ ok: true })
}
