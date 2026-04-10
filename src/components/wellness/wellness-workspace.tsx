"use client"

import { useEffect, useMemo, useState } from "react"
import { ClientNav } from "@/components/layout/client-nav"
import { PoweredBy } from "@/components/branding/powered-by"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input, TextArea } from "@/components/ui/input"
import type { CoachBranding } from "@/lib/branding"

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function defaultWeekLabel() {
  return `Week of ${new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`
}

function createDefaultCheckInForm() {
  return {
    submitted_at: todayKey(),
    week_label: defaultWeekLabel(),
    energy_score: "7",
    stress_score: "7",
    sleep_score: "7",
    confidence_score: "7",
    wins: "",
    blockers: "",
    focus_for_next_week: "",
  }
}

type GoalAssignment = {
  id: string
  goal_name_snapshot: string
  description_snapshot: string | null
  target_metric: string | null
  target_value: string | null
  milestone_label: string | null
  status: "active" | "completed" | "cancelled"
}

type HabitAssignment = {
  id: string
  habit_name_snapshot: string
  description_snapshot: string | null
  target_count: number
  target_period: "day" | "week"
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

type WellnessCheckIn = {
  id: string
  submitted_at: string
  week_label: string | null
  energy_score: number | null
  stress_score: number | null
  sleep_score: number | null
  confidence_score: number | null
  wins: string | null
  blockers: string | null
  focus_for_next_week: string | null
  coach_follow_up_note: string | null
}

type WellnessSessionNote = {
  id: string
  session_date: string
  session_type: string
  summary: string
  client_wins: string | null
  priorities: string | null
  action_steps: string | null
}

type WellnessPayload = {
  goals: GoalAssignment[]
  habits: HabitAssignment[]
  habit_logs: HabitLog[]
  check_ins: WellnessCheckIn[]
  session_notes: WellnessSessionNote[]
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

export function WellnessWorkspace({
  initialBranding,
  initialActiveModules,
}: {
  initialBranding: CoachBranding
  initialActiveModules: string[]
}) {
  const [data, setData] = useState<WellnessPayload>({
    goals: [],
    habits: [],
    habit_logs: [],
    check_ins: [],
    session_notes: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [savingHabitId, setSavingHabitId] = useState<string | null>(null)
  const [habitNotes, setHabitNotes] = useState<Record<string, string>>({})
  const [checkInForm, setCheckInForm] = useState(createDefaultCheckInForm)
  const [savingCheckIn, setSavingCheckIn] = useState(false)

  async function load() {
    setError("")
    try {
      const response = await fetch("/api/client/wellness", { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to load wellness workspace")
      setData({
        goals: payload.goals ?? [],
        habits: payload.habits ?? [],
        habit_logs: payload.habit_logs ?? [],
        check_ins: payload.check_ins ?? [],
        session_notes: payload.session_notes ?? [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load wellness workspace")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch(() => setLoading(false))
  }, [])

  const activeGoals = useMemo(() => data.goals.filter((goal) => goal.status === "active"), [data.goals])
  const activeHabits = useMemo(() => data.habits.filter((habit) => habit.status === "active"), [data.habits])
  const latestCheckIn = data.check_ins[0] ?? null
  const latestSessionNote = data.session_notes[0] ?? null
  const todayHabitLogs = useMemo(() => {
    const map = new Map<string, HabitLog>()
    const today = todayKey()
    for (const log of data.habit_logs) {
      if (log.completion_date === today && !map.has(log.assignment_id)) {
        map.set(log.assignment_id, log)
      }
    }
    return map
  }, [data.habit_logs])

  async function submitHabitLog(assignmentId: string, completionStatus: "completed" | "partial" | "missed") {
    setSavingHabitId(assignmentId)
    setError("")
    try {
      const response = await fetch("/api/client/wellness/habit-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: assignmentId,
          completion_status: completionStatus,
          completion_date: todayKey(),
          notes: habitNotes[assignmentId] || null,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to save wellness habit")
      setHabitNotes((current) => ({ ...current, [assignmentId]: "" }))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save wellness habit")
    } finally {
      setSavingHabitId(null)
    }
  }

  async function submitCheckIn(event: React.FormEvent) {
    event.preventDefault()
    setSavingCheckIn(true)
    setError("")
    try {
      const response = await fetch("/api/client/wellness/check-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkInForm),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to save check-in")
      setCheckInForm(createDefaultCheckInForm())
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save check-in")
    } finally {
      setSavingCheckIn(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <ClientNav branding={initialBranding} activeModules={initialActiveModules} />
      <main className="flex-1 p-6 md:p-10 pb-24 md:pb-10">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold" style={{ color: initialBranding.brand_primary_color }}>
            Wellness
          </h1>
          <p className="mt-2 text-gf-muted">
            Track habits, stay connected to your current goals, and share weekly wellness check-ins with your coach.
          </p>

          {loading ? (
            <Card className="mt-6">
              <p className="text-sm text-gf-muted">Loading wellness workspace...</p>
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
                  <p className="text-xs text-gf-muted">Active goals</p>
                  <p className="mt-2 text-2xl font-bold text-white">{activeGoals.length}</p>
                </Card>
                <Card>
                  <p className="text-xs text-gf-muted">Active habits</p>
                  <p className="mt-2 text-2xl font-bold text-white">{activeHabits.length}</p>
                </Card>
                <Card>
                  <p className="text-xs text-gf-muted">Latest check-in</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {latestCheckIn ? new Date(latestCheckIn.submitted_at).toLocaleDateString("en-GB") : "None yet"}
                  </p>
                </Card>
                <Card>
                  <p className="text-xs text-gf-muted">Latest session note</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {latestSessionNote ? new Date(latestSessionNote.session_date).toLocaleDateString("en-GB") : "None yet"}
                  </p>
                </Card>
              </div>

              <Card>
                <h2 className="text-lg font-semibold text-white">Current goals</h2>
                {activeGoals.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {activeGoals.map((goal) => (
                      <div key={goal.id} className="rounded-xl border border-gf-border bg-gf-surface p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-white">{goal.goal_name_snapshot}</p>
                          {goal.target_metric ? <Badge variant="default">{goal.target_metric}</Badge> : null}
                          {goal.target_value ? <Badge variant="default">{goal.target_value}</Badge> : null}
                        </div>
                        {goal.description_snapshot ? <p className="mt-2 text-sm text-gf-muted">{goal.description_snapshot}</p> : null}
                        {goal.milestone_label ? <p className="mt-2 text-sm text-gf-muted">Milestone: {goal.milestone_label}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-gf-muted">No active wellness goals are assigned yet.</p>
                )}
              </Card>

              <Card>
                <h2 className="text-lg font-semibold text-white">Wellness habits</h2>
                {activeHabits.length > 0 ? (
                  <div className="mt-4 space-y-4">
                    {activeHabits.map((habit) => (
                      <div key={habit.id} className="rounded-xl border border-gf-border bg-gf-surface p-4">
                        {todayHabitLogs.get(habit.id) ? (
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <Badge variant="success">Updated today</Badge>
                            <span className="text-xs text-gf-muted">{todayHabitLogs.get(habit.id)?.completion_status}</span>
                          </div>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-white">{habit.habit_name_snapshot}</p>
                          <Badge variant="default">{habit.target_count} per {habit.target_period}</Badge>
                        </div>
                        {habit.description_snapshot ? <p className="mt-2 text-sm text-gf-muted">{habit.description_snapshot}</p> : null}
                        <div className="mt-4 grid gap-3 md:grid-cols-[1fr,auto]">
                          <TextArea
                            label="Quick note"
                            value={habitNotes[habit.id] ?? ""}
                            onChange={(event) => setHabitNotes((current) => ({ ...current, [habit.id]: event.target.value }))}
                            placeholder="Optional note for your coach"
                          />
                          <div className="flex flex-wrap items-end gap-2">
                            <Button type="button" disabled={savingHabitId === habit.id} onClick={() => submitHabitLog(habit.id, "completed")}>
                              {savingHabitId === habit.id ? "Saving..." : todayHabitLogs.get(habit.id) ? "Update as completed" : "Completed"}
                            </Button>
                            <Button type="button" variant="secondary" disabled={savingHabitId === habit.id} onClick={() => submitHabitLog(habit.id, "partial")}>
                              {todayHabitLogs.get(habit.id) ? "Update as partial" : "Partial"}
                            </Button>
                            <Button type="button" variant="ghost" disabled={savingHabitId === habit.id} onClick={() => submitHabitLog(habit.id, "missed")}>
                              {todayHabitLogs.get(habit.id) ? "Update as missed" : "Missed"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-gf-muted">No active wellness habits are assigned yet.</p>
                )}
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <h2 className="text-lg font-semibold text-white">Weekly check-in</h2>
                  <form onSubmit={submitCheckIn} className="mt-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input label="Date" type="date" value={checkInForm.submitted_at} onChange={(e) => setCheckInForm((c) => ({ ...c, submitted_at: e.target.value }))} />
                      <Input label="Week label" value={checkInForm.week_label} onChange={(e) => setCheckInForm((c) => ({ ...c, week_label: e.target.value }))} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {[
                        ["energy_score", "Energy"],
                        ["stress_score", "Stress"],
                        ["sleep_score", "Sleep"],
                        ["confidence_score", "Confidence"],
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
                    <TextArea label="Blockers" value={checkInForm.blockers} onChange={(e) => setCheckInForm((c) => ({ ...c, blockers: e.target.value }))} />
                    <TextArea label="Focus for next week" value={checkInForm.focus_for_next_week} onChange={(e) => setCheckInForm((c) => ({ ...c, focus_for_next_week: e.target.value }))} />
                    <Button type="submit" disabled={savingCheckIn}>{savingCheckIn ? "Saving..." : "Submit check-in"}</Button>
                  </form>
                </Card>

                <Card>
                  <h2 className="text-lg font-semibold text-white">Recent coaching notes</h2>
                  <div className="mt-4 space-y-3">
                    {data.session_notes.slice(0, 4).map((note) => (
                      <div key={note.id} className="rounded-xl border border-gf-border bg-gf-surface p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-white">{note.session_type.replace(/_/g, " ")}</p>
                          <Badge variant="default">{new Date(note.session_date).toLocaleDateString("en-GB")}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-gf-muted">{note.summary}</p>
                        {note.action_steps ? <p className="mt-2 text-sm text-gf-muted">Action steps: {note.action_steps}</p> : null}
                      </div>
                    ))}
                    {data.session_notes.length === 0 ? (
                      <p className="text-sm text-gf-muted">No coaching notes shared yet.</p>
                    ) : null}
                  </div>
                </Card>
              </div>

              <Card>
                <h2 className="text-lg font-semibold text-white">Recent habit activity</h2>
                {data.habit_logs.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {data.habit_logs.slice(0, 6).map((log) => {
                      const habit = data.habits.find((item) => item.id === log.assignment_id)
                      return (
                        <div key={log.id} className="rounded-xl border border-gf-border bg-gf-surface p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-white">{habit?.habit_name_snapshot ?? "Wellness habit"}</p>
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
            </div>
          )}

          {initialBranding.show_powered_by && <PoweredBy className="mt-8" />}
        </div>
      </main>
    </div>
  )
}
