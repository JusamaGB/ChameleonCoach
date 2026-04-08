"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type Appointment = {
  id: string
  status: "pending" | "confirmed" | "declined" | "cancelled"
  requested_note: string | null
  confirmed_at: string | null
  coach_note: string | null
  created_at: string
  clients: { id: string; name: string | null; email: string } | null
}

type AppointmentSlot = {
  id: string
  starts_at: string
}

type ClientOption = {
  id: string
  name: string
  email: string
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function statusBadge(status: Appointment["status"]) {
  switch (status) {
    case "pending": return <Badge variant="warning">Pending</Badge>
    case "confirmed": return <Badge variant="success">Confirmed</Badge>
    case "declined": return <Badge variant="default">Declined</Badge>
    case "cancelled": return <Badge variant="default">Cancelled</Badge>
  }
}

function appointmentDate(appointment: Appointment) {
  return new Date(appointment.confirmed_at || appointment.created_at)
}

function formatDayKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatCalendarTime(appointment: Appointment) {
  if (!appointment.confirmed_at) {
    return appointment.status === "pending" ? "Request" : "Update"
  }

  const time = new Date(appointment.confirmed_at).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })
  return appointment.status === "confirmed" ? time : `${time} • ${appointment.status}`
}

function eventClasses(status: Appointment["status"]) {
  switch (status) {
    case "confirmed":
      return "border-green-500/30 bg-green-500/10 text-green-200"
    case "pending":
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-100"
    case "declined":
      return "border-gf-border bg-gf-surface text-gf-muted"
    case "cancelled":
      return "border-gf-border bg-gf-surface text-gf-muted"
  }
}

function toLocalDateTimeValue(value: string) {
  const date = new Date(value)
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return adjusted.toISOString().slice(0, 16)
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function ConfirmForm({
  id,
  initialConfirmedAt,
  onDone,
}: {
  id: string
  initialConfirmedAt: string | null
  onDone: () => void
}) {
  const [confirmedAt, setConfirmedAt] = useState(
    initialConfirmedAt ? toLocalDateTimeValue(initialConfirmedAt) : ""
  )
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!confirmedAt) return
    setLoading(true)
    await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "confirmed", confirmed_at: confirmedAt, coach_note: note }),
    })
    onDone()
  }

  return (
    <div className="mt-3 space-y-2 border-t border-gf-border pt-3">
      <input
        type="datetime-local"
        value={confirmedAt}
        onChange={(e) => setConfirmedAt(e.target.value)}
        className="w-full bg-gf-surface border border-gf-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gf-pink"
      />
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note to client (optional)"
        className="w-full bg-gf-surface border border-gf-border rounded-lg px-3 py-2 text-sm text-white placeholder-gf-muted focus:outline-none focus:border-gf-pink"
      />
      <div className="flex gap-2">
        <Button onClick={submit} disabled={loading || !confirmedAt} className="text-sm py-1.5 px-4">
          {loading ? "Confirming..." : "Confirm"}
        </Button>
        <button onClick={onDone} className="text-sm text-gf-muted hover:text-white px-4">
          Cancel
        </button>
      </div>
    </div>
  )
}

