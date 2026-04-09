"use client"

import { useEffect, useMemo, useState } from "react"
import { ClientNav } from "@/components/layout/client-nav"
import { PoweredBy } from "@/components/branding/powered-by"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input, Select, TextArea } from "@/components/ui/input"
import { DEFAULT_COACH_BRANDING, type CoachBranding } from "@/lib/branding"

type HabitAssignment = {
  id: string
  habit_name_snapshot: string
  description_snapshot: string | null
  target_count: number
  target_period: "day" | "week"
  meal_slot: "breakfast" | "lunch" | "dinner" | "snacks" | "any"
  status: "active" | "completed" | "cancelled"
}

type HabitLog = {
  id: string
  assignment_id: string
  completion_date: string
  completion_status: "completed" | "partial" | "missed"
  adherence_score: number | null
  notes: string | null
  logged_at: string
}

type NutritionCheckIn = {
  id: string
  submitted_at: string
  week_label: string | null
  adherence_score: number | null
  energy_score: number | null
  hunger_score: number | null
  digestion_score: number | null
  sleep_score: number | null
  wins: string | null
  struggles: string | null
  coach_follow_up_note: string | null
}

type NutritionLog = {
  id: string
  logged_at: string
  meal_slot: "breakfast" | "lunch" | "dinner" | "snacks" | "any"
  entry_title: string
  notes: string | null
  adherence_flag: "on_plan" | "off_plan" | "flexible"
  hunger_score: number | null
  coach_note: string | null
}

type NutritionPayload = {
  habits: HabitAssignment[]
  habit_logs: HabitLog[]
  check_ins: NutritionCheckIn[]
  logs: NutritionLog[]
}

function habitBadge(status: HabitLog["completion_status"]) {
  switch (status) {
    case "completed":
      return <Badge variant="success">Completed</Badge>
    case "partial":
      return <Badge variant="warning">Partial</Badge>
    default:
      return <Badge>Missed</Badge>
  }
}

