"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { Input, Select, TextArea } from "@/components/ui/input"
import type { Exercise, PTWorkout } from "@/types"

type WorkoutExerciseRow = {
  exercise_id: string | null
  sort_order: number
  block_label: string
  prescription_type: "reps" | "time" | "distance"
  sets: string
  reps: string
  duration_seconds: string
  distance_value: string
  distance_unit: string
  rest_seconds: string
  tempo: string
  load_guidance: string
  rpe_target: string
  notes: string
}

type WorkoutRecord = PTWorkout & {
  exercises: Array<WorkoutExerciseRow & { id: string; exercise?: Exercise | null }>
}

const EMPTY_EXERCISE_ROW: WorkoutExerciseRow = {
  exercise_id: null,
  sort_order: 0,
  block_label: "",
  prescription_type: "reps",
  sets: "",
  reps: "",
  duration_seconds: "",
  distance_value: "",
  distance_unit: "",
  rest_seconds: "",
  tempo: "",
  load_guidance: "",
  rpe_target: "",
  notes: "",
}

const EMPTY_WORKOUT = {
  name: "",
  description: "",
  goal: "",
  estimated_duration_minutes: "",
  difficulty: "",
  exercises: [{ ...EMPTY_EXERCISE_ROW, sort_order: 1 }],
}

function toExerciseRow(row: WorkoutRecord["exercises"][number], index: number): WorkoutExerciseRow {
  return {
    exercise_id: row.exercise_id,
    sort_order: index + 1,
    block_label: row.block_label ?? "",
    prescription_type: row.prescription_type,
    sets: row.sets?.toString() ?? "",
    reps: row.reps ?? "",
    duration_seconds: row.duration_seconds?.toString() ?? "",
    distance_value: row.distance_value?.toString() ?? "",
    distance_unit: row.distance_unit ?? "",
    rest_seconds: row.rest_seconds?.toString() ?? "",
    tempo: row.tempo ?? "",
    load_guidance: row.load_guidance ?? "",
    rpe_target: row.rpe_target?.toString() ?? "",
    notes: row.notes ?? "",
  }
}