function DeclineForm({ id, onDone }: { id: string; onDone: () => void }) {
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit() {
    setLoading(true)
    await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "declined", coach_note: note }),
    })
    onDone()
  }

  return (
    <div className="mt-3 space-y-2 border-t border-gf-border pt-3">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Reason for declining (optional, sent to client)"
        rows={2}
        className="w-full bg-gf-surface border border-gf-border rounded-lg px-3 py-2 text-sm text-white placeholder-gf-muted focus:outline-none focus:border-gf-pink resize-none"
      />
      <div className="flex gap-2">
        <Button onClick={submit} disabled={loading} variant="secondary" className="text-sm py-1.5 px-4">
          {loading ? "Declining..." : "Decline"}
        </Button>
        <button onClick={onDone} className="text-sm text-gf-muted hover:text-white px-4">
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [slots, setSlots] = useState<AppointmentSlot[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [confirming, setConfirming] = useState<string | null>(null)
  const [declining, setDeclining] = useState<string | null>(null)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [slotClientId, setSlotClientId] = useState("")
  const [slotNote, setSlotNote] = useState("")
  const [newSlotAt, setNewSlotAt] = useState("")
  const [creatingSlot, setCreatingSlot] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })

  async function load() {
    const [appointmentsData, slotsData] = await Promise.all([
      fetch("/api/admin/appointments").then((r) => r.json()),
      fetch("/api/admin/appointment-slots").then((r) => r.json()),
    ])
    setAppointments(appointmentsData.appointments ?? [])
    setSlots(slotsData.slots ?? [])
    setConfirming(null)
    setDeclining(null)
    setSelectedSlotId(null)
    setSlotClientId("")
    setSlotNote("")
  }

  useEffect(() => {
    load()
    fetch("/api/admin/clients")
      .then((r) => r.json())
      .then((d) =>
        setClients(
          (d.clients ?? []).map((client: { id: string; name: string | null; email: string }) => ({
            id: client.id,
            name: client.name || client.email,
            email: client.email,
          }))
        )
      )
  }, [])

  async function createSlot(e: React.FormEvent) {
    e.preventDefault()
    if (!newSlotAt) return
    setCreatingSlot(true)
    await fetch("/api/admin/appointment-slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ starts_at: newSlotAt }),
    })
    setNewSlotAt("")
    setCreatingSlot(false)
    load()
  }

  async function removeSlot(id: string) {
    await fetch(`/api/admin/appointment-slots/${id}`, { method: "DELETE" })
    load()
  }

  async function assignSlot(slotId: string) {
    if (!slotClientId) return
    await fetch(`/api/admin/appointment-slots/${slotId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: slotClientId, note: slotNote }),
    })
    load()
  }

  const pending = appointments.filter((a) => a.status === "pending")
  const confirmed = appointments.filter((a) => a.status === "confirmed")
  const past = appointments.filter((a) => a.status === "declined" || a.status === "cancelled")
  const appointmentMap = appointments.reduce<Record<string, Appointment[]>>((acc, appointment) => {
    const key = formatDayKey(appointmentDate(appointment))
    if (!acc[key]) acc[key] = []
    acc[key].push(appointment)
    acc[key].sort((a, b) => appointmentDate(a).getTime() - appointmentDate(b).getTime())
    return acc
  }, {})

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
  const todayKey = formatDayKey(new Date())
  const selectedDate = newSlotAt ? new Date(newSlotAt) : new Date()
  const selectedDayKey = formatDayKey(selectedDate)
  const slotMap = slots.reduce<Record<string, AppointmentSlot[]>>((acc, slot) => {
    const key = formatDayKey(new Date(slot.starts_at))
    if (!acc[key]) acc[key] = []
    acc[key].push(slot)
    return acc
  }, {})
  const selectedAppointments = appointmentMap[selectedDayKey] ?? []
  const selectedSlots = slotMap[selectedDayKey] ?? []

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Appointments</h1>

      <section className="mb-8">
        <Card>
          <h2 className="text-lg font-semibold mb-3">Publish Available Slots</h2>
          <p className="text-sm text-gf-muted mb-4">
            Add one-off times that clients can request when visible-slot mode is enabled.
          </p>
          <form onSubmit={createSlot} className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              type="datetime-local"
              value={newSlotAt}
              onChange={(e) => setNewSlotAt(e.target.value)}
              className="w-full bg-gf-surface border border-gf-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gf-pink"
            />
            <Button type="submit" disabled={creatingSlot || !newSlotAt}>
              {creatingSlot ? "Publishing..." : "Publish Slot"}
            </Button>
          </form>
          {slots.length > 0 ? (
            <div className="space-y-2">
              {slots.slice(0, 8).map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gf-border px-3 py-2"
                >
                  <p className="text-sm">
                    {new Date(slot.starts_at).toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <button
                    onClick={() => removeSlot(slot.id)}
                    className="text-sm text-gf-muted hover:text-white"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gf-muted">No published slots yet.</p>
          )}
        </Card>
      </section>

      <section className="mb-8">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-semibold">Calendar</h2>
            <p className="text-sm text-gf-muted">
              Confirmed sessions use their scheduled time. Pending requests use the client's preferred time when one has been submitted.
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

        <Card>
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="font-medium">
              {calendarMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-1 text-green-200">
                Confirmed
              </span>
              <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 text-yellow-100">
                Pending
              </span>
              <span className="rounded-full border border-gf-border bg-gf-surface px-2 py-1 text-gf-muted">
                Declined / Cancelled
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
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
              const daySlots = slotMap[dayKey] ?? []
              const isCurrentMonth = date >= monthStart && date <= monthEnd
              const isToday = dayKey === todayKey
              const isSelected = dayKey === selectedDayKey

              return (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => setNewSlotAt((current) => {
                    const value = current ? new Date(current) : new Date()
                    const next = new Date(date)
                    next.setHours(value.getHours() || 9, value.getMinutes(), 0, 0)
                    return toLocalDateTimeValue(next.toISOString())
                  })}
                  className={[
                    "min-h-32 rounded-xl border p-2 text-left",
                    isCurrentMonth ? "border-gf-border bg-gf-card" : "border-gf-border/50 bg-gf-surface/40 text-gf-muted",
                    isToday ? "ring-1 ring-gf-pink" : "",
                    isSelected ? "shadow-[0_0_0_1px_rgba(255,45,138,0.5)_inset]" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{date.getDate()}</span>
                    {items.length > 0 && (
                      <span className="text-[11px] text-gf-muted">{items.length} item{items.length === 1 ? "" : "s"}</span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {daySlots.length > 0 && (
                      <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-xs text-blue-200">
                        {daySlots.length} open slot{daySlots.length === 1 ? "" : "s"}
                      </div>
                    )}
                    {items.slice(0, 3).map((appointment) => (
                      <div
                        key={appointment.id}
                        className={`rounded-lg border px-2 py-1 text-xs ${eventClasses(appointment.status)}`}
                      >
                        <p className="font-medium truncate">
                          {appointment.clients?.name ?? "Unknown client"}
                        </p>
                        <p className="truncate">
                          {formatCalendarTime(appointment)}
                        </p>
                      </div>
                    ))}
                    {items.length > 3 && (
                      <p className="text-xs text-gf-muted">+{items.length - 3} more</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </Card>
      </section>

      <section className="mb-8">
        <Card>
          <h2 className="text-lg font-semibold mb-2">
            {selectedDate.toLocaleDateString("en-GB", { dateStyle: "full" })}
          </h2>
          <p className="text-sm text-gf-muted mb-4">
            Review the selected day, publish a slot, or assign an open slot to a client.
          </p>

          <form onSubmit={createSlot} className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="datetime-local"
              value={newSlotAt}
              onChange={(e) => setNewSlotAt(e.target.value)}
              className="w-full bg-gf-surface border border-gf-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gf-pink"
            />
            <Button type="submit" disabled={creatingSlot || !newSlotAt}>
              {creatingSlot ? "Publishing..." : "Publish Slot"}
            </Button>
          </form>

          <div className="mb-6">
            <h3 className="font-medium mb-2">Appointments</h3>
            {selectedAppointments.length > 0 ? (
              <div className="space-y-2">
                {selectedAppointments.map((appointment) => (
                  <div
                    key={`selected-${appointment.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gf-border px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{appointment.clients?.name ?? "Unknown client"}</p>
                      <p className="text-xs text-gf-muted">
                        {appointment.confirmed_at ? formatDateTime(appointment.confirmed_at) : "Request"}
                      </p>
                    </div>
                    {statusBadge(appointment.status)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gf-muted">No appointments for this day.</p>
            )}
          </div>

          <div>
            <h3 className="font-medium mb-2">Open Slots</h3>
            {selectedSlots.length > 0 ? (
              <div className="space-y-3">
                {selectedSlots.map((slot) => (
                  <div key={`slot-${slot.id}`} className="rounded-lg border border-gf-border px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{formatDateTime(slot.starts_at)}</p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => removeSlot(slot.id)}
                          className="text-sm text-gf-muted hover:text-white"
                        >
                          Remove
                        </button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedSlotId(selectedSlotId === slot.id ? null : slot.id)}
                        >
                          {selectedSlotId === slot.id ? "Hide" : "Assign to Client"}
                        </Button>
                      </div>
                    </div>

                    {selectedSlotId === slot.id && (
                      <div className="mt-3 space-y-3 border-t border-gf-border pt-3">
                        <select
                          value={slotClientId}
                          onChange={(e) => setSlotClientId(e.target.value)}
                          className="w-full bg-gf-surface border border-gf-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gf-pink"
                        >
                          <option value="">Select client...</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.name} ({client.email})
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={slotNote}
                          onChange={(e) => setSlotNote(e.target.value)}
                          placeholder="Optional note for this proposal"
                          className="w-full bg-gf-surface border border-gf-border rounded-lg px-3 py-2 text-sm text-white placeholder-gf-muted focus:outline-none focus:border-gf-pink"
                        />
                        <Button
                          type="button"
                          disabled={!slotClientId}
                          onClick={() => assignSlot(slot.id)}
                        >
                          Create Pending Appointment
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gf-muted">No open slots for this day.</p>
            )}
          </div>
        </Card>
      </section>

      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Pending Requests</h2>
          <div className="space-y-3">
            {pending.map((a) => (
              <Card key={a.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-medium">{a.clients?.name ?? "Unknown client"}</p>
                    <p className="text-xs text-gf-muted">{a.clients?.email}</p>
                    {a.requested_note && (
                      <p className="text-sm text-gf-muted mt-1">"{a.requested_note}"</p>
                    )}
                    <p className="text-xs text-gf-muted">
                      {a.confirmed_at
                        ? `Preferred ${new Date(a.confirmed_at).toLocaleString("en-GB", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}`
                        : `Requested ${new Date(a.created_at).toLocaleDateString("en-GB")}`}
                    </p>
                  </div>
                  {statusBadge(a.status)}
                </div>
                {confirming === a.id ? (
                  <ConfirmForm id={a.id} initialConfirmedAt={a.confirmed_at} onDone={load} />
                ) : declining === a.id ? (
                  <DeclineForm id={a.id} onDone={load} />
                ) : (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gf-border">
                    <Button
                      onClick={() => { setConfirming(a.id); setDeclining(null) }}
                      className="text-sm py-1.5 px-4"
                    >
                      Confirm
                    </Button>
                    <button
                      onClick={() => { setDeclining(a.id); setConfirming(null) }}
                      className="text-sm text-gf-muted hover:text-white px-4"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {confirmed.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Confirmed Sessions</h2>
          <div className="space-y-3">
            {confirmed.map((a) => (
              <Card key={a.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-medium">{a.clients?.name ?? "Unknown client"}</p>
                    {a.confirmed_at && (
                      <p className="text-sm">
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

      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 text-gf-muted">Past</h2>
          <div className="space-y-3">
            {past.map((a) => (
              <Card key={a.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm">{a.clients?.name ?? "Unknown client"}</p>
                    <p className="text-xs text-gf-muted">{new Date(a.created_at).toLocaleDateString("en-GB")}</p>
                  </div>
                  {statusBadge(a.status)}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {appointments.length === 0 && (
        <p className="text-gf-muted text-sm">No appointments yet.</p>
      )}
    </div>
  )
}
