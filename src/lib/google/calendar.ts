import { google } from "googleapis"
import { getAuthedClient } from "./auth"
import { PLATFORM_NAME } from "@/lib/platform"

// Phase 1 placeholder until session duration becomes a first-class appointment field.
const APPOINTMENT_DURATION_MINUTES = 60

interface CreateCalendarEventParams {
  coachId: string
  clientName: string
  clientEmail: string
  confirmedAt: string
  durationMinutes?: number
  coachNote?: string | null
  requestedNote?: string | null
}

interface UpdateCalendarEventParams extends CreateCalendarEventParams {
  eventId: string
}

function buildAppointmentEvent({
  clientName,
  clientEmail,
  confirmedAt,
  durationMinutes,
  coachNote,
  requestedNote,
}: CreateCalendarEventParams) {
  const normalizedDuration = durationMinutes ?? APPOINTMENT_DURATION_MINUTES
  const start = new Date(confirmedAt)
  const end = new Date(start.getTime() + normalizedDuration * 60 * 1000)

  return {
    summary: `${PLATFORM_NAME} session with ${clientName}`,
    description: [
      `Booked via ${PLATFORM_NAME}.`,
      coachNote ? `Coach note: ${coachNote}` : "",
      requestedNote ? `Client request: ${requestedNote}` : "",
      `Duration: ${normalizedDuration} minutes.`,
    ]
      .filter(Boolean)
      .join("\n"),
    start: {
      dateTime: start.toISOString(),
    },
    end: {
      dateTime: end.toISOString(),
    },
    attendees: clientEmail ? [{ email: clientEmail, displayName: clientName }] : undefined,
  }
}

export async function createAppointmentCalendarEvent({
  coachId,
  clientName,
  clientEmail,
  confirmedAt,
  durationMinutes = APPOINTMENT_DURATION_MINUTES,
  coachNote,
  requestedNote,
}: CreateCalendarEventParams) {
  const auth = await getAuthedClient(coachId)
  const calendar = google.calendar({ version: "v3", auth })

  const event = await calendar.events.insert({
    calendarId: "primary",
    requestBody: buildAppointmentEvent({
      coachId,
      clientName,
      clientEmail,
      confirmedAt,
      durationMinutes,
      coachNote,
      requestedNote,
    }),
    sendUpdates: "all",
  })

  return {
    id: event.data.id ?? null,
    htmlLink: event.data.htmlLink ?? null,
  }
}

export async function updateAppointmentCalendarEvent({
  coachId,
  eventId,
  clientName,
  clientEmail,
  confirmedAt,
  durationMinutes = APPOINTMENT_DURATION_MINUTES,
  coachNote,
  requestedNote,
}: UpdateCalendarEventParams) {
  const auth = await getAuthedClient(coachId)
  const calendar = google.calendar({ version: "v3", auth })

  const event = await calendar.events.update({
    calendarId: "primary",
    eventId,
    requestBody: buildAppointmentEvent({
      coachId,
      clientName,
      clientEmail,
      confirmedAt,
      durationMinutes,
      coachNote,
      requestedNote,
    }),
    sendUpdates: "all",
  })

  return {
    id: event.data.id ?? null,
    htmlLink: event.data.htmlLink ?? null,
  }
}