export function NutritionWorkspace({
  initialBranding,
  initialActiveModules,
}: {
  initialBranding: CoachBranding
  initialActiveModules: string[]
}) {
  const [data, setData] = useState<NutritionPayload>({
    habits: [],
    habit_logs: [],
    check_ins: [],
    logs: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [savingHabitId, setSavingHabitId] = useState<string | null>(null)
  const [habitNotes, setHabitNotes] = useState<Record<string, string>>({})
  const [checkInForm, setCheckInForm] = useState({
    submitted_at: "",
    week_label: "",
    adherence_score: "7",
    energy_score: "7",
    hunger_score: "7",
    digestion_score: "7",
    sleep_score: "7",
    wins: "",
    struggles: "",
  })
  const [logForm, setLogForm] = useState({
    logged_at: "",
    meal_slot: "any",
    entry_title: "",
    adherence_flag: "flexible",
    hunger_score: "7",
    notes: "",
  })
  const [savingCheckIn, setSavingCheckIn] = useState(false)
  const [savingLog, setSavingLog] = useState(false)

  async function load() {
    setError("")
    try {
      const response = await fetch("/api/client/nutrition", { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load nutrition workspace")
      }
      setData({
        habits: payload.habits ?? [],
        habit_logs: payload.habit_logs ?? [],
        check_ins: payload.check_ins ?? [],
        logs: payload.logs ?? [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load nutrition workspace")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch(() => {
      setLoading(false)
    })
  }, [])

  const activeHabits = useMemo(
    () => data.habits.filter((habit) => habit.status === "active"),
    [data.habits]
  )
  const habitLogsThisWeek = useMemo(() => {
    const now = new Date()
    return data.habit_logs.filter((log) => {
      const date = new Date(log.completion_date)
      const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
      return diffDays >= 0 && diffDays < 7
    })
  }, [data.habit_logs])
  const latestCheckIn = data.check_ins[0] ?? null
  const latestLog = data.logs[0] ?? null

  async function submitHabitLog(assignmentId: string, completionStatus: "completed" | "partial" | "missed") {
    setSavingHabitId(assignmentId)
    setError("")
    try {
      const response = await fetch("/api/client/nutrition/habit-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: assignmentId,
          completion_status: completionStatus,
          completion_date: new Date().toISOString().slice(0, 10),
          notes: habitNotes[assignmentId] || null,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save nutrition habit")
      }
      setHabitNotes((current) => ({ ...current, [assignmentId]: "" }))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save nutrition habit")
    } finally {
      setSavingHabitId(null)
    }
  }

  async function submitCheckIn(event: React.FormEvent) {
    event.preventDefault()
    setSavingCheckIn(true)
    setError("")
    try {
      const response = await fetch("/api/client/nutrition/check-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkInForm),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save check-in")
      }
      setCheckInForm({
        submitted_at: "",
        week_label: "",
        adherence_score: "7",
        energy_score: "7",
        hunger_score: "7",
        digestion_score: "7",
        sleep_score: "7",
        wins: "",
        struggles: "",
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save check-in")
    } finally {
      setSavingCheckIn(false)
    }
  }

  async function submitLog(event: React.FormEvent) {
    event.preventDefault()
    setSavingLog(true)
    setError("")
    try {
      const response = await fetch("/api/client/nutrition/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logForm),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save nutrition log")
      }
      setLogForm({
        logged_at: "",
        meal_slot: "any",
        entry_title: "",
        adherence_flag: "flexible",
        hunger_score: "7",
        notes: "",
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save nutrition log")
    } finally {
      setSavingLog(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <ClientNav branding={initialBranding} activeModules={initialActiveModules} />
      <main className="flex-1 p-6 md:p-10 pb-24 md:pb-10">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold" style={{ color: initialBranding.brand_primary_color }}>
            Nutrition
          </h1>
          <p className="mt-2 text-gf-muted">
            Track your habits, send weekly check-ins, and log real-world nutrition notes for your coach.
          </p>

          {loading ? (
            <Card className="mt-6">
              <p className="text-sm text-gf-muted">Loading nutrition workspace...</p>
            </Card>
          ) : (
            <div className="mt-6 space-y-6">
              {error ? (
                <Card className="border-yellow-500/30">
                  <p className="text-sm text-yellow-300">{error}</p>
                </Card>
              ) : null}

              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <p className="text-xs text-gf-muted">Active habits</p>
                  <p className="mt-2 text-2xl font-bold text-white">{activeHabits.length}</p>
                </Card>
                <Card>
                  <p className="text-xs text-gf-muted">Habit logs (7d)</p>
                  <p className="mt-2 text-2xl font-bold text-white">{habitLogsThisWeek.length}</p>
                </Card>
                <Card>
                  <p className="text-xs text-gf-muted">Latest check-in</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {latestCheckIn ? new Date(latestCheckIn.submitted_at).toLocaleDateString("en-GB") : "None yet"}
                  </p>
                </Card>
                <Card>
                  <p className="text-xs text-gf-muted">Latest log</p>
                  <p className="mt-2 text-sm font-semibold text-white">{latestLog?.entry_title ?? "None yet"}</p>
                </Card>
              </div>

              <Card>
                <h2 className="text-lg font-semibold text-white">Nutrition habits</h2>
                <p className="mt-1 text-sm text-gf-muted">
                  Mark today’s habits so your coach can see what’s going well and what needs support.
                </p>
                {activeHabits.length > 0 ? (
                  <div className="mt-4 space-y-4">
                    {activeHabits.map((habit) => (
                      <div key={habit.id} className="rounded-xl border border-gf-border bg-gf-surface p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-white">{habit.habit_name_snapshot}</p>
                          <Badge variant="default">{habit.target_count} per {habit.target_period}</Badge>
                          <Badge variant="default">{habit.meal_slot}</Badge>
                        </div>
                        {habit.description_snapshot ? (
                          <p className="mt-2 text-sm text-gf-muted">{habit.description_snapshot}</p>
                        ) : null}
                        <div className="mt-4 grid gap-3 md:grid-cols-[1fr,auto]">
                          <TextArea
                            label="Quick note"
                            value={habitNotes[habit.id] ?? ""}
                            onChange={(event) => setHabitNotes((current) => ({ ...current, [habit.id]: event.target.value }))}
                            placeholder="Optional note for your coach"
                          />
                          <div className="flex flex-wrap items-end gap-2">
                            <Button type="button" disabled={savingHabitId === habit.id} onClick={() => submitHabitLog(habit.id, "completed")}>
                              {savingHabitId === habit.id ? "Saving..." : "Completed"}
                            </Button>
                            <Button type="button" variant="secondary" disabled={savingHabitId === habit.id} onClick={() => submitHabitLog(habit.id, "partial")}>
                              Partial
                            </Button>
                            <Button type="button" variant="ghost" disabled={savingHabitId === habit.id} onClick={() => submitHabitLog(habit.id, "missed")}>
                              Missed
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-gf-muted">No active nutrition habits are assigned yet.</p>
                )}
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <h2 className="text-lg font-semibold text-white">Weekly check-in</h2>
                  <form onSubmit={submitCheckIn} className="mt-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input label="Date" type="date" value={checkInForm.submitted_at} onChange={(e) => setCheckInForm((c) => ({ ...c, submitted_at: e.target.value }))} />
                      <Input label="Week label" value={checkInForm.week_label} onChange={(e) => setCheckInForm((c) => ({ ...c, week_label: e.target.value }))} placeholder="e.g. Week of 8 April" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {[
                        ["adherence_score", "Adherence"],
                        ["energy_score", "Energy"],
                        ["hunger_score", "Hunger"],
                        ["digestion_score", "Digestion"],
                        ["sleep_score", "Sleep"],
                      ].map(([field, label]) => (
                        <Input
                          key={field}
                          label={`${label} (1-10)`}
                          type="number"
                          min="1"
                          max="10"
                          value={checkInForm[field as keyof typeof checkInForm] as string}
                          onChange={(e) => setCheckInForm((c) => ({ ...c, [field]: e.target.value }))}
                        />
                      ))}
                    </div>
                    <TextArea label="Wins" value={checkInForm.wins} onChange={(e) => setCheckInForm((c) => ({ ...c, wins: e.target.value }))} />
                    <TextArea label="Struggles" value={checkInForm.struggles} onChange={(e) => setCheckInForm((c) => ({ ...c, struggles: e.target.value }))} />
                    <Button type="submit" disabled={savingCheckIn}>{savingCheckIn ? "Saving..." : "Submit check-in"}</Button>
                  </form>
                </Card>

                <Card>
                  <h2 className="text-lg font-semibold text-white">Nutrition log</h2>
                  <form onSubmit={submitLog} className="mt-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input label="Date" type="date" value={logForm.logged_at} onChange={(e) => setLogForm((c) => ({ ...c, logged_at: e.target.value }))} />
                      <Select
                        label="Meal slot"
                        options={[
                          { value: "any", label: "Any" },
                          { value: "breakfast", label: "Breakfast" },
                          { value: "lunch", label: "Lunch" },
                          { value: "dinner", label: "Dinner" },
                          { value: "snacks", label: "Snacks" },
                        ]}
                        value={logForm.meal_slot}
                        onChange={(e) => setLogForm((c) => ({ ...c, meal_slot: e.target.value }))}
                      />
                    </div>
                    <Input label="Entry title" value={logForm.entry_title} onChange={(e) => setLogForm((c) => ({ ...c, entry_title: e.target.value }))} placeholder="e.g. Weekend dinner out" />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Select
                        label="Adherence"
                        options={[
                          { value: "flexible", label: "Flexible" },
                          { value: "on_plan", label: "On plan" },
                          { value: "off_plan", label: "Off plan" },
                        ]}
                        value={logForm.adherence_flag}
                        onChange={(e) => setLogForm((c) => ({ ...c, adherence_flag: e.target.value }))}
                      />
                      <Input label="Hunger (1-10)" type="number" min="1" max="10" value={logForm.hunger_score} onChange={(e) => setLogForm((c) => ({ ...c, hunger_score: e.target.value }))} />
                    </div>
                    <TextArea label="Notes" value={logForm.notes} onChange={(e) => setLogForm((c) => ({ ...c, notes: e.target.value }))} />
                    <Button type="submit" disabled={savingLog}>{savingLog ? "Saving..." : "Save nutrition log"}</Button>
                  </form>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <h2 className="text-lg font-semibold text-white">Recent habit activity</h2>
                  {data.habit_logs.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {data.habit_logs.slice(0, 6).map((log) => {
                        const habit = data.habits.find((item) => item.id === log.assignment_id)
                        return (
                          <div key={log.id} className="rounded-xl border border-gf-border bg-gf-surface p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-white">{habit?.habit_name_snapshot ?? "Nutrition habit"}</p>
                              {habitBadge(log.completion_status)}
                              {log.adherence_score ? <Badge variant="default">{log.adherence_score}/10</Badge> : null}
                            </div>
                            <p className="mt-2 text-xs text-gf-muted">{new Date(log.completion_date).toLocaleDateString("en-GB")}</p>
                            {log.notes ? <p className="mt-2 text-sm text-gf-muted">{log.notes}</p> : null}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-gf-muted">No habit activity logged yet.</p>
                  )}
                </Card>

                <Card>
                  <h2 className="text-lg font-semibold text-white">Recent check-ins and logs</h2>
                  <div className="mt-4 space-y-3">
                    {data.check_ins.slice(0, 3).map((checkIn) => (
                      <div key={checkIn.id} className="rounded-xl border border-gf-border bg-gf-surface p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-white">{checkIn.week_label || "Weekly check-in"}</p>
                          {checkIn.adherence_score ? <Badge variant="default">Adherence {checkIn.adherence_score}/10</Badge> : null}
                        </div>
                        <p className="mt-2 text-xs text-gf-muted">{new Date(checkIn.submitted_at).toLocaleDateString("en-GB")}</p>
                        {checkIn.wins ? <p className="mt-2 text-sm text-gf-muted">Wins: {checkIn.wins}</p> : null}
                        {checkIn.coach_follow_up_note ? <p className="mt-2 text-sm text-gf-muted">Coach follow-up: {checkIn.coach_follow_up_note}</p> : null}
                      </div>
                    ))}
                    {data.logs.slice(0, 3).map((log) => (
                      <div key={log.id} className="rounded-xl border border-gf-border bg-gf-surface p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-white">{log.entry_title}</p>
                          <Badge variant="default">{log.meal_slot}</Badge>
                        </div>
                        <p className="mt-2 text-xs text-gf-muted">{new Date(log.logged_at).toLocaleString("en-GB")}</p>
                        {log.notes ? <p className="mt-2 text-sm text-gf-muted">{log.notes}</p> : null}
                        {log.coach_note ? <p className="mt-2 text-sm text-gf-muted">Coach note: {log.coach_note}</p> : null}
                      </div>
                    ))}
                    {data.check_ins.length === 0 && data.logs.length === 0 ? (
                      <p className="text-sm text-gf-muted">No recent nutrition check-ins or logs yet.</p>
                    ) : null}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {initialBranding.show_powered_by && <PoweredBy className="mt-8" />}
        </div>
      </main>
    </div>
  )
}
