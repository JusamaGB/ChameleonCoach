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
  coachNote?: string | null
  requestedNote?: string | null
}

export async function createAppointmentCalendarEvent({
  coachId,
  clientName,
  clientEmail,
  confirmedAt,
  coachNote,
  requestedNote,
}: CreateCalendarEventParams) {
  const auth = await getAuthedClient(coachId)
  const calendar = google.calendar({ version: "v3", auth })

  const start = new Date(confirmedAt)
  const end = new Date(start.getTime() + APPOINTMENT_DURATION_MINUTES * 60 * 1000)

  const event = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: `${PLATFORM_NAME} session with ${clientName}`,
      description: [
        `Booked via ${PLATFORM_NAME}.`,
        coachNote ? `Coach note: ${coachNote}` : "",
        requestedNote ? `Client request: ${requestedNote}` : "",
        `Temporary default duration: ${APPOINTMENT_DURATION_MINUTES} minutes.`,
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
    },
    sendUpdates: "all",
  })

  return {
    id: event.data.id ?? null,
    htmlLink: event.data.htmlLink ?? null,
  }
}
