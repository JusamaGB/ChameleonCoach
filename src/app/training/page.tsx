"use client"

import { useEffect, useState } from "react"
import { ClientNav } from "@/components/layout/client-nav"
import { PoweredBy } from "@/components/branding/powered-by"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DEFAULT_COACH_BRANDING, type CoachBranding } from "@/lib/branding"

type TrainingExercise = {
  id: string
  client_session_id: string
  exercise_id: string | null
  exercise_name_snapshot: string
  sets: number | null
  reps: string | null
  duration_seconds: number | null
  distance_value: number | null
  distance_unit: string | null
  rest_seconds: number | null
  tempo: string | null
  load_guidance: string | null
  notes: string | null
}

type TrainingSession = {
  id: string
  session_name: string
  scheduled_date: string | null
  week_number: number
  day_number: number
  status: "upcoming" | "available" | "completed" | "skipped"
  exercises: TrainingExercise[]
  log: {
    completion_status: "completed" | "partial" | "skipped"
    session_rpe: number | null
    energy_rating: number | null
    client_feedback: string | null
  } | null
}

type TrainingPayload = {
  assignment: {
    program_name_snapshot: string
    adherence_percent: number
    completed_sessions_count: number
    total_sessions_count: number
  } | null
  sessions: TrainingSession[]
}

type PortalPayload = CoachBranding & {
  active_modules: string[]
}

function statusBadge(status: TrainingSession["status"]) {
  switch (status) {
    case "completed":
      return <Badge variant="success">Completed</Badge>
    case "skipped":
      return <Badge variant="default">Skipped</Badge>
    case "available":
      return <Badge variant="warning">Ready</Badge>
    case "upcoming":
      return <Badge variant="default">Upcoming</Badge>
  }
}

