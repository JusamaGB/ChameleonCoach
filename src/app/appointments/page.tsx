"use client"

import { useState, useEffect } from "react"
import { ClientNav } from "@/components/layout/client-nav"
import { PoweredBy } from "@/components/branding/powered-by"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DEFAULT_COACH_BRANDING, type CoachBranding } from "@/lib/branding"

type Appointment = {
  id: string
  status: "pending" | "confirmed" | "declined" | "cancelled"
  requested_note: string | null
  confirmed_at: string | null
  coach_note: string | null
  created_at: string
}

type AppointmentSlot = {
  id: string
  starts_at: string
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function appointmentDate(appointment: Appointment) {
  return new Date(appointment.confirmed_at || appointment.created_at)
}

function formatDayKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function toLocalInputValue(date: Date) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return adjusted.toISOString().slice(0, 16)
}

function withSelectedDay(value: string, day: Date) {
  const base = value ? new Date(value) : new Date()
  const next = new Date(day)
  next.setHours(base.getHours() || 9, base.getMinutes(), 0, 0)
  return toLocalInputValue(next)
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function statusBadge(status: Appointment["status"]) {
  switch (status) {
    case "pending": return <Badge variant="warning">Pending</Badge>
    case "confirmed": return <Badge variant="success">Confirmed</Badge>
    case "declined": return <Badge variant="default">Declined</Badge>
    case "cancelled": return <Badge variant="default">Cancelled</Badge>
  }
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [bookingMode, setBookingMode] = useState("coach_only")
  const [visibleSlots, setVisibleSlots] = useState<AppointmentSlot[]>([])
  const [branding, setBranding] = useState<CoachBranding>(DEFAULT_COACH_BRANDING)
  const [note, setNote] = useState("")
  const [requestedFor, setRequestedFor] = useState(() => {
    const initial = new Date()
    initial.setDate(initial.getDate() + 1)
    initial.setHours(9, 0, 0, 0)
    return toLocalInputValue(initial)
  })
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/appointments").then((r) => r.json()),
      fetch("/api/client/branding").then((r) => (r.ok ? r.json() : DEFAULT_COACH_BRANDING)),
      fetch("/api/appointment-slots").then((r) => r.json()),
    ])
      .then(([appointmentsData, brandingData, slotsData]) => {
        setAppointments(appointmentsData.appointments ?? [])
        setBranding(brandingData)
        setBookingMode(slotsData.mode ?? "coach_only")
        setVisibleSlots(slotsData.slots ?? [])
      })
      .catch(() => setBranding(DEFAULT_COACH_BRANDING))
  }, [])

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    setSuccess(false)

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note, requested_for: requestedFor }),
    })

    if (res.ok) {
      setNote("")
      setSuccess(true)
      const [appointmentsData, slotsData] = await Promise.all([
        fetch("/api/appointments").then((r) => r.json()),
        fetch("/api/appointment-slots").then((r) => r.json()),
      ])
      setAppointments(appointmentsData.appointments ?? [])
      setBookingMode(slotsData.mode ?? "coach_only")
      setVisibleSlots(slotsData.slots ?? [])
    } else {
      const d = await res.json()
      setError(d.error || "Something went wrong")
    }
    setSubmitting(false)
  }

  const pending = appointments.filter((a) => a.status === "pending")
  const confirmed = appointments.filter((a) => a.status === "confirmed")
  const past = appointments.filter((a) => a.status === "declined" || a.status === "cancelled")
  const appointmentMap = appointments.reduce<Record<string, Appointment[]>>((acc, appointment) => {
    const key = formatDayKey(appointmentDate(appointment))
    if (!acc[key]) acc[key] = []
    acc[key].push(appointment)
    return acc
  }, {})
  const selectedDate = new Date(requestedFor)
  const selectedDayKey = formatDayKey(selectedDate)
  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
  const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0)
  const startOffset = (monthStart.getDay() + 6) % 7
  const calendarStart = new Date(monthStart)
  calendarStart.setDate(monthStart.getDate() - startOffset)
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart)
    date.setDate(calendarStart.getDate() + index)
    return date
  })
  const slotMap = visibleSlots.reduce<Record<string, AppointmentSlot[]>>((acc, slot) => {
    const key = formatDayKey(new Date(slot.starts_at))
    if (!acc[key]) acc[key] = []
    acc[key].push(slot)
    return acc
  }, {})
  const selectedSlots = slotMap[selectedDayKey] ?? []
  const selectedAppointments = appointmentMap[selectedDayKey] ?? []

  async function requestVisibleSlot(slotId: string, slotTime: string) {
    setSubmitting(true)
    setError("")
    setSuccess(false)

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note, requested_for: slotTime, slot_id: slotId }),
    })

    if (res.ok) {
      setNote("")
      setRequestedFor(slotTime)
      setSuccess(true)
      const [appointmentsData, slotsData] = await Promise.all([
        fetch("/api/appointments").then((r) => r.json()),
        fetch("/api/appointment-slots").then((r) => r.json()),
      ])
      setAppointments(appointmentsData.appointments ?? [])
      setBookingMode(slotsData.mode ?? "coach_only")
      setVisibleSlots(slotsData.slots ?? [])
    } else {
      const d = await res.json()
      setError(d.error || "Something went wrong")
    }

    setSubmitting(false)
  }

  return (
    <div className="flex min-h-screen bg-gf-bg">
      <ClientNav />
      <main className="flex-1 p-6 md:p-8 pb-24 md:pb-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: branding.brand_primary_color }}>
          Appointments
        </h1>

        <Card className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Request a Session</h2>
          <div className="mb-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-medium">Pick a preferred date</p>
                <p className="text-xs text-gf-muted">
                  Choose when you'd like your coach to schedule your session.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setCalendarMonth(
                      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
                    )
                  }
                >
                  Prev
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setCalendarMonth(
                      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
                    )
                  }
                >
                  Next
                </Button>
              </div>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-2">
              {WEEKDAYS.map((day) => (
                <div key={day} className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-gf-muted">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((date) => {
                const dayKey = formatDayKey(date)
                const items = appointmentMap[dayKey] ?? []
                const isCurrentMonth = date >= monthStart && date <= monthEnd
                const isSelected = dayKey === selectedDayKey

                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => setRequestedFor((current) => withSelectedDay(current, date))}
                    className={[
                      "min-h-20 rounded-xl border p-2 text-left transition-colors",
                      isCurrentMonth
                        ? "border-gf-border bg-gf-card"
                        : "border-gf-border/50 bg-gf-surface/40 text-gf-muted",
                      isSelected ? "" : "hover:border-gf-pink/40",
                    ].join(" ")}
                    style={
                      isSelected
                        ? {
                            borderColor: branding.brand_primary_color,
                            boxShadow: `0 0 0 1px ${branding.brand_primary_color} inset`,
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{date.getDate()}</span>
                      {items.length > 0 && (
                        <span className="text-[11px] text-gf-muted">{items.length}</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {bookingMode === "client_request_visible_slots" && (slotMap[dayKey]?.length ?? 0) > 0 && (
                        <div className="rounded-md border border-green-500/20 bg-green-500/10 px-1.5 py-1 text-[11px] text-green-200">
                          {slotMap[dayKey].length} open slot{slotMap[dayKey].length === 1 ? "" : "s"}
                        </div>
                      )}
                      {items.slice(0, 2).map((appointment) => (
                        <div
                          key={appointment.id}
                          className="rounded-md border border-yellow-500/20 bg-yellow-500/10 px-1.5 py-1 text-[11px] text-yellow-100"
                        >
                          {appointment.status === "confirmed" ? "Confirmed" : "Requested"}
                        </div>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          <form onSubmit={handleRequest} className="space-y-3">
            <input
              type="datetime-local"
              value={requestedFor}
              onChange={(e) => setRequestedFor(e.target.value)}
              className="w-full bg-gf-surface border border-gf-border rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-gf-pink"
            />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note for your coach (optional)"
              rows={3}
              className="w-full bg-gf-surface border border-gf-border rounded-lg px-4 py-3 text-sm text-white placeholder-gf-muted focus:outline-none focus:border-gf-pink resize-none"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            {success && <p className="text-sm text-green-400">Request sent! Your coach will be in touch.</p>}
            <Button type="submit" disabled={submitting} style={{ backgroundColor: branding.brand_primary_color }}>
              {submitting ? "Sending..." : "Request Session"}
            </Button>
          </form>
          {bookingMode === "client_request_visible_slots" && (
            <div className="mt-6 border-t border-gf-border pt-4">
              <h3 className="font-medium mb-2">Published Slots</h3>
              <p className="text-xs text-gf-muted mb-3">
                Select a day on the calendar to see any coach-published slots you can request.
              </p>
              {selectedSlots.length > 0 ? (
                <div className="space-y-2">
                  {selectedSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-gf-border px-3 py-2"
                    >
                      <p className="text-sm">{formatDateTime(slot.starts_at)}</p>
                      <Button
                        type="button"
                        size="sm"
                        disabled={submitting}
                        onClick={() => requestVisibleSlot(slot.id, slot.starts_at)}
                        style={{ backgroundColor: branding.brand_primary_color }}
                      >
                        Request Slot
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gf-muted">No published slots for the selected day.</p>
              )}
            </div>
          )}
        </Card>

        <Card className="mb-8">
          <h2 className="text-lg font-semibold mb-2">
            {selectedDate.toLocaleDateString("en-GB", { dateStyle: "full" })}
          </h2>
          <p className="text-sm text-gf-muted mb-4">
            Review appointments and available slots for the selected day.
          </p>

          <div className="mb-4">
            <h3 className="font-medium mb-2">Appointments</h3>
            {selectedAppointments.length > 0 ? (
              <div className="space-y-2">
                {selectedAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gf-border px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {appointment.confirmed_at
                          ? formatDateTime(appointment.confirmed_at)
                          : `Requested ${new Date(appointment.created_at).toLocaleDateString("en-GB")}`}
                      </p>
                      {appointment.requested_note && (
                        <p className="text-xs text-gf-muted mt-1">"{appointment.requested_note}"</p>
                      )}
                    </div>
                    {statusBadge(appointment.status)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gf-muted">No appointments for this day.</p>
            )}
          </div>

          {bookingMode === "client_request_visible_slots" && (
            <div>
              <h3 className="font-medium mb-2">Open Slots</h3>
              {selectedSlots.length > 0 ? (
                <div className="space-y-2">
                  {selectedSlots.map((slot) => (
                    <div
                      key={`detail-${slot.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-gf-border px-3 py-2"
                    >
                      <p className="text-sm">{formatDateTime(slot.starts_at)}</p>
                      <Button
                        type="button"
                        size="sm"
                        disabled={submitting}
                        onClick={() => requestVisibleSlot(slot.id, slot.starts_at)}
                        style={{ backgroundColor: branding.brand_primary_color }}
                      >
                        Request Slot
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gf-muted">No open slots for this day.</p>
              )}
            </div>
          )}
        </Card>

        {confirmed.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Confirmed</h2>
            <div className="space-y-3">
              {confirmed.map((a) => (
                <Card key={a.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      {a.confirmed_at && (
                        <p className="font-medium">
                          {new Date(a.confirmed_at).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}
                        </p>
                      )}
                      {a.coach_note && (
                        <p className="text-sm text-gf-muted">"{a.coach_note}"</p>
                      )}
                    </div>
                    {statusBadge(a.status)}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {pending.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Pending</h2>
            <div className="space-y-3">
              {pending.map((a) => (
                <Card key={a.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-gf-muted">
                        {a.confirmed_at
                          ? `Preferred ${new Date(a.confirmed_at).toLocaleString("en-GB", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}`
                          : `Requested ${new Date(a.created_at).toLocaleDateString("en-GB")}`}
                      </p>
                      {a.requested_note && (
                        <p className="text-sm">"{a.requested_note}"</p>
                      )}
                    </div>
                    {statusBadge(a.status)}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3 text-gf-muted">Past</h2>
            <div className="space-y-3">
              {past.map((a) => (
                <Card key={a.id}>
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm text-gf-muted">
                      {new Date(a.created_at).toLocaleDateString("en-GB")}
                    </p>
                    {statusBadge(a.status)}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {appointments.length === 0 && (
          <p className="text-gf-muted text-sm">No appointments yet. Request your first session above.</p>
        )}

        {branding.show_powered_by && <PoweredBy className="mt-8" />}
      </main>
    </div>
  )
}
