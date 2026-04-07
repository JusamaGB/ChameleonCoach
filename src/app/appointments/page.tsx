"use client"

import { useState, useEffect } from "react"
import { ClientNav } from "@/components/layout/client-nav"
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
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch("/api/appointments")
      .then((r) => r.json())
      .then((d) => setAppointments(d.appointments ?? []))
  }, [])

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    setSuccess(false)

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    })

    if (res.ok) {
      setNote("")
      setSuccess(true)
      const data = await fetch("/api/appointments").then((r) => r.json())
      setAppointments(data.appointments ?? [])
    } else {
      const d = await res.json()
      setError(d.error || "Something went wrong")
    }
    setSubmitting(false)
  }

  const pending = appointments.filter((a) => a.status === "pending")
  const confirmed = appointments.filter((a) => a.status === "confirmed")
  const past = appointments.filter((a) => a.status === "declined" || a.status === "cancelled")

  return (
    <div className="flex min-h-screen bg-gf-bg">
      <ClientNav />
      <main className="flex-1 p-6 md:p-8 pb-24 md:pb-8">
        <h1 className="text-2xl font-bold mb-6">Appointments</h1>

        <Card className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Request a Session</h2>
          <form onSubmit={handleRequest} className="space-y-3">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note for your coach (optional)"
              rows={3}
              className="w-full bg-gf-surface border border-gf-border rounded-lg px-4 py-3 text-sm text-white placeholder-gf-muted focus:outline-none focus:border-gf-pink resize-none"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            {success && <p className="text-sm text-green-400">Request sent! Your coach will be in touch.</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Sending..." : "Request Session"}
            </Button>
          </form>
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
                        Requested {new Date(a.created_at).toLocaleDateString("en-GB")}
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
      </main>
    </div>
  )
}
