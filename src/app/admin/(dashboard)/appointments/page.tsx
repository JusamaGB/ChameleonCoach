"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/input"

type BookingMode = "coach_only" | "client_request_visible_slots"
type PaymentStatus = "unpaid" | "payment_requested" | "paid" | "payment_failed"

type Appointment = {
  id: string
  status: "pending" | "confirmed" | "declined" | "cancelled"
  requested_note: string | null
  confirmed_at: string | null
  duration_minutes: number
  coach_note: string | null
  session_price_amount: number | null
  session_price_currency: string | null
  payment_status: PaymentStatus
  payment_checkout_url: string | null
  payment_paid_at: string | null
  payment_failed_at: string | null
  created_at: string
  clients: { id: string; name: string | null; email: string } | null
}

type AppointmentSlot = {
  id: string
  starts_at: string
  duration_minutes: number
  is_visible: boolean
}

type ClientOption = {
  id: string
  name: string
  email: string
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const WEEKDAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
]
const DURATION_OPTIONS = [30, 45, 60, 75, 90]

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

  const start = new Date(appointment.confirmed_at)
  const end = new Date(start.getTime() + appointment.duration_minutes * 60000)
  const startText = start.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  const endText = end.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  const range = `${startText} - ${endText}`
  return appointment.status === "confirmed" ? range : `${range} • ${appointment.status}`
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