export function WorkoutBuilder({
  initialExercises,
  initialWorkouts,
}: {
  initialExercises: Exercise[]
  initialWorkouts: WorkoutRecord[]
}) {
  const [workouts, setWorkouts] = useState(initialWorkouts)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_WORKOUT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function refreshWorkouts() {
    const refreshed = await fetch("/api/admin/workouts").then((res) => res.json())
    setWorkouts(refreshed.workouts ?? [])
  }

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_WORKOUT)
    setError("")
  }

  function updateExerciseRow(index: number, field: keyof WorkoutExerciseRow, value: string) {
    setForm((current) => ({
      ...current,
      exercises: current.exercises.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]: value,
              sort_order: rowIndex + 1,
            }
          : row
      ),
    }))
  }

  function addExerciseRow() {
    setForm((current) => ({
      ...current,
      exercises: [
        ...current.exercises,
        { ...EMPTY_EXERCISE_ROW, sort_order: current.exercises.length + 1 },
      ],
    }))
  }

  function removeExerciseRow(index: number) {
    setForm((current) => ({
      ...current,
      exercises: current.exercises
        .filter((_, rowIndex) => rowIndex !== index)
        .map((row, rowIndex) => ({ ...row, sort_order: rowIndex + 1 })),
    }))
  }

  function startEdit(workout: WorkoutRecord) {
    setEditingId(workout.id)
    setForm({
      name: workout.name,
      description: workout.description ?? "",
      goal: workout.goal ?? "",
      estimated_duration_minutes: workout.estimated_duration_minutes?.toString() ?? "",
      difficulty: workout.difficulty ?? "",
      exercises: workout.exercises.length
        ? workout.exercises.map(toExerciseRow)
        : [{ ...EMPTY_EXERCISE_ROW, sort_order: 1 }],
    })
    setError("")
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError("")

    const payload = {
      name: form.name,
      description: form.description,
      goal: form.goal,
      estimated_duration_minutes: form.estimated_duration_minutes,
      difficulty: form.difficulty,
      exercises: form.exercises
        .filter((row) => row.exercise_id)
        .map((row, index) => ({
          ...row,
          exercise_id: row.exercise_id,
          sort_order: index + 1,
        })),
    }

    const url = editingId ? `/api/admin/workouts/${editingId}` : "/api/admin/workouts"
    const method = editingId ? "PATCH" : "POST"

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to save workout")
        return
      }

      await refreshWorkouts()
      resetForm()
    } catch {
      setError("Failed to save workout")
    } finally {
      setSaving(false)
    }
  }

  async function duplicateWorkout(workout: WorkoutRecord) {
    setSaving(true)
    setError("")

    try {
      const response = await fetch("/api/admin/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${workout.name} Copy`,
          description: workout.description ?? "",
          goal: workout.goal ?? "",
          estimated_duration_minutes: workout.estimated_duration_minutes ?? "",
          difficulty: workout.difficulty ?? "",
          exercises: workout.exercises.map((exercise, index) => ({
            exercise_id: exercise.exercise_id,
            sort_order: index + 1,
            block_label: exercise.block_label ?? "",
            prescription_type: exercise.prescription_type,
            sets: exercise.sets ?? "",
            reps: exercise.reps ?? "",
            duration_seconds: exercise.duration_seconds ?? "",
            distance_value: exercise.distance_value ?? "",
            distance_unit: exercise.distance_unit ?? "",
            rest_seconds: exercise.rest_seconds ?? "",
            tempo: exercise.tempo ?? "",
            load_guidance: exercise.load_guidance ?? "",
            rpe_target: exercise.rpe_target ?? "",
            notes: exercise.notes ?? "",
          })),
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to duplicate workout")
        return
      }

      await refreshWorkouts()
    } catch {
      setError("Failed to duplicate workout")
    } finally {
      setSaving(false)
    }
  }

  async function archiveWorkout(workout: WorkoutRecord) {
    if (!confirm(`Archive "${workout.name}"?`)) return

    setSaving(true)
    setError("")

    try {
      const response = await fetch(`/api/admin/workouts/${workout.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workout.name,
          description: workout.description ?? "",
          goal: workout.goal ?? "",
          estimated_duration_minutes: workout.estimated_duration_minutes ?? "",
          difficulty: workout.difficulty ?? "",
          is_archived: true,
          exercises: workout.exercises.map((exercise, index) => ({
            exercise_id: exercise.exercise_id,
            sort_order: index + 1,
            block_label: exercise.block_label ?? "",
            prescription_type: exercise.prescription_type,
            sets: exercise.sets ?? "",
            reps: exercise.reps ?? "",
            duration_seconds: exercise.duration_seconds ?? "",
            distance_value: exercise.distance_value ?? "",
            distance_unit: exercise.distance_unit ?? "",
            rest_seconds: exercise.rest_seconds ?? "",
            tempo: exercise.tempo ?? "",
            load_guidance: exercise.load_guidance ?? "",
            rpe_target: exercise.rpe_target ?? "",
            notes: exercise.notes ?? "",
          })),
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to archive workout")
        return
      }

      if (editingId === workout.id) {
        resetForm()
      }
      await refreshWorkouts()
    } catch {
      setError("Failed to archive workout")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Workouts</h1>
        <p className="mt-2 text-gf-muted">
          Create reusable PT sessions from your exercise library. Keep the builder stable and structured first; richer planning UX can layer on later.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.95fr)]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <CardTitle>Workout Library</CardTitle>
              <p className="mt-1 text-sm text-gf-muted">
                Reusable coach-scoped workouts ready to be grouped into programs.
              </p>
            </div>
            <Badge variant={workouts.length > 0 ? "success" : "default"}>
              {workouts.length} workout{workouts.length === 1 ? "" : "s"}
            </Badge>
          </div>

          {workouts.length === 0 ? (
            <p className="text-sm text-gf-muted">No workouts yet. Build the first reusable session on the right.</p>
          ) : (
            <div className="space-y-4">
              {workouts.map((workout) => (
                <div key={workout.id} className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">{workout.name}</p>
                      {workout.goal ? <p className="mt-1 text-sm text-gf-muted">{workout.goal}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => duplicateWorkout(workout)} disabled={saving}>
                        Duplicate
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(workout)}>
                        Edit
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => archiveWorkout(workout)} disabled={saving}>
                        Archive
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {workout.estimated_duration_minutes ? (
                      <Badge>{workout.estimated_duration_minutes} min</Badge>
                    ) : null}
                    {workout.difficulty ? <Badge>{workout.difficulty}</Badge> : null}
                    <Badge variant="default">{workout.exercises.length} exercise blocks</Badge>
                  </div>
                  {workout.description ? (
                    <p className="mt-3 text-sm text-gf-muted">{workout.description}</p>
                  ) : null}
                  <div className="mt-4 space-y-2">
                    {workout.exercises.map((exercise, index) => (
                      <div key={exercise.id} className="rounded-lg border border-gf-border px-3 py-2">
                        <p className="text-sm font-medium text-white">
                          {index + 1}. {exercise.exercise?.name ?? "Exercise"}
                        </p>
                        <p className="mt-1 text-xs text-gf-muted">
                          {exercise.prescription_type === "time"
                            ? `${exercise.sets ?? "?"} sets • ${exercise.duration_seconds ?? "?"} sec`
                            : exercise.prescription_type === "distance"
                              ? `${exercise.sets ?? "?"} sets • ${exercise.distance_value ?? "?"} ${exercise.distance_unit ?? ""}`
                              : `${exercise.sets ?? "?"} sets • ${exercise.reps ?? "?"} reps`}
                          {exercise.rest_seconds ? ` • Rest ${exercise.rest_seconds}s` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <CardTitle>{editingId ? "Edit Workout" : "Build Workout"}</CardTitle>
            {editingId ? (
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                Cancel
              </Button>
            ) : null}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Input
              label="Workout name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="e.g. Lower Body A"
              required
            />
            <TextArea
              label="Description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Short coach-facing description."
            />
            <Input
              label="Goal"
              value={form.goal}
              onChange={(event) => setForm((current) => ({ ...current, goal: event.target.value }))}
              placeholder="e.g. strength, hypertrophy, conditioning"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Duration (minutes)"
                type="number"
                value={form.estimated_duration_minutes}
                onChange={(event) => setForm((current) => ({ ...current, estimated_duration_minutes: event.target.value }))}
                placeholder="60"
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
                <p className="text-sm font-medium text-white">Exercise blocks</p>
                <Button type="button" variant="secondary" size="sm" onClick={addExerciseRow}>
                  Add exercise
                </Button>
              </div>

              {form.exercises.map((row, index) => (
                <div key={`${editingId ?? "new"}-${index}`} className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-white">Block {index + 1}</p>
                    {form.exercises.length > 1 ? (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeExerciseRow(index)}>
                        Remove
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid gap-4">
                    <Select
                      label="Exercise"
                      value={row.exercise_id ?? ""}
                      onChange={(event) => updateExerciseRow(index, "exercise_id", event.target.value)}
                      options={[
                        { value: "", label: "Select exercise..." },
                        ...initialExercises.map((exercise) => ({
                          value: exercise.id,
                          label: exercise.name,
                        })),
                      ]}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        label="Block label"
                        value={row.block_label}
                        onChange={(event) => updateExerciseRow(index, "block_label", event.target.value)}
                        placeholder="Optional grouping label"
                      />
                      <Select
                        label="Prescription type"
                        value={row.prescription_type}
                        onChange={(event) => updateExerciseRow(index, "prescription_type", event.target.value)}
                        options={[
                          { value: "reps", label: "Reps" },
                          { value: "time", label: "Time" },
                          { value: "distance", label: "Distance" },
                        ]}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Input
                        label="Sets"
                        type="number"
                        value={row.sets}
                        onChange={(event) => updateExerciseRow(index, "sets", event.target.value)}
                      />
                      <Input
                        label={row.prescription_type === "time" ? "Duration (sec)" : row.prescription_type === "distance" ? "Distance" : "Reps"}
                        value={
                          row.prescription_type === "time"
                            ? row.duration_seconds
                            : row.prescription_type === "distance"
                              ? row.distance_value
                              : row.reps
                        }
                        onChange={(event) =>
                          updateExerciseRow(
                            index,
                            row.prescription_type === "time"
                              ? "duration_seconds"
                              : row.prescription_type === "distance"
                                ? "distance_value"
                                : "reps",
                            event.target.value
                          )
                        }
                      />
                      <Input
                        label="Rest (sec)"
                        type="number"
                        value={row.rest_seconds}
                        onChange={(event) => updateExerciseRow(index, "rest_seconds", event.target.value)}
                      />
                    </div>
                    {row.prescription_type === "distance" ? (
                      <Input
                        label="Distance unit"
                        value={row.distance_unit}
                        onChange={(event) => updateExerciseRow(index, "distance_unit", event.target.value)}
                        placeholder="m, km, miles"
                      />
                    ) : null}
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Input
                        label="Tempo"
                        value={row.tempo}
                        onChange={(event) => updateExerciseRow(index, "tempo", event.target.value)}
                        placeholder="e.g. 3-1-1"
                      />
                      <Input
                        label="Load guidance"
                        value={row.load_guidance}
                        onChange={(event) => updateExerciseRow(index, "load_guidance", event.target.value)}
                        placeholder="e.g. moderate-heavy"
                      />
                      <Input
                        label="RPE target"
                        type="number"
                        step="0.5"
                        value={row.rpe_target}
                        onChange={(event) => updateExerciseRow(index, "rpe_target", event.target.value)}
                        placeholder="8"
                      />
                    </div>
                    <TextArea
                      label="Notes"
                      value={row.notes}
                      onChange={(event) => updateExerciseRow(index, "notes", event.target.value)}
                      placeholder="Coaching cue or session note"
                    />
                  </div>
                </div>
              ))}
            </div>

            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save workout" : "Create workout"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
