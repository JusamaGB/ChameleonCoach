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

function statusBadge(status: Appointment["status"]) {
  switch (status) {
    case "pending": return <Badge variant="warning">Pending</Badge>
    case "confirmed": return <Badge variant="success">Confirmed</Badge>
    case "declined": return <Badge variant="default">Declined</Badge>
    case "cancelled": return <Badge variant="default">Cancelled</Badge>
  }
}

function ConfirmForm({ id, onDone }: { id: string; onDone: () => void }) {
  const [confirmedAt, setConfirmedAt] = useState("")
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
        <button
          onClick={onDone}
          className="text-sm text-gf-muted hover:text-white px-4"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [confirming, setConfirming] = useState<string | null>(null)

  async function load() {
    const data = await fetch("/api/admin/appointments").then((r) => r.json())
    setAppointments(data.appointments ?? [])
    setConfirming(null)
  }

  useEffect(() => { load() }, [])

  async function decline(id: string) {
    await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "declined" }),
    })
    load()
  }

  const pending = appointments.filter((a) => a.status === "pending")
  const confirmed = appointments.filter((a) => a.status === "confirmed")
  const past = appointments.filter((a) => a.status === "declined" || a.status === "cancelled")

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Appointments</h1>

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
                      {new Date(a.created_at).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  {statusBadge(a.status)}
                </div>
                {confirming === a.id ? (
                  <ConfirmForm id={a.id} onDone={load} />
                ) : (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gf-border">
                    <Button
                      onClick={() => setConfirming(a.id)}
                      className="text-sm py-1.5 px-4"
                    >
                      Confirm
                    </Button>
                    <button
                      onClick={() => decline(a.id)}
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