function paymentBadge(status: PaymentStatus) {
  switch (status) {
    case "paid": return <Badge variant="success">Paid</Badge>
    case "payment_requested": return <Badge variant="warning">Payment requested</Badge>
    case "payment_failed": return <Badge variant="default">Payment failed</Badge>
    case "unpaid": return <Badge variant="default">Unpaid</Badge>
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

function formatSlotRange(startsAt: string, durationMinutes: number) {
  const start = new Date(startsAt)
  const end = new Date(start.getTime() + durationMinutes * 60000)
  return `${formatDateTime(startsAt)} - ${end.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}`
}

function formatMoney(amount: number | null, currency: string | null) {
  if (!amount || !currency) return null
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

function combineDateAndTime(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number)
  const [hours, minutes] = timeValue.split(":").map(Number)
  return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString()
}

function Modal({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: React.ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-gf-border bg-gf-card p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            {description ? <p className="mt-1 text-sm text-gf-muted">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="text-sm text-gf-muted hover:text-white">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
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

function PaymentRequestForm({
  appointment,
  onDone,
}: {
  appointment: Appointment
  onDone: () => void
}) {
  const [amount, setAmount] = useState(
    appointment.session_price_amount ? (appointment.session_price_amount / 100).toFixed(2) : ""
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function submit() {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a valid amount")
      return
    }

    setLoading(true)
    setError("")

    const res = await fetch(`/api/admin/appointments/${appointment.id}/payment-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Math.round(value * 100), currency: "gbp" }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Failed to send payment request")
      setLoading(false)
      return
    }

    if (data.emailSent === false) {
      window.alert("Payment link created, but the email could not be sent.")
    }

    setLoading(false)
    onDone()
  }

  return (
    <div className="mt-3 space-y-2 border-t border-gf-border pt-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Session price (GBP)"
          className="w-full rounded-lg border border-gf-border bg-gf-surface px-3 py-2 text-sm text-white placeholder-gf-muted focus:border-gf-pink focus:outline-none"
        />
        <Button type="button" onClick={submit} disabled={loading || !amount} className="sm:w-auto">
          {loading
            ? "Sending..."
            : appointment.payment_status === "payment_requested" || appointment.payment_status === "payment_failed"
              ? "Resend Payment Request"
              : "Send Payment Request"}
        </Button>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  )
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [slots, setSlots] = useState<AppointmentSlot[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [bookingMode, setBookingMode] = useState<BookingMode>("coach_only")
  const [bookingModeSaving, setBookingModeSaving] = useState(false)
  const [bookingModeSaved, setBookingModeSaved] = useState(false)
  const [bookingModeError, setBookingModeError] = useState("")
  const [confirming, setConfirming] = useState<string | null>(null)
  const [declining, setDeclining] = useState<string | null>(null)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [slotClientId, setSlotClientId] = useState("")
  const [slotNote, setSlotNote] = useState("")
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [selectedDayKey, setSelectedDayKey] = useState(() => formatDayKey(new Date()))
  const [bookingOpen, setBookingOpen] = useState(false)
  const [availabilityOpen, setAvailabilityOpen] = useState(false)
  const [dayDetailOpen, setDayDetailOpen] = useState(false)
  const [bookingClientId, setBookingClientId] = useState("")
  const [bookingDate, setBookingDate] = useState(() => formatDayKey(new Date()))
  const [bookingTime, setBookingTime] = useState("09:00")
  const [bookingDuration, setBookingDuration] = useState("60")
  const [bookingNote, setBookingNote] = useState("")
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [availabilityDays, setAvailabilityDays] = useState<number[]>([new Date().getDay()])
  const [availabilityStartDate, setAvailabilityStartDate] = useState(() => formatDayKey(new Date()))
  const [availabilityEndDate, setAvailabilityEndDate] = useState("")
  const [availabilityStartTime, setAvailabilityStartTime] = useState("09:00")
  const [availabilityEndTime, setAvailabilityEndTime] = useState("17:00")
  const [availabilitySlotLength, setAvailabilitySlotLength] = useState("60")
  const [availabilityVisible, setAvailabilityVisible] = useState(false)
  const [availabilitySubmitting, setAvailabilitySubmitting] = useState(false)

  async function load() {
    const [appointmentsData, slotsData, profileData] = await Promise.all([
      fetch("/api/admin/appointments").then((r) => r.json()),
      fetch("/api/admin/appointment-slots").then((r) => r.json()),
      fetch("/api/admin/profile").then((r) => r.json()),
    ])
    setAppointments(appointmentsData.appointments ?? [])
    setSlots(slotsData.slots ?? [])
    const mode = profileData.appointment_booking_mode ?? "coach_only"
    setBookingMode(mode)
    setAvailabilityVisible(mode === "client_request_visible_slots")
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

  async function saveBookingMode(e: React.FormEvent) {
    e.preventDefault()
    setBookingModeSaving(true)
    setBookingModeSaved(false)
    setBookingModeError("")

    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment_booking_mode: bookingMode }),
      })

      if (!res.ok) throw new Error()

      setBookingModeSaved(true)
      setTimeout(() => setBookingModeSaved(false), 3000)
      load()
    } catch {
      setBookingModeError("Failed to save booking mode. Please try again.")
    } finally {
      setBookingModeSaving(false)
    }
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
  const selectedDate = new Date(`${selectedDayKey}T00:00:00`)
  const slotMap = slots.reduce<Record<string, AppointmentSlot[]>>((acc, slot) => {
    const key = formatDayKey(new Date(slot.starts_at))
    if (!acc[key]) acc[key] = []
    acc[key].push(slot)
    acc[key].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    return acc
  }, {})
  const selectedAppointments = appointmentMap[selectedDayKey] ?? []
  const selectedSlots = slotMap[selectedDayKey] ?? []
  const existingSlotStarts = useMemo(() => new Set(slots.map((slot) => slot.starts_at)), [slots])

  function openBookingForDay(dayKey: string) {
    setSelectedDayKey(dayKey)
    setBookingDate(dayKey)
    setBookingOpen(true)
  }

  function openAvailabilityForDay(dayKey: string) {
    setSelectedDayKey(dayKey)
    setAvailabilityStartDate(dayKey)
    setAvailabilityEndDate("")
    setAvailabilityDays([new Date(`${dayKey}T00:00:00`).getDay()])
    setAvailabilityOpen(true)
  }

  async function submitBooking(e: React.FormEvent) {
    e.preventDefault()
    if (!bookingClientId || !bookingDate || !bookingTime) return

    setBookingSubmitting(true)
    await fetch("/api/admin/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: bookingClientId,
        starts_at: combineDateAndTime(bookingDate, bookingTime),
        duration_minutes: Number(bookingDuration),
        note: bookingNote,
        direct_confirm: bookingMode === "coach_only",
      }),
    })
    setBookingSubmitting(false)
    setBookingOpen(false)
    setDayDetailOpen(true)
    load()
  }

  async function submitAvailability(e: React.FormEvent) {
    e.preventDefault()
    if (!availabilityStartDate || availabilityDays.length === 0) return

    const slotLength = Number(availabilitySlotLength)
    const rangeStart = new Date(`${availabilityStartDate}T00:00:00`)
    const rangeEnd = new Date(`${availabilityEndDate || availabilityStartDate}T00:00:00`)

    if (Number.isNaN(slotLength) || slotLength <= 0 || rangeStart > rangeEnd) return

    const payload: Array<{ starts_at: string; duration_minutes: number; is_visible: boolean }> = []
    const seen = new Set<string>()

    for (const current = new Date(rangeStart); current <= rangeEnd; current.setDate(current.getDate() + 1)) {
      if (!availabilityDays.includes(current.getDay())) continue

      const [startHour, startMinute] = availabilityStartTime.split(":").map(Number)
      const [endHour, endMinute] = availabilityEndTime.split(":").map(Number)
      const windowStart = new Date(current.getFullYear(), current.getMonth(), current.getDate(), startHour, startMinute)
      const windowEnd = new Date(current.getFullYear(), current.getMonth(), current.getDate(), endHour, endMinute)

      for (
        let slotStart = new Date(windowStart);
        slotStart.getTime() + slotLength * 60000 <= windowEnd.getTime();
        slotStart = new Date(slotStart.getTime() + slotLength * 60000)
      ) {
        const startsAt = slotStart.toISOString()
        if (existingSlotStarts.has(startsAt) || seen.has(startsAt)) continue
        seen.add(startsAt)
        payload.push({
          starts_at: startsAt,
          duration_minutes: slotLength,
          is_visible: availabilityVisible,
        })
      }
    }

    if (payload.length === 0) return

    setAvailabilitySubmitting(true)
    await fetch("/api/admin/appointment-slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slots: payload }),
    })
    setAvailabilitySubmitting(false)
    setAvailabilityOpen(false)
    setDayDetailOpen(true)
    load()
  }

  return (
    <div className="max-w-6xl p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-bold">Appointments</h1>
          <p className="text-sm text-gf-muted">
            Move quickly between coach-created bookings, client requests, and open availability without exposing slot-publishing mechanics in the main view.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => openBookingForDay(selectedDayKey)}>+ Booking</Button>
          <Button variant="secondary" onClick={() => openAvailabilityForDay(selectedDayKey)}>
            Availability
          </Button>
        </div>
      </div>

      <Card className="mb-8">
        <h2 className="text-lg font-semibold">Appointment Booking</h2>
        <p className="mt-2 text-sm text-gf-muted">
          Control whether clients only request sessions manually or can also see published slots.
        </p>
        <form onSubmit={saveBookingMode} className="mt-4 space-y-4">
          <Select
            label="Booking Mode"
            value={bookingMode}
            onChange={(e) => setBookingMode(e.target.value as BookingMode)}
            options={[
              { value: "coach_only", label: "Coach only" },
              { value: "client_request_visible_slots", label: "Client request visible slots" },
            ]}
          />
          <p className="text-xs text-gf-muted">
            Clients are never auto-confirmed in this mode. Coaches still confirm or decline requests manually.
          </p>
          {bookingModeError ? <p className="text-sm text-red-400">{bookingModeError}</p> : null}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={bookingModeSaving} size="sm">
              {bookingModeSaving ? "Saving..." : "Save Booking Mode"}
            </Button>
            {bookingModeSaved ? <span className="text-sm text-green-400">Saved</span> : null}
          </div>
        </form>
      </Card>

      <section className="mb-8">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-semibold">Calendar</h2>
            <p className="text-sm text-gf-muted">
              Click a day to review booked appointments, open slots, and quick actions. Confirmed sessions still sync on confirm.
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
              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-blue-200">
                Open slot
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
                  onClick={() => {
                    setSelectedDayKey(dayKey)
                    setDayDetailOpen(true)
                  }}
                  className={[
                    "min-h-32 rounded-xl border p-2 text-left transition",
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
                      <p className="text-sm">{formatSlotRange(a.confirmed_at, a.duration_minutes)}</p>
                    )}
                    {a.coach_note && (
                      <p className="text-sm text-gf-muted">"{a.coach_note}"</p>
                    )}
                    {formatMoney(a.session_price_amount, a.session_price_currency) && (
                      <p className="text-sm text-gf-muted">
                        {formatMoney(a.session_price_amount, a.session_price_currency)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {statusBadge(a.status)}
                    {paymentBadge(a.payment_status)}
                  </div>
                </div>
                {a.payment_status !== "paid" ? (
                  <div className="mt-3 space-y-3">
                    <PaymentRequestForm appointment={a} onDone={load} />
                    {a.clients?.id ? (
                      <Link
                        href={`/admin/payments?client_id=${encodeURIComponent(a.clients.id)}&source_appointment_id=${encodeURIComponent(a.id)}&amount=${encodeURIComponent(((a.session_price_amount ?? 0) / 100).toFixed(2))}&description=${encodeURIComponent("Invoice for confirmed coaching session")}`}
                        className="inline-flex text-sm text-gf-pink hover:text-gf-pink-light transition-colors"
                      >
                        Create invoice instead
                      </Link>
                    ) : null}
                  </div>
                ) : null}
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

      <Modal
        open={bookingOpen}
        title="+ Booking"
        description={
          bookingMode === "coach_only"
            ? "Create a confirmed booking directly for the selected client."
            : "Send a booking request using the existing request and confirm flow."
        }
        onClose={() => setBookingOpen(false)}
      >
        <form onSubmit={submitBooking} className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-gf-muted">Client</span>
            <select
              value={bookingClientId}
              onChange={(e) => setBookingClientId(e.target.value)}
              className="w-full rounded-lg border border-gf-border bg-gf-surface px-3 py-2 text-sm text-white focus:border-gf-pink focus:outline-none"
            >
              <option value="">Select client...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.email})
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm text-gf-muted">Date</span>
            <input
              type="date"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              className="w-full rounded-lg border border-gf-border bg-gf-surface px-3 py-2 text-sm text-white focus:border-gf-pink focus:outline-none"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-gf-muted">Start time</span>
            <input
              type="time"
              value={bookingTime}
              onChange={(e) => setBookingTime(e.target.value)}
              className="w-full rounded-lg border border-gf-border bg-gf-surface px-3 py-2 text-sm text-white focus:border-gf-pink focus:outline-none"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-gf-muted">Duration</span>
            <select
              value={bookingDuration}
              onChange={(e) => setBookingDuration(e.target.value)}
              className="w-full rounded-lg border border-gf-border bg-gf-surface px-3 py-2 text-sm text-white focus:border-gf-pink focus:outline-none"
            >
              {DURATION_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minutes
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-gf-muted">Notes</span>
            <textarea
              value={bookingNote}
              onChange={(e) => setBookingNote(e.target.value)}
              placeholder="Optional note"
              rows={3}
              className="w-full resize-none rounded-lg border border-gf-border bg-gf-surface px-3 py-2 text-sm text-white placeholder-gf-muted focus:border-gf-pink focus:outline-none"
            />
          </label>
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setBookingOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={bookingSubmitting || !bookingClientId || !bookingDate || !bookingTime}>
              {bookingSubmitting
                ? bookingMode === "coach_only"
                  ? "Creating..."
                  : "Sending..."
                : bookingMode === "coach_only"
                  ? "Create Booking"
                  : "Send Booking Request"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={availabilityOpen}
        title="Availability"
        description="Create one-off slots across selected weekdays and dates. These slots can stay internal or be exposed to clients."
        onClose={() => setAvailabilityOpen(false)}
      >
        <form onSubmit={submitAvailability} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <span className="text-sm text-gf-muted">Days of week</span>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_OPTIONS.map((day) => {
                const active = availabilityDays.includes(day.value)
                return (
                  <button
                    key={day.label}
                    type="button"
                    onClick={() =>
                      setAvailabilityDays((current) =>
                        current.includes(day.value)
                          ? current.filter((value) => value !== day.value)
                          : [...current, day.value]
                      )
                    }
                    className={[
                      "rounded-full border px-3 py-1.5 text-sm",
                      active
                        ? "border-gf-pink bg-gf-pink/15 text-white"
                        : "border-gf-border bg-gf-surface text-gf-muted hover:text-white",
                    ].join(" ")}
                  >
                    {day.label}
                  </button>
                )
              })}
            </div>
          </div>
          <label className="space-y-2">
            <span className="text-sm text-gf-muted">Start time</span>
            <input
              type="time"
              value={availabilityStartTime}
              onChange={(e) => setAvailabilityStartTime(e.target.value)}
              className="w-full rounded-lg border border-gf-border bg-gf-surface px-3 py-2 text-sm text-white focus:border-gf-pink focus:outline-none"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-gf-muted">End time</span>
            <input
              type="time"
              value={availabilityEndTime}
              onChange={(e) => setAvailabilityEndTime(e.target.value)}
              className="w-full rounded-lg border border-gf-border bg-gf-surface px-3 py-2 text-sm text-white focus:border-gf-pink focus:outline-none"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-gf-muted">Slot length</span>
            <select
              value={availabilitySlotLength}
              onChange={(e) => setAvailabilitySlotLength(e.target.value)}
              className="w-full rounded-lg border border-gf-border bg-gf-surface px-3 py-2 text-sm text-white focus:border-gf-pink focus:outline-none"
            >
              {DURATION_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minutes
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm text-gf-muted">Expose to clients</span>
            <select
              value={availabilityVisible ? "yes" : "no"}
              onChange={(e) => setAvailabilityVisible(e.target.value === "yes")}
              className="w-full rounded-lg border border-gf-border bg-gf-surface px-3 py-2 text-sm text-white focus:border-gf-pink focus:outline-none"
            >
              <option value="no">Coach only</option>
              <option value="yes">Visible to clients</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm text-gf-muted">From date</span>
            <input
              type="date"
              value={availabilityStartDate}
              onChange={(e) => setAvailabilityStartDate(e.target.value)}
              className="w-full rounded-lg border border-gf-border bg-gf-surface px-3 py-2 text-sm text-white focus:border-gf-pink focus:outline-none"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-gf-muted">To date</span>
            <input
              type="date"
              value={availabilityEndDate}
              onChange={(e) => setAvailabilityEndDate(e.target.value)}
              className="w-full rounded-lg border border-gf-border bg-gf-surface px-3 py-2 text-sm text-white focus:border-gf-pink focus:outline-none"
            />
          </label>
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setAvailabilityOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={availabilitySubmitting || availabilityDays.length === 0}>
              {availabilitySubmitting ? "Saving..." : "Save Availability"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={dayDetailOpen}
        title={selectedDate.toLocaleDateString("en-GB", { dateStyle: "full" })}
        description="Booked appointments, open slots, and quick actions for the selected day."
        onClose={() => setDayDetailOpen(false)}
      >
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setDayDetailOpen(false)
              openBookingForDay(selectedDayKey)
            }}
          >
            + Booking
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setDayDetailOpen(false)
              openAvailabilityForDay(selectedDayKey)
            }}
          >
            Availability
          </Button>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 font-medium">Booked appointments</h3>
            {selectedAppointments.length > 0 ? (
              <div className="space-y-3">
                {selectedAppointments.map((appointment) => (
                  <div key={`selected-${appointment.id}`} className="rounded-lg border border-gf-border px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{appointment.clients?.name ?? "Unknown client"}</p>
                        <p className="text-xs text-gf-muted">
                          {appointment.confirmed_at ? formatSlotRange(appointment.confirmed_at, appointment.duration_minutes) : "Request"}
                        </p>
                        {appointment.requested_note ? <p className="mt-1 text-xs text-gf-muted">"{appointment.requested_note}"</p> : null}
                      </div>
                      {statusBadge(appointment.status)}
                    </div>
                    {appointment.status === "pending" ? (
                      confirming === appointment.id ? (
                        <ConfirmForm id={appointment.id} initialConfirmedAt={appointment.confirmed_at} onDone={load} />
                      ) : declining === appointment.id ? (
                        <DeclineForm id={appointment.id} onDone={load} />
                      ) : (
                        <div className="mt-3 flex gap-2 border-t border-gf-border pt-3">
                          <Button
                            onClick={() => {
                              setConfirming(appointment.id)
                              setDeclining(null)
                            }}
                            className="text-sm py-1.5 px-4"
                          >
                            Confirm
                          </Button>
                          <button
                            onClick={() => {
                              setDeclining(appointment.id)
                              setConfirming(null)
                            }}
                            className="px-4 text-sm text-gf-muted hover:text-white"
                          >
                            Decline
                          </button>
                        </div>
                      )
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gf-muted">No appointments for this day.</p>
            )}
          </div>
          <div>
            <h3 className="mb-2 font-medium">Open slots</h3>
            {selectedSlots.length > 0 ? (
              <div className="space-y-3">
                {selectedSlots.map((slot) => (
                  <div key={`slot-${slot.id}`} className="rounded-lg border border-gf-border px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{formatSlotRange(slot.starts_at, slot.duration_minutes)}</p>
                        <p className="mt-1 text-xs text-gf-muted">{slot.is_visible ? "Visible to clients" : "Coach only"}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => removeSlot(slot.id)} className="text-sm text-gf-muted hover:text-white">
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
                    {selectedSlotId === slot.id ? (
                      <div className="mt-3 space-y-3 border-t border-gf-border pt-3">
                        <select
                          value={slotClientId}
                          onChange={(e) => setSlotClientId(e.target.value)}
                          className="w-full rounded-lg border border-gf-border bg-gf-surface px-3 py-2 text-sm text-white focus:border-gf-pink focus:outline-none"
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
                          className="w-full rounded-lg border border-gf-border bg-gf-surface px-3 py-2 text-sm text-white placeholder-gf-muted focus:border-gf-pink focus:outline-none"
                        />
                        <Button type="button" disabled={!slotClientId} onClick={() => assignSlot(slot.id)}>
                          Create Pending Appointment
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gf-muted">No open slots for this day.</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