export default function TrainingPage() {
  const [portal, setPortal] = useState<PortalPayload | null>(null)
  const [training, setTraining] = useState<TrainingPayload>({ assignment: null, sessions: [] })
  const [loading, setLoading] = useState(true)
  const [loggingSessionId, setLoggingSessionId] = useState<string | null>(null)
  const [sessionRpe, setSessionRpe] = useState("")
  const [energyRating, setEnergyRating] = useState("")
  const [clientFeedback, setClientFeedback] = useState("")
  const [exerciseInputs, setExerciseInputs] = useState<Record<string, { completed_reps: string; weight_value: string; rpe: string; notes: string }>>({})
  const [error, setError] = useState("")

  async function load() {
    const [portalData, trainingData] = await Promise.all([
      fetch("/api/client/portal").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/client/training").then((res) => res.json()),
    ])
    setPortal(portalData ?? { ...DEFAULT_COACH_BRANDING, active_modules: ["shared_core"] })
    setTraining({
      assignment: trainingData.assignment ?? null,
      sessions: trainingData.sessions ?? [],
    })
    setLoading(false)
  }

  useEffect(() => {
    load().catch(() => {
      setPortal({ ...DEFAULT_COACH_BRANDING, active_modules: ["shared_core"] })
      setLoading(false)
    })
  }, [])

  async function submitLog(session: TrainingSession) {
    setError("")
    const exercisePayload = session.exercises.flatMap((exercise) => {
      const input = exerciseInputs[exercise.id] ?? {
        completed_reps: "",
        weight_value: "",
        rpe: "",
        notes: "",
      }
      const setCount = exercise.sets && exercise.sets > 0 ? exercise.sets : 1

      return Array.from({ length: setCount }, (_, index) => ({
        client_session_exercise_id: exercise.id,
        exercise_id: exercise.exercise_id,
        exercise_name_snapshot: exercise.exercise_name_snapshot,
        set_number: index + 1,
        target_reps: exercise.reps ? Number(exercise.reps) || null : null,
        completed_reps: input.completed_reps ? Number(input.completed_reps) : null,
        weight_value: input.weight_value ? Number(input.weight_value) : null,
        weight_unit: "kg",
        rpe: input.rpe ? Number(input.rpe) : null,
        notes: input.notes || null,
      }))
    })

    const response = await fetch("/api/client/training", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_session_id: session.id,
        completion_status: "completed",
        session_rpe: sessionRpe,
        energy_rating: energyRating,
        client_feedback: clientFeedback,
        exercises: exercisePayload,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      setError(data.error || "Failed to save workout log")
      return
    }

    setLoggingSessionId(null)
    setSessionRpe("")
    setEnergyRating("")
    setClientFeedback("")
    setExerciseInputs({})
    await load()
  }

  const branding = portal ?? { ...DEFAULT_COACH_BRANDING, active_modules: ["shared_core"] }

  return (
    <div className="flex min-h-screen">
      <ClientNav branding={branding} activeModules={branding.active_modules} />
      <main className="flex-1 p-6 md:p-10 pb-24 md:pb-10">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold" style={{ color: branding.brand_primary_color }}>
            Training
          </h1>
          <p className="mt-2 text-gf-muted">
            View your assigned PT sessions and log completed workouts.
          </p>

          {loading ? (
            <Card className="mt-6">
              <p className="text-sm text-gf-muted">Loading training plan...</p>
            </Card>
          ) : training.assignment ? (
            <div className="mt-6 space-y-6">
              <Card>
                <p className="text-xs text-gf-muted">Active program</p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  {training.assignment.program_name_snapshot}
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="success">
                    {training.assignment.completed_sessions_count}/{training.assignment.total_sessions_count} completed
                  </Badge>
                  <Badge variant="default">
                    {training.assignment.adherence_percent}% adherence
                  </Badge>
                </div>
              </Card>

              <div className="space-y-4">
                {training.sessions.map((session) => (
                  <Card key={session.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-white">{session.session_name}</p>
                        <p className="mt-1 text-sm text-gf-muted">
                          Week {session.week_number} • Day {session.day_number}
                          {session.scheduled_date ? ` • ${new Date(session.scheduled_date).toLocaleDateString("en-GB")}` : ""}
                        </p>
                      </div>
                      {statusBadge(session.status)}
                    </div>

                    <div className="mt-4 space-y-2">
                      {session.exercises.map((exercise) => (
                        <div key={exercise.id} className="rounded-lg border border-gf-border px-3 py-3">
                          <p className="text-sm font-medium text-white">{exercise.exercise_name_snapshot}</p>
                          <p className="mt-1 text-xs text-gf-muted">
                            {exercise.duration_seconds
                              ? `${exercise.sets ?? "?"} sets • ${exercise.duration_seconds}s`
                              : exercise.distance_value
                                ? `${exercise.sets ?? "?"} sets • ${exercise.distance_value} ${exercise.distance_unit ?? ""}`
                                : `${exercise.sets ?? "?"} sets • ${exercise.reps ?? "?"} reps`}
                            {exercise.rest_seconds ? ` • Rest ${exercise.rest_seconds}s` : ""}
                            {exercise.tempo ? ` • Tempo ${exercise.tempo}` : ""}
                          </p>
                          {loggingSessionId === session.id ? (
                            <div className="mt-3 grid gap-3 sm:grid-cols-4">
                              <input
                                type="number"
                                value={exerciseInputs[exercise.id]?.completed_reps ?? ""}
                                onChange={(event) =>
                                  setExerciseInputs((current) => ({
                                    ...current,
                                    [exercise.id]: {
                                      completed_reps: event.target.value,
                                      weight_value: current[exercise.id]?.weight_value ?? "",
                                      rpe: current[exercise.id]?.rpe ?? "",
                                      notes: current[exercise.id]?.notes ?? "",
                                    },
                                  }))
                                }
                                placeholder="Reps"
                                className="rounded-lg border border-gf-border bg-gf-surface px-3 py-2 text-sm text-white"
                              />
                              <input
                                type="number"
                                value={exerciseInputs[exercise.id]?.weight_value ?? ""}
                                onChange={(event) =>
                                  setExerciseInputs((current) => ({
                                    ...current,
                                    [exercise.id]: {
                                      completed_reps: current[exercise.id]?.completed_reps ?? "",
                                      weight_value: event.target.value,
                                      rpe: current[exercise.id]?.rpe ?? "",
                                      notes: current[exercise.id]?.notes ?? "",
                                    },
                                  }))
                                }
                                placeholder="Weight (kg)"
                                className="rounded-lg border border-gf-border bg-gf-surface px-3 py-2 text-sm text-white"
                              />
                              <input
                                type="number"
                                step="0.5"
                                value={exerciseInputs[exercise.id]?.rpe ?? ""}
                                onChange={(event) =>
                                  setExerciseInputs((current) => ({
                                    ...current,
                                    [exercise.id]: {
                                      completed_reps: current[exercise.id]?.completed_reps ?? "",
                                      weight_value: current[exercise.id]?.weight_value ?? "",
                                      rpe: event.target.value,
                                      notes: current[exercise.id]?.notes ?? "",
                                    },
                                  }))
                                }
                                placeholder="RPE"
                                className="rounded-lg border border-gf-border bg-gf-surface px-3 py-2 text-sm text-white"
                              />
                              <input
                                type="text"
                                value={exerciseInputs[exercise.id]?.notes ?? ""}
                                onChange={(event) =>
                                  setExerciseInputs((current) => ({
                                    ...current,
                                    [exercise.id]: {
                                      completed_reps: current[exercise.id]?.completed_reps ?? "",
                                      weight_value: current[exercise.id]?.weight_value ?? "",
                                      rpe: current[exercise.id]?.rpe ?? "",
                                      notes: event.target.value,
                                    },
                                  }))
                                }
                                placeholder="Notes"
                                className="rounded-lg border border-gf-border bg-gf-surface px-3 py-2 text-sm text-white"
                              />
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    {session.log ? (
                      <div className="mt-4 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-3 text-sm text-green-100">
                        Logged: {session.log.completion_status}
                        {session.log.session_rpe ? ` • Session RPE ${session.log.session_rpe}` : ""}
                        {session.log.energy_rating ? ` • Energy ${session.log.energy_rating}/10` : ""}
                      </div>
                    ) : null}

                    {loggingSessionId === session.id ? (
                      <div className="mt-4 space-y-3 border-t border-gf-border pt-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <input
                            type="number"
                            step="0.5"
                            value={sessionRpe}
                            onChange={(event) => setSessionRpe(event.target.value)}
                            placeholder="Session RPE"
                            className="rounded-lg border border-gf-border bg-gf-surface px-3 py-2 text-sm text-white"
                          />
                          <input
                            type="number"
                            value={energyRating}
                            onChange={(event) => setEnergyRating(event.target.value)}
                            placeholder="Energy (1-10)"
                            className="rounded-lg border border-gf-border bg-gf-surface px-3 py-2 text-sm text-white"
                          />
                          <input
                            type="text"
                            value={clientFeedback}
                            onChange={(event) => setClientFeedback(event.target.value)}
                            placeholder="Session feedback"
                            className="rounded-lg border border-gf-border bg-gf-surface px-3 py-2 text-sm text-white"
                          />
                        </div>
                        {error ? <p className="text-sm text-red-400">{error}</p> : null}
                        <div className="flex gap-2">
                          <Button type="button" onClick={() => submitLog(session)}>
                            Save workout log
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => setLoggingSessionId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : session.status !== "completed" ? (
                      <div className="mt-4">
                        <Button type="button" onClick={() => setLoggingSessionId(session.id)}>
                          Log workout
                        </Button>
                      </div>
                    ) : null}
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card className="mt-6">
              <p className="text-sm text-gf-muted">
                No active PT training plan is assigned yet.
              </p>
            </Card>
          )}

          {branding.show_powered_by && <PoweredBy className="mt-8" />}
        </div>
      </main>
    </div>
  )
}
