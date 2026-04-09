"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { Input, Select, TextArea } from "@/components/ui/input"
import type { PTProgram, PTWorkout } from "@/types"

type ProgramSessionRow = {
  week_number: string
  day_number: string
  sort_order: number
  session_name: string
  workout_id: string | null
  focus: string
  notes: string
}

type ProgramRecord = PTProgram & {
  sessions: Array<ProgramSessionRow & { id: string; workout_name?: string | null }>
}

const EMPTY_SESSION: ProgramSessionRow = {
  week_number: "1",
  day_number: "1",
  sort_order: 1,
  session_name: "",
  workout_id: null,
  focus: "",
  notes: "",
}

const EMPTY_PROGRAM = {
  name: "",
  version_label: "v1",
  description: "",
  goal: "",
  duration_weeks: "4",
  difficulty: "",
  sessions: [{ ...EMPTY_SESSION }],
}

export function ProgramsManager({
  initialPrograms,
  workouts,
}: {
  initialPrograms: ProgramRecord[]
  workouts: PTWorkout[]
}) {
  const [programs, setPrograms] = useState(initialPrograms)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_PROGRAM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null)

  async function refreshPrograms() {
    const refreshed = await fetch("/api/admin/programs").then((res) => res.json())
    setPrograms(refreshed.programs ?? [])
  }

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_PROGRAM)
    setError("")
  }

  function updateSession(index: number, field: keyof ProgramSessionRow, value: string) {
    setForm((current) => ({
      ...current,
      sessions: current.sessions.map((session, sessionIndex) =>
        sessionIndex === index
          ? {
              ...session,
              [field]: value,
              sort_order: sessionIndex + 1,
            }
          : session
      ),
    }))
  }

  function addSession() {
    setForm((current) => ({
      ...current,
      sessions: [...current.sessions, { ...EMPTY_SESSION, sort_order: current.sessions.length + 1 }],
    }))
  }

  function removeSession(index: number) {
    setForm((current) => ({
      ...current,
      sessions: current.sessions
        .filter((_, sessionIndex) => sessionIndex !== index)
        .map((session, sessionIndex) => ({ ...session, sort_order: sessionIndex + 1 })),
    }))
  }

  function startEdit(program: ProgramRecord) {
    setEditingId(program.id)
    setForm({
      name: program.name,
      version_label: program.version_label ?? "v1",
      description: program.description ?? "",
      goal: program.goal ?? "",
      duration_weeks: program.duration_weeks.toString(),
      difficulty: program.difficulty ?? "",
      sessions: program.sessions.length
        ? program.sessions.map((session, index) => ({
            week_number: session.week_number,
            day_number: session.day_number,
            sort_order: index + 1,
            session_name: session.session_name ?? "",
            workout_id: session.workout_id,
            focus: session.focus ?? "",
            notes: session.notes ?? "",
          }))
        : [{ ...EMPTY_SESSION }],
    })
    setError("")
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError("")

    const payload = {
      name: form.name,
      version_label: form.version_label,
      description: form.description,
      goal: form.goal,
      duration_weeks: form.duration_weeks,
      difficulty: form.difficulty,
      sessions: form.sessions
        .filter((session) => session.session_name.trim().length > 0)
        .map((session, index) => ({
          ...session,
          sort_order: index + 1,
        })),
    }

    const url = editingId ? `/api/admin/programs/${editingId}` : "/api/admin/programs"
    const method = editingId ? "PATCH" : "POST"

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to save program")
        return
      }

      await refreshPrograms()
      resetForm()
    } catch {
      setError("Failed to save program")
    } finally {
      setSaving(false)
    }
  }

  async function duplicateProgram(program: ProgramRecord) {
    setSaving(true)
    setError("")

    try {
      const response = await fetch("/api/admin/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${program.name} Copy`,
          version_label: program.version_label ?? "v1",
          parent_program_id: program.parent_program_id,
          description: program.description ?? "",
          goal: program.goal ?? "",
          duration_weeks: program.duration_weeks,
          difficulty: program.difficulty ?? "",
          sessions: program.sessions.map((session, index) => ({
            week_number: Number(session.week_number),
            day_number: Number(session.day_number),
            sort_order: index + 1,
            session_name: session.session_name,
            workout_id: session.workout_id,
            focus: session.focus ?? "",
            notes: session.notes ?? "",
          })),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to duplicate program")
        return
      }

      await refreshPrograms()
    } catch {
      setError("Failed to duplicate program")
    } finally {
      setSaving(false)
    }
  }

  function nextVersionLabel(versionLabel: string | null | undefined) {
    const normalized = (versionLabel ?? "v1").trim().toLowerCase()
    const match = normalized.match(/^v(\d+)$/)
    if (!match) return "v2"
    return `v${Number(match[1]) + 1}`
  }

  async function duplicateAsNewVersion(program: ProgramRecord) {
    setSaving(true)
    setError("")

    try {
      const response = await fetch("/api/admin/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: program.name,
          version_label: nextVersionLabel(program.version_label),
          parent_program_id: program.parent_program_id ?? program.id,
          description: program.description ?? "",
          goal: program.goal ?? "",
          duration_weeks: program.duration_weeks,
          difficulty: program.difficulty ?? "",
          sessions: program.sessions.map((session, index) => ({
            week_number: Number(session.week_number),
            day_number: Number(session.day_number),
            sort_order: index + 1,
            session_name: session.session_name,
            workout_id: session.workout_id,
            focus: session.focus ?? "",
            notes: session.notes ?? "",
          })),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to create new version")
        return
      }

      await refreshPrograms()
    } catch {
      setError("Failed to create new version")
    } finally {
      setSaving(false)
    }
  }

  async function archiveProgram(program: ProgramRecord) {
    if (!confirm(`Archive "${program.name}"?`)) return

    setSaving(true)
    setError("")

    try {
      const response = await fetch(`/api/admin/programs/${program.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: program.name,
          description: program.description ?? "",
          goal: program.goal ?? "",
          duration_weeks: program.duration_weeks,
          difficulty: program.difficulty ?? "",
          is_archived: true,
          sessions: program.sessions.map((session, index) => ({
            week_number: Number(session.week_number),
            day_number: Number(session.day_number),
            sort_order: index + 1,
            session_name: session.session_name,
            workout_id: session.workout_id,
            focus: session.focus ?? "",
            notes: session.notes ?? "",
          })),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to archive program")
        return
      }

      if (editingId === program.id) {
        resetForm()
      }
      await refreshPrograms()
    } catch {
      setError("Failed to archive program")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Programs</h1>
        <p className="mt-2 text-gf-muted">
          Group reusable workouts into coach-owned training plans that can be assigned to clients and materialized into session rows.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <CardTitle>Program Library</CardTitle>
              <p className="mt-1 text-sm text-gf-muted">
                Reusable templates with week/day/session structure.
              </p>
            </div>
            <Badge variant={programs.length > 0 ? "success" : "default"}>
              {programs.length} program{programs.length === 1 ? "" : "s"}
            </Badge>
          </div>

          {programs.length === 0 ? (
            <p className="text-sm text-gf-muted">No programs yet. Build the first reusable plan on the right.</p>
          ) : (
            <div className="space-y-4">
              {programs.map((program) => (
                <div key={program.id} className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">{program.name}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge>{program.version_label ?? "v1"}</Badge>
                        {program.parent_program_id ? <Badge variant="default">Versioned</Badge> : null}
                      </div>
                      {program.goal ? <p className="mt-2 text-sm text-gf-muted">{program.goal}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => duplicateProgram(program)} disabled={saving}>
                        Duplicate
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => duplicateAsNewVersion(program)} disabled={saving}>
                        New version
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(program)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedProgramId((current) => (current === program.id ? null : program.id))
                        }
                      >
                        {expandedProgramId === program.id ? "Hide plan" : "View plan"}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => archiveProgram(program)} disabled={saving}>
                        Archive
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>{program.duration_weeks} weeks</Badge>
                    <Badge variant="default">{program.sessions.length} sessions</Badge>
                    {program.difficulty ? <Badge>{program.difficulty}</Badge> : null}
                  </div>
                  {program.description ? <p className="mt-3 text-sm text-gf-muted">{program.description}</p> : null}
                  <div className="mt-4 space-y-2">
                    {program.sessions.map((session) => (
                      <div key={session.id} className="rounded-lg border border-gf-border px-3 py-2">
                        <p className="text-sm font-medium text-white">
                          Week {session.week_number} • Day {session.day_number} • {session.session_name}
                        </p>
                        <p className="mt-1 text-xs text-gf-muted">
                          {session.workout_name || "No workout linked"}
                          {session.focus ? ` • ${session.focus}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                  {expandedProgramId === program.id ? (
                    <div className="mt-4 rounded-xl border border-gf-border bg-gf-surface p-4">
                      <p className="text-xs uppercase tracking-wide text-gf-muted">Program plan</p>
                      <div className="mt-3 space-y-4">
                        {Array.from(new Set(program.sessions.map((session) => Number(session.week_number))))
                          .sort((a, b) => a - b)
                          .map((weekNumber) => {
                            const weekSessions = program.sessions.filter(
                              (session) => Number(session.week_number) === weekNumber
                            )

                            return (
                              <div key={`${program.id}-week-${weekNumber}`}>
                                <p className="text-sm font-medium text-white">Week {weekNumber}</p>
                                <div className="mt-2 space-y-2">
                                  {weekSessions.map((session) => (
                                    <div
                                      key={`${program.id}-${session.id}-expanded`}
                                      className="rounded-lg border border-gf-border/80 px-3 py-2"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <p className="text-sm font-medium text-white">
                                            Day {session.day_number} • {session.session_name}
                                          </p>
                                          <p className="mt-1 text-xs text-gf-muted">
                                            {session.workout_name || "No workout linked"}
                                            {session.focus ? ` • ${session.focus}` : ""}
                                          </p>
                                        </div>
                                      </div>
                                      {session.notes ? (
                                        <p className="mt-2 text-xs text-gf-muted">{session.notes}</p>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <CardTitle>{editingId ? "Edit Program" : "Build Program"}</CardTitle>
            {editingId ? (
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                Cancel
              </Button>
            ) : null}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Input
              label="Program name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="e.g. 8 Week PT Starter"
              required
            />
            <Input
              label="Version label"
              value={form.version_label}
              onChange={(event) => setForm((current) => ({ ...current, version_label: event.target.value }))}
              placeholder="v1"
              required
            />
            <TextArea
              label="Description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Short overview of the plan."
            />
            <Input
              label="Goal"
              value={form.goal}
              onChange={(event) => setForm((current) => ({ ...current, goal: event.target.value }))}
              placeholder="e.g. general strength and consistency"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Duration (weeks)"
                type="number"
                value={form.duration_weeks}
                onChange={(event) => setForm((current) => ({ ...current, duration_weeks: event.target.value }))}
              />
              <Input
                label="Difficulty"
                value={form.difficulty}
                onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value }))}
                placeholder="Beginner / Intermediate / Advanced"
              />
            </div>

            <div className="space-y-3 border-t border-gf-border pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">Program sessions</p>
                <Button type="button" variant="secondary" size="sm" onClick={addSession}>
                  Add session
                </Button>
              </div>
              {form.sessions.map((session, index) => (
                <div key={`${editingId ?? "new"}-${index}`} className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-white">Session {index + 1}</p>
                    {form.sessions.length > 1 ? (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeSession(index)}>
                        Remove
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Input
                        label="Week"
                        type="number"
                        value={session.week_number}
                        onChange={(event) => updateSession(index, "week_number", event.target.value)}
                      />
                      <Input
                        label="Day"
                        type="number"
                        value={session.day_number}
                        onChange={(event) => updateSession(index, "day_number", event.target.value)}
                      />
                      <Input
                        label="Session name"
                        value={session.session_name}
                        onChange={(event) => updateSession(index, "session_name", event.target.value)}
                        placeholder="e.g. Lower A"
                      />
                    </div>
                    <Select
                      label="Workout"
                      value={session.workout_id ?? ""}
                      onChange={(event) => updateSession(index, "workout_id", event.target.value)}
                      options={[
                        { value: "", label: "Select workout..." },
                        ...workouts.map((workout) => ({
                          value: workout.id,
                          label: workout.name,
                        })),
                      ]}
                    />
                    <Input
                      label="Focus"
                      value={session.focus}
                      onChange={(event) => updateSession(index, "focus", event.target.value)}
                      placeholder="e.g. hinge + posterior chain"
                    />
                    <TextArea
                      label="Notes"
                      value={session.notes}
                      onChange={(event) => updateSession(index, "notes", event.target.value)}
                      placeholder="Optional coach note for this session."
                    />
                  </div>
                </div>
              ))}
            </div>

            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save program" : "Create program"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
