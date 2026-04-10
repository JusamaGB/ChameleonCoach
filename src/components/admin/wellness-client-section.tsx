"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input, TextArea } from "@/components/ui/input"
import type {
  ClientWellnessCheckIn,
  ClientWellnessGoalAssignment,
  ClientWellnessHabitAssignment,
  ClientWellnessHabitLog,
  ClientWellnessSessionNote,
  WellnessGoalTemplate,
  WellnessHabitTemplate,
} from "@/types"

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

export function WellnessClientSection({
  clientId,
  goalTemplates,
  habitTemplates,
  goalAssignments,
  habitAssignments,
  habitLogs,
  checkIns,
  sessionNotes,
}: {
  clientId: string
  goalTemplates: WellnessGoalTemplate[]
  habitTemplates: WellnessHabitTemplate[]
  goalAssignments: ClientWellnessGoalAssignment[]
  habitAssignments: ClientWellnessHabitAssignment[]
  habitLogs: ClientWellnessHabitLog[]
  checkIns: ClientWellnessCheckIn[]
  sessionNotes: ClientWellnessSessionNote[]
}) {
  const router = useRouter()
  const [goalTemplateId, setGoalTemplateId] = useState("")
  const [goalStartDate, setGoalStartDate] = useState("")
  const [habitTemplateId, setHabitTemplateId] = useState("")
  const [habitStartDate, setHabitStartDate] = useState("")
  const [assigningGoal, setAssigningGoal] = useState(false)
  const [assigningHabit, setAssigningHabit] = useState(false)
  const [updatingGoalId, setUpdatingGoalId] = useState<string | null>(null)
  const [updatingHabitId, setUpdatingHabitId] = useState<string | null>(null)
  const [editingHabitLogId, setEditingHabitLogId] = useState<string | null>(null)
  const [habitLogForm, setHabitLogForm] = useState({ adherence_score: "", coach_note: "" })
  const [savingHabitLog, setSavingHabitLog] = useState(false)
  const [checkInForm, setCheckInForm] = useState({
    submitted_at: todayKey(),
    week_label: defaultWeekLabel(),
    energy_score: "7",
    stress_score: "7",
    sleep_score: "7",
    confidence_score: "7",
    wins: "",
    blockers: "",
    focus_for_next_week: "",
    coach_follow_up_note: "",
  })
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false)
  const [sessionNoteForm, setSessionNoteForm] = useState({
    session_date: todayKey(),
    session_type: "coaching_session",
    summary: "",
    client_wins: "",
    priorities: "",
    action_steps: "",
  })
  const [submittingSessionNote, setSubmittingSessionNote] = useState(false)
  const [error, setError] = useState("")

  const activeGoals = goalAssignments.filter((goal) => goal.status === "active")
  const activeHabits = habitAssignments.filter((habit) => habit.status === "active")
  const latestCheckIn = checkIns[0] ?? null
  const latestSessionNote = sessionNotes[0] ?? null

  async function handleAssignGoal(event: React.FormEvent) {
    event.preventDefault()
    if (!goalTemplateId) return
    setAssigningGoal(true)
    setError("")
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/wellness-goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal_template_id: goalTemplateId,
          assigned_start_date: goalStartDate || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to assign goal")
        return
      }
      setGoalTemplateId("")
      setGoalStartDate("")
      router.refresh()
    } catch {
      setError("Failed to assign goal")
    } finally {
      setAssigningGoal(false)
    }
  }

  async function handleAssignHabit(event: React.FormEvent) {
    event.preventDefault()
    if (!habitTemplateId) return
    setAssigningHabit(true)
    setError("")
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/wellness-habits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          habit_template_id: habitTemplateId,
          assigned_start_date: habitStartDate || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to assign habit")
        return
      }
      setHabitTemplateId("")
      setHabitStartDate("")
      router.refresh()
    } catch {
      setError("Failed to assign habit")
    } finally {
      setAssigningHabit(false)
    }
  }

  async function updateGoal(assignmentId: string, status: ClientWellnessGoalAssignment["status"]) {
    setUpdatingGoalId(assignmentId)
    setError("")
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/wellness-goals/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to update goal")
        return
      }
      router.refresh()
    } catch {
      setError("Failed to update goal")
    } finally {
      setUpdatingGoalId(null)
    }
  }

  async function updateHabit(assignmentId: string, status: ClientWellnessHabitAssignment["status"]) {
    setUpdatingHabitId(assignmentId)
    setError("")
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/wellness-habits/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to update habit")
        return
      }
      router.refresh()
    } catch {
      setError("Failed to update habit")
    } finally {
      setUpdatingHabitId(null)
    }
  }

  async function submitCheckIn(event: React.FormEvent) {
    event.preventDefault()
    setSubmittingCheckIn(true)
    setError("")
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/wellness-check-ins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkInForm),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to add wellness check-in")
        return
      }
      setCheckInForm({
        submitted_at: todayKey(),
        week_label: defaultWeekLabel(),
        energy_score: "7",
        stress_score: "7",
        sleep_score: "7",
        confidence_score: "7",
        wins: "",
        blockers: "",
        focus_for_next_week: "",
        coach_follow_up_note: "",
      })
      router.refresh()
    } catch {
      setError("Failed to add wellness check-in")
    } finally {
      setSubmittingCheckIn(false)
    }
  }

  async function submitSessionNote(event: React.FormEvent) {
    event.preventDefault()
    setSubmittingSessionNote(true)
    setError("")
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/wellness-session-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionNoteForm),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to add session note")
        return
      }
      setSessionNoteForm({
        session_date: todayKey(),
        session_type: "coaching_session",
        summary: "",
        client_wins: "",
        priorities: "",
        action_steps: "",
      })
      router.refresh()
    } catch {
      setError("Failed to add session note")
    } finally {
      setSubmittingSessionNote(false)
    }
  }

  async function saveHabitLog(logId: string) {
    setSavingHabitLog(true)
    setError("")
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/wellness-habit-logs/${logId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adherence_score: habitLogForm.adherence_score || null,
          coach_note: habitLogForm.coach_note,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to update habit log")
        return
      }
      setEditingHabitLogId(null)
      setHabitLogForm({ adherence_score: "", coach_note: "" })
      router.refresh()
    } catch {
      setError("Failed to update habit log")
    } finally {
      setSavingHabitLog(false)
    }
  }

  return (
    <section className="rounded-3xl border border-gf-border bg-gf-dark/40 p-6">
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
          <p className="text-xs uppercase tracking-wide text-gf-muted">Active goals</p>
          <p className="mt-2 text-2xl font-semibold text-white">{activeGoals.length}</p>
        </div>
        <div className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
          <p className="text-xs uppercase tracking-wide text-gf-muted">Active habits</p>
          <p className="mt-2 text-2xl font-semibold text-white">{activeHabits.length}</p>
        </div>
        <div className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
          <p className="text-xs uppercase tracking-wide text-gf-muted">Latest check-in</p>
          <p className="mt-2 text-sm font-medium text-white">
            {latestCheckIn ? new Date(latestCheckIn.submitted_at).toLocaleDateString("en-GB") : "None yet"}
          </p>
        </div>
        <div className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
          <p className="text-xs uppercase tracking-wide text-gf-muted">Latest session note</p>
          <p className="mt-2 text-sm font-medium text-white">
            {latestSessionNote ? new Date(latestSessionNote.session_date).toLocaleDateString("en-GB") : "None yet"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
          <p className="text-sm font-medium text-white">Wellness goals</p>
          {goalTemplates.length > 0 ? (
            <form onSubmit={handleAssignGoal} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gf-muted">Goal template</label>
                <select value={goalTemplateId} onChange={(e) => setGoalTemplateId(e.target.value)} className="mt-1 w-full rounded-lg border border-gf-border bg-gf-black px-4 py-2.5 text-white">
                  <option value="">Select a goal...</option>
                  {goalTemplates.map((goal) => (
                    <option key={goal.id} value={goal.id}>{goal.name}</option>
                  ))}
                </select>
              </div>
              <Input label="Start date" type="date" value={goalStartDate} onChange={(e) => setGoalStartDate(e.target.value)} />
              <Button type="submit" disabled={assigningGoal}>{assigningGoal ? "Assigning..." : "Assign goal"}</Button>
            </form>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-gf-border bg-gf-black/10 px-4 py-5">
              <p className="text-sm font-medium text-white">No wellness goals yet</p>
              <Link href="/admin/wellness-goals" className="mt-3 inline-flex text-sm text-gf-pink hover:text-gf-pink-light transition-colors">Open wellness goals</Link>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
          <p className="text-sm font-medium text-white">Wellness habits</p>
          {habitTemplates.length > 0 ? (
            <form onSubmit={handleAssignHabit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gf-muted">Habit template</label>
                <select value={habitTemplateId} onChange={(e) => setHabitTemplateId(e.target.value)} className="mt-1 w-full rounded-lg border border-gf-border bg-gf-black px-4 py-2.5 text-white">
                  <option value="">Select a habit...</option>
                  {habitTemplates.map((habit) => (
                    <option key={habit.id} value={habit.id}>{habit.name}</option>
                  ))}
                </select>
              </div>
              <Input label="Start date" type="date" value={habitStartDate} onChange={(e) => setHabitStartDate(e.target.value)} />
              <Button type="submit" disabled={assigningHabit}>{assigningHabit ? "Assigning..." : "Assign habit"}</Button>
            </form>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-gf-border bg-gf-black/10 px-4 py-5">
              <p className="text-sm font-medium text-white">No wellness habits yet</p>
              <Link href="/admin/wellness-habits" className="mt-3 inline-flex text-sm text-gf-pink hover:text-gf-pink-light transition-colors">Open wellness habits</Link>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
          <p className="text-sm font-medium text-white">Assigned goals</p>
          <div className="mt-4 space-y-3">
            {goalAssignments.map((goal) => (
              <div key={goal.id} className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-white">{goal.goal_name_snapshot}</p>
                      <Badge variant={goal.status === "active" ? "success" : "default"}>{goal.status}</Badge>
                    </div>
                    {goal.target_metric ? <p className="mt-2 text-sm text-gf-muted">{goal.target_metric}{goal.target_value ? `: ${goal.target_value}` : ""}</p> : null}
                    {goal.milestone_label ? <p className="mt-2 text-sm text-gf-muted">Milestone: {goal.milestone_label}</p> : null}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {goal.status === "active" ? (
                      <>
                        <Button type="button" variant="ghost" size="sm" disabled={updatingGoalId === goal.id} onClick={() => updateGoal(goal.id, "completed")}>Complete</Button>
                        <Button type="button" variant="ghost" size="sm" disabled={updatingGoalId === goal.id} onClick={() => updateGoal(goal.id, "cancelled")}>Cancel</Button>
                      </>
                    ) : (
                      <Button type="button" variant="ghost" size="sm" disabled={updatingGoalId === goal.id} onClick={() => updateGoal(goal.id, "active")}>Reactivate</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {goalAssignments.length === 0 ? <p className="text-sm text-gf-muted">No goals assigned yet.</p> : null}
          </div>
        </div>

        <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
          <p className="text-sm font-medium text-white">Assigned habits</p>
          <div className="mt-4 space-y-3">
            {habitAssignments.map((habit) => (
              <div key={habit.id} className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-white">{habit.habit_name_snapshot}</p>
                      <Badge variant={habit.status === "active" ? "success" : "default"}>{habit.status}</Badge>
                      <Badge variant="default">{habit.target_count} per {habit.target_period}</Badge>
                    </div>
                    {habit.description_snapshot ? <p className="mt-2 text-sm text-gf-muted">{habit.description_snapshot}</p> : null}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {habit.status === "active" ? (
                      <>
                        <Button type="button" variant="ghost" size="sm" disabled={updatingHabitId === habit.id} onClick={() => updateHabit(habit.id, "completed")}>Complete</Button>
                        <Button type="button" variant="ghost" size="sm" disabled={updatingHabitId === habit.id} onClick={() => updateHabit(habit.id, "cancelled")}>Cancel</Button>
                      </>
                    ) : (
                      <Button type="button" variant="ghost" size="sm" disabled={updatingHabitId === habit.id} onClick={() => updateHabit(habit.id, "active")}>Reactivate</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {habitAssignments.length === 0 ? <p className="text-sm text-gf-muted">No habits assigned yet.</p> : null}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
          <p className="text-sm font-medium text-white">Wellness check-ins</p>
          <form onSubmit={submitCheckIn} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Date" type="date" value={checkInForm.submitted_at} onChange={(e) => setCheckInForm((current) => ({ ...current, submitted_at: e.target.value }))} />
              <Input label="Week label" value={checkInForm.week_label} onChange={(e) => setCheckInForm((current) => ({ ...current, week_label: e.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Energy (1-10)" type="number" min="1" max="10" value={checkInForm.energy_score} onChange={(e) => setCheckInForm((current) => ({ ...current, energy_score: e.target.value }))} />
              <Input label="Stress (1-10)" type="number" min="1" max="10" value={checkInForm.stress_score} onChange={(e) => setCheckInForm((current) => ({ ...current, stress_score: e.target.value }))} />
              <Input label="Sleep (1-10)" type="number" min="1" max="10" value={checkInForm.sleep_score} onChange={(e) => setCheckInForm((current) => ({ ...current, sleep_score: e.target.value }))} />
              <Input label="Confidence (1-10)" type="number" min="1" max="10" value={checkInForm.confidence_score} onChange={(e) => setCheckInForm((current) => ({ ...current, confidence_score: e.target.value }))} />
            </div>
            <TextArea label="Wins" value={checkInForm.wins} onChange={(e) => setCheckInForm((current) => ({ ...current, wins: e.target.value }))} />
            <TextArea label="Blockers" value={checkInForm.blockers} onChange={(e) => setCheckInForm((current) => ({ ...current, blockers: e.target.value }))} />
            <TextArea label="Focus for next week" value={checkInForm.focus_for_next_week} onChange={(e) => setCheckInForm((current) => ({ ...current, focus_for_next_week: e.target.value }))} />
            <TextArea label="Coach follow-up note" value={checkInForm.coach_follow_up_note} onChange={(e) => setCheckInForm((current) => ({ ...current, coach_follow_up_note: e.target.value }))} />
            <Button type="submit" disabled={submittingCheckIn}>{submittingCheckIn ? "Saving..." : "Add check-in"}</Button>
          </form>
          <div className="mt-4 space-y-3">
            {checkIns.map((checkIn) => (
              <div key={checkIn.id} className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-white">{checkIn.week_label || "Weekly check-in"}</p>
                  {checkIn.energy_score ? <Badge variant="default">Energy {checkIn.energy_score}/10</Badge> : null}
                </div>
                {checkIn.wins ? <p className="mt-2 text-sm text-gf-muted">Wins: {checkIn.wins}</p> : null}
              </div>
            ))}
            {checkIns.length === 0 ? <p className="text-sm text-gf-muted">No check-ins yet.</p> : null}
          </div>
        </div>

        <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
          <p className="text-sm font-medium text-white">Session notes</p>
          <form onSubmit={submitSessionNote} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Session date" type="date" value={sessionNoteForm.session_date} onChange={(e) => setSessionNoteForm((current) => ({ ...current, session_date: e.target.value }))} />
              <Input label="Session type" value={sessionNoteForm.session_type} onChange={(e) => setSessionNoteForm((current) => ({ ...current, session_type: e.target.value }))} />
            </div>
            <TextArea label="Summary" value={sessionNoteForm.summary} onChange={(e) => setSessionNoteForm((current) => ({ ...current, summary: e.target.value }))} />
            <TextArea label="Client wins" value={sessionNoteForm.client_wins} onChange={(e) => setSessionNoteForm((current) => ({ ...current, client_wins: e.target.value }))} />
            <TextArea label="Priorities" value={sessionNoteForm.priorities} onChange={(e) => setSessionNoteForm((current) => ({ ...current, priorities: e.target.value }))} />
            <TextArea label="Action steps" value={sessionNoteForm.action_steps} onChange={(e) => setSessionNoteForm((current) => ({ ...current, action_steps: e.target.value }))} />
            <Button type="submit" disabled={submittingSessionNote}>{submittingSessionNote ? "Saving..." : "Add session note"}</Button>
          </form>
          <div className="mt-4 space-y-3">
            {sessionNotes.map((note) => (
              <div key={note.id} className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-white">{note.session_type}</p>
                  <Badge variant="default">{new Date(note.session_date).toLocaleDateString("en-GB")}</Badge>
                </div>
                <p className="mt-2 text-sm text-gf-muted">{note.summary}</p>
              </div>
            ))}
            {sessionNotes.length === 0 ? <p className="text-sm text-gf-muted">No session notes yet.</p> : null}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gf-border bg-gf-surface p-4">
        <p className="text-sm font-medium text-white">Habit completion log</p>
        <div className="mt-4 space-y-3">
          {habitLogs.map((log) => {
            const habit = habitAssignments.find((assignment) => assignment.id === log.assignment_id)
            return (
              <div key={log.id} className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-white">{habit?.habit_name_snapshot ?? "Wellness habit"}</p>
                      <Badge variant={log.completion_status === "completed" ? "success" : log.completion_status === "partial" ? "warning" : "default"}>
                        {log.completion_status}
                      </Badge>
                    </div>
                    {editingHabitLogId === log.id ? (
                      <div className="mt-3 grid gap-3 rounded-lg border border-gf-border/80 bg-gf-black/20 p-3">
                        <Input label="Adherence score (1-10)" type="number" min="1" max="10" value={habitLogForm.adherence_score} onChange={(e) => setHabitLogForm((current) => ({ ...current, adherence_score: e.target.value }))} />
                        <TextArea label="Coach note" value={habitLogForm.coach_note} onChange={(e) => setHabitLogForm((current) => ({ ...current, coach_note: e.target.value }))} />
                        <div className="flex items-center gap-2">
                          <Button type="button" size="sm" onClick={() => saveHabitLog(log.id)} disabled={savingHabitLog}>{savingHabitLog ? "Saving..." : "Save note"}</Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setEditingHabitLogId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : log.coach_note ? (
                      <p className="mt-2 text-sm text-gf-muted"><span className="text-white">Coach note:</span> {log.coach_note}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingHabitLogId(log.id)
                      setHabitLogForm({
                        adherence_score: log.adherence_score?.toString() ?? "",
                        coach_note: log.coach_note ?? "",
                      })
                    }}
                  >
                    {log.coach_note ? "Edit note" : "Add note"}
                  </Button>
                </div>
              </div>
            )
          })}
          {habitLogs.length === 0 ? <p className="text-sm text-gf-muted">No habit logs yet.</p> : null}
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
    </section>
  )
}
