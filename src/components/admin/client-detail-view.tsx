"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input, Select, TextArea } from "@/components/ui/input"
import { canAccessFeature } from "@/lib/modules"
import { MealPlanView } from "@/components/meal-plan/meal-plan-view"
import { ProgressChart, ProgressHistory } from "@/components/progress/progress-chart"
import { ClientProfileEditor } from "./client-profile-editor"
import { MealPlanEditor } from "./meal-plan-editor"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Pencil, Trash2 } from "lucide-react"
import type {
  Client,
  ClientPTLog,
  ClientPTProgramAssignment,
  ClientPTSession,
  MealPlanDay,
  ProfileData,
  ProgressEntry,
} from "@/types"

interface ClientDetailViewProps {
  client: Client
  profile: ProfileData | null
  mealPlan: MealPlanDay[]
  progress: ProgressEntry[]
  appointments: {
    id: string
    status: "pending" | "confirmed" | "declined" | "cancelled"
    confirmed_at: string | null
    requested_note: string | null
    coach_note: string | null
    duration_minutes: number
    session_price_amount: number | null
    session_price_currency: string | null
    payment_status: "unpaid" | "payment_requested" | "paid" | "payment_failed"
    created_at: string
  }[]
  activeModules: string[]
  ptOverview: {
    assignment: ClientPTProgramAssignment | null
    sessions: ClientPTSession[]
    logs: ClientPTLog[]
    assignment_history: ClientPTProgramAssignment[]
  } | null
  ptPrograms: Array<{
    id: string
    name: string
    duration_weeks: number
    progression_mode?: string | null
    progression_notes?: string | null
  }>
}

export function ClientDetailView({
  client,
  profile,
  mealPlan,
  progress,
  appointments,
  activeModules,
  ptOverview,
  ptPrograms,
}: ClientDetailViewProps) {
  const router = useRouter()
  const [editingProfile, setEditingProfile] = useState(false)
  const [editingMealPlan, setEditingMealPlan] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [assignmentProgramId, setAssignmentProgramId] = useState("")
  const [assignmentStartDate, setAssignmentStartDate] = useState("")
  const [assignmentNote, setAssignmentNote] = useState("")
  const [assigningProgram, setAssigningProgram] = useState(false)
  const [cancellingAssignment, setCancellingAssignment] = useState(false)
  const [completingAssignment, setCompletingAssignment] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [sessionScheduledDate, setSessionScheduledDate] = useState("")
  const [sessionStatus, setSessionStatus] = useState<"upcoming" | "available" | "completed" | "skipped">("upcoming")
  const [sessionCoachNote, setSessionCoachNote] = useState("")
  const [savingSession, setSavingSession] = useState(false)
  const [assignmentError, setAssignmentError] = useState("")

  const sheetUrl = client.sheet_id
    ? `https://docs.google.com/spreadsheets/d/${client.sheet_id}`
    : null
  const folderUrl = client.drive_folder_url
  const activeProgramRecord = ptOverview?.assignment?.program_id
    ? ptPrograms.find((program) => program.id === ptOverview.assignment?.program_id)
    : null
  const workspaceSections = [
    { id: "overview", label: "Overview", enabled: canAccessFeature("client_overview", activeModules) },
    { id: "meal-plan", label: "Meal Plan", enabled: canAccessFeature("client_meal_plan", activeModules) },
    { id: "progress", label: "Progress", enabled: canAccessFeature("client_progress", activeModules) },
    { id: "appointments", label: "Appointments", enabled: canAccessFeature("client_appointments", activeModules) },
    { id: "training", label: "Training", enabled: canAccessFeature("client_training", activeModules) },
  ].filter((section) => section.enabled)
  async function handleDelete() {
    if (!confirm("Are you sure you want to remove this client? This cannot be undone.")) {
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        router.push("/admin/clients")
      }
    } catch {
      setDeleting(false)
    }
  }

  function handleSaved() {
    setEditingProfile(false)
    setEditingMealPlan(false)
    router.refresh()
  }

  async function handleAssignProgram(event: React.FormEvent) {
    event.preventDefault()
    if (!assignmentProgramId) return

    setAssigningProgram(true)
    setAssignmentError("")
    try {
      const response = await fetch(`/api/admin/clients/${client.id}/pt-assignment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program_id: assignmentProgramId,
          assigned_start_date: assignmentStartDate || null,
          assignment_notes: assignmentNote || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setAssignmentError(data.error || "Failed to assign program")
        return
      }
      setAssignmentProgramId("")
      setAssignmentStartDate("")
      setAssignmentNote("")
      router.refresh()
    } catch {
      setAssignmentError("Failed to assign program")
    } finally {
      setAssigningProgram(false)
    }
  }

  async function handleCancelAssignment() {
    if (!confirm("Cancel the active PT assignment for this client?")) {
      return
    }

    setCancellingAssignment(true)
    setAssignmentError("")
    try {
      const response = await fetch(`/api/admin/clients/${client.id}/pt-assignment`, {
        method: "DELETE",
      })
      const data = await response.json()
      if (!response.ok) {
        setAssignmentError(data.error || "Failed to cancel assignment")
        return
      }
      router.refresh()
    } catch {
      setAssignmentError("Failed to cancel assignment")
    } finally {
      setCancellingAssignment(false)
    }
  }

  async function handleRestartAssignment() {
    if (!confirm("Restart the current PT assignment from scratch for this client?")) {
      return
    }

    setAssigningProgram(true)
    setAssignmentError("")
    try {
      const response = await fetch(`/api/admin/clients/${client.id}/pt-assignment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restart_active" }),
      })
      const data = await response.json()
      if (!response.ok) {
        setAssignmentError(data.error || "Failed to restart assignment")
        return
      }
      router.refresh()
    } catch {
      setAssignmentError("Failed to restart assignment")
    } finally {
      setAssigningProgram(false)
    }
  }

  async function handleCompleteAssignment() {
    if (!confirm("Mark the current PT assignment as completed for this client?")) {
      return
    }

    setCompletingAssignment(true)
    setAssignmentError("")
    try {
      const response = await fetch(`/api/admin/clients/${client.id}/pt-assignment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete_active" }),
      })
      const data = await response.json()
      if (!response.ok) {
        setAssignmentError(data.error || "Failed to complete assignment")
        return
      }
      router.refresh()
    } catch {
      setAssignmentError("Failed to complete assignment")
    } finally {
      setCompletingAssignment(false)
    }
  }

  function startEditSession(session: ClientPTSession) {
    setEditingSessionId(session.id)
    setSessionScheduledDate(session.scheduled_date ?? "")
    setSessionStatus(session.status)
    setSessionCoachNote(session.coach_note ?? "")
    setAssignmentError("")
  }

  function cancelEditSession() {
    setEditingSessionId(null)
    setSessionScheduledDate("")
    setSessionStatus("upcoming")
    setSessionCoachNote("")
  }

  async function handleSaveSession(sessionId: string) {
    setSavingSession(true)
    setAssignmentError("")
    try {
      const response = await fetch(`/api/admin/clients/${client.id}/pt-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduled_date: sessionScheduledDate || null,
          status: sessionStatus,
          coach_note: sessionCoachNote || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setAssignmentError(data.error || "Failed to update PT session")
        return
      }
      cancelEditSession()
      router.refresh()
    } catch {
      setAssignmentError("Failed to update PT session")
    } finally {
      setSavingSession(false)
    }
  }

  function formatAppointmentDateTime(value: string | null, createdAt: string) {
    return new Date(value || createdAt).toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    })
  }

  function formatMoney(amount: number | null, currency: string | null) {
    if (!amount || !currency) {
      return null
    }

    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  function appointmentStatusBadge(status: ClientDetailViewProps["appointments"][number]["status"]) {
    switch (status) {
      case "confirmed":
        return <Badge variant="success">Confirmed</Badge>
      case "pending":
        return <Badge variant="warning">Pending</Badge>
      case "declined":
        return <Badge>Declined</Badge>
      case "cancelled":
        return <Badge>Cancelled</Badge>
    }
  }

  function paymentStatusLabel(status: ClientDetailViewProps["appointments"][number]["payment_status"]) {
    switch (status) {
      case "paid":
        return "Paid"
      case "payment_requested":
        return "Payment requested"
      case "payment_failed":
        return "Payment failed"
      case "unpaid":
        return "Unpaid"
    }
  }

  function assignmentStatusBadge(status: ClientPTProgramAssignment["status"]) {
    switch (status) {
      case "active":
        return <Badge variant="success">Active</Badge>
      case "completed":
        return <Badge>Completed</Badge>
      case "cancelled":
        return <Badge variant="warning">Cancelled</Badge>
      case "draft":
        return <Badge>Draft</Badge>
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/admin/clients"
        className="flex items-center gap-1.5 text-sm text-gf-muted hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to clients
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <p className="text-gf-muted">{client.email}</p>
        </div>
        <div className="flex items-center gap-3">
          {client.onboarding_completed ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="warning">Pending</Badge>
          )}
          {sheetUrl && (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-gf-pink hover:text-gf-pink-light transition-colors"
            >
              <ExternalLink size={14} />
              Open Sheet
            </a>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-400 hover:text-red-300"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardTitle>Client Workspace</CardTitle>
        <p className="mt-2 text-sm text-gf-muted">
          Client-specific work stays here. Workspace-level tools like modules, exercises, billing, and settings stay outside this client context.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {workspaceSections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-full border border-gf-border bg-gf-surface px-3 py-1.5 text-sm text-white transition-colors hover:border-gf-pink hover:text-gf-pink"
            >
              {section.label}
            </a>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gf-muted">
          <Link href="/admin/modules" className="text-gf-pink hover:text-gf-pink-light transition-colors">
            Open modules
          </Link>
          <Link href="/admin/appointments" className="hover:text-white transition-colors">
            Open full appointments
          </Link>
          <Link href="/admin/settings" className="hover:text-white transition-colors">
            Workspace settings
          </Link>
        </div>
      </Card>

      <div className="grid gap-6">
        <section id="overview" className="scroll-mt-24">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Overview</CardTitle>
              {profile && !editingProfile && client.sheet_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingProfile(true)}
                >
                  <Pencil size={14} className="mr-1.5" />
                  Edit Profile
                </Button>
              )}
            </div>

            {editingProfile && profile && client.sheet_id ? (
              <ClientProfileEditor
                clientId={client.id}
                sheetId={client.sheet_id}
                profile={profile}
                onSaved={handleSaved}
                onCancel={() => setEditingProfile(false)}
              />
            ) : profile ? (
              <>
                <div className="grid grid-cols-1 gap-4 border-b border-gf-border pb-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-gf-muted">Status</p>
                    <p className="mt-0.5 text-sm text-white">
                      {client.onboarding_completed ? "Active" : "Pending onboarding"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gf-muted">Linked Sheet</p>
                    <p className="mt-0.5 text-sm text-white">
                      {sheetUrl ? "Connected" : "Not connected"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gf-muted">Client folder</p>
                    <p className="mt-0.5 text-sm text-white">
                      {folderUrl ? "Provisioned" : "Not provisioned"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gf-muted">Workbook sharing</p>
                    <p className="mt-0.5 text-sm text-white">
                      {client.sheet_shared_at ? "Granted" : "Private"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gf-muted">Client sections</p>
                    <p className="mt-0.5 text-sm text-white">{workspaceSections.length}</p>
                  </div>
                </div>
                {(folderUrl || client.sheet_shared_email) && (
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-gf-muted">
                    {folderUrl ? (
                      <a
                        href={folderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gf-pink hover:text-gf-pink-light transition-colors"
                      >
                        Open client folder
                      </a>
                    ) : null}
                    {client.sheet_shared_email ? (
                      <p>Shared workbook access: {client.sheet_shared_email}</p>
                    ) : null}
                  </div>
                )}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "Age", value: profile.age },
                    { label: "Gender", value: profile.gender },
                    { label: "Height", value: profile.height },
                    { label: "Current Weight", value: profile.current_weight },
                    { label: "Goal Weight", value: profile.goal_weight },
                    { label: "Activity Level", value: profile.activity_level },
                  ].map(
                    ({ label, value }) =>
                      value && (
                        <div key={label}>
                          <p className="text-xs text-gf-muted">{label}</p>
                          <p className="text-sm text-white mt-0.5">{value}</p>
                        </div>
                      )
                  )}
                </div>
                {profile.fitness_goals && (
                  <div className="mt-4 pt-4 border-t border-gf-border">
                    <p className="text-xs text-gf-muted">Fitness Goals</p>
                    <p className="text-sm text-white mt-0.5">{profile.fitness_goals}</p>
                  </div>
                )}
                {profile.dietary_restrictions && (
                  <div className="mt-3">
                    <p className="text-xs text-gf-muted">Dietary Restrictions</p>
                    <p className="text-sm text-white mt-0.5">{profile.dietary_restrictions}</p>
                  </div>
                )}
                {profile.health_conditions && (
                  <div className="mt-3">
                    <p className="text-xs text-gf-muted">Health Conditions</p>
                    <p className="text-sm text-white mt-0.5">{profile.health_conditions}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gf-muted">No profile data available.</p>
            )}
          </Card>
        </section>

        {canAccessFeature("client_meal_plan", activeModules) ? (
          <section id="meal-plan" className="scroll-mt-24">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <CardTitle>Meal Plan</CardTitle>
                {!editingMealPlan && client.sheet_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingMealPlan(true)}
                  >
                    <Pencil size={14} className="mr-1.5" />
                    Edit
                  </Button>
                )}
              </div>

              {editingMealPlan && client.sheet_id ? (
                <MealPlanEditor
                  clientId={client.id}
                  sheetId={client.sheet_id}
                  mealPlan={mealPlan}
                  onSaved={handleSaved}
                  onCancel={() => setEditingMealPlan(false)}
                />
              ) : (
                <MealPlanView mealPlan={mealPlan} />
              )}
            </Card>
          </section>
        ) : null}

        {canAccessFeature("client_progress", activeModules) ? (
          <section id="progress" className="scroll-mt-24">
            <div>
              <h2 className="text-lg font-semibold mb-3">Progress</h2>
              {progress.length > 0 ? (
                <div className="grid gap-6">
                  <ProgressChart entries={progress} />
                  <ProgressHistory entries={progress} />
                </div>
              ) : (
                <Card>
                  <p className="text-sm text-gf-muted">No progress entries yet.</p>
                </Card>
              )}
            </div>
          </section>
        ) : null}

        {canAccessFeature("client_appointments", activeModules) ? (
          <section id="appointments" className="scroll-mt-24">
            <Card>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <CardTitle>Appointments</CardTitle>
                  <p className="mt-2 text-sm text-gf-muted">
                    Client-specific appointment history pulled from the existing coach calendar flow.
                  </p>
                </div>
                <Link
                  href="/admin/appointments"
                  className="text-sm text-gf-pink hover:text-gf-pink-light transition-colors"
                >
                  Open full calendar
                </Link>
              </div>
              {appointments.length > 0 ? (
                <div className="space-y-3">
                  {appointments.map((appointment) => {
                    const formattedPrice = formatMoney(
                      appointment.session_price_amount,
                      appointment.session_price_currency
                    )

                    return (
                      <div
                        key={appointment.id}
                        className="rounded-xl border border-gf-border bg-gf-surface p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-white">
                              {formatAppointmentDateTime(
                                appointment.confirmed_at,
                                appointment.created_at
                              )}
                            </p>
                            <p className="mt-1 text-xs text-gf-muted">
                              {appointment.confirmed_at
                                ? `${appointment.duration_minutes} minute session`
                                : "Requested session"}
                            </p>
                            {appointment.requested_note ? (
                              <p className="mt-2 text-sm text-gf-muted">
                                Request: {appointment.requested_note}
                              </p>
                            ) : null}
                            {appointment.coach_note ? (
                              <p className="mt-1 text-sm text-gf-muted">
                                Coach note: {appointment.coach_note}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {appointmentStatusBadge(appointment.status)}
                            <span className="text-xs text-gf-muted">
                              {paymentStatusLabel(appointment.payment_status)}
                            </span>
                          </div>
                        </div>
                        {formattedPrice ? (
                          <p className="mt-3 text-sm text-white">{formattedPrice}</p>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gf-muted">No appointments for this client yet.</p>
              )}
            </Card>
          </section>
        ) : null}

        {canAccessFeature("client_training", activeModules) ? (
          <section id="training" className="scroll-mt-24">
            <Card>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <CardTitle>Training</CardTitle>
                  <p className="mt-2 text-sm text-gf-muted">
                    Assign the active PT program here, then review training adherence and recent workout activity in context.
                  </p>
                </div>
                <a href="/training" className="text-sm text-gf-pink hover:text-gf-pink-light transition-colors">
                  Client portal view
                </a>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr,0.95fr]">
                <div className="space-y-4">
                  <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
                    <p className="text-xs uppercase tracking-wide text-gf-muted">Active assignment</p>
                    {ptOverview?.assignment ? (
                      <>
                        <p className="mt-2 text-lg font-semibold text-white">
                          {ptOverview.assignment.program_name_snapshot}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="success">{ptOverview.assignment.status}</Badge>
                          {ptOverview.assignment.program_version_snapshot ? (
                            <Badge variant="default">{ptOverview.assignment.program_version_snapshot}</Badge>
                          ) : null}
                          <Badge variant="default">
                            {ptOverview.assignment.completed_sessions_count}/{ptOverview.assignment.total_sessions_count} sessions completed
                          </Badge>
                          <Badge variant="default">{ptOverview.assignment.adherence_percent}% adherence</Badge>
                          {ptOverview.assignment.current_week ? (
                            <Badge variant="default">Current week {ptOverview.assignment.current_week}</Badge>
                          ) : null}
                        </div>
                        {ptOverview.assignment.assigned_start_date ? (
                          <p className="mt-3 text-sm text-gf-muted">
                            Start date: {new Date(ptOverview.assignment.assigned_start_date).toLocaleDateString("en-GB")}
                          </p>
                        ) : null}
                        {ptOverview.assignment.assignment_notes ? (
                          <p className="mt-2 text-sm text-gf-muted">{ptOverview.assignment.assignment_notes}</p>
                        ) : null}
                        {activeProgramRecord?.progression_mode ? (
                          <p className="mt-2 text-sm text-gf-muted">
                            Progression: {activeProgramRecord.progression_mode.replace(/_/g, " ")}
                            {activeProgramRecord.progression_notes
                              ? ` • ${activeProgramRecord.progression_notes}`
                              : ""}
                          </p>
                        ) : null}
                      {ptOverview.assignment.last_session_completed_at ? (
                          <p className="mt-2 text-sm text-gf-muted">
                            Last completed: {new Date(ptOverview.assignment.last_session_completed_at).toLocaleString("en-GB")}
                          </p>
                        ) : null}
                        <div className="mt-4">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRestartAssignment}
                            disabled={assigningProgram}
                          >
                            {assigningProgram ? "Restarting..." : "Restart assignment"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleCompleteAssignment}
                            disabled={completingAssignment}
                          >
                            {completingAssignment ? "Completing..." : "Mark complete"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelAssignment}
                            disabled={cancellingAssignment}
                            className="text-red-400 hover:text-red-300"
                          >
                            {cancellingAssignment ? "Cancelling..." : "Cancel assignment"}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-gf-muted">No PT program assigned yet.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
                    <p className="text-xs uppercase tracking-wide text-gf-muted">Recent sessions</p>
                    {ptOverview?.sessions?.length ? (
                      <div className="mt-3 space-y-2">
                        {ptOverview.sessions.slice(0, 6).map((session) => (
                          <div key={session.id} className="rounded-lg border border-gf-border px-3 py-2">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-white">{session.session_name}</p>
                                <p className="text-xs text-gf-muted">
                                  Week {session.week_number} • Day {session.day_number}
                                  {session.scheduled_date ? ` • ${new Date(session.scheduled_date).toLocaleDateString("en-GB")}` : ""}
                                </p>
                                {session.coach_note ? (
                                  <p className="mt-1 text-xs text-gf-muted">Coach note: {session.coach_note}</p>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={session.status === "completed" ? "success" : "default"}>
                                  {session.status}
                                </Badge>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditSession(session)}
                                >
                                  Edit
                                </Button>
                              </div>
                            </div>
                            {editingSessionId === session.id ? (
                              <div className="mt-3 grid gap-3 rounded-lg border border-gf-border/80 bg-gf-black/20 p-3">
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <Input
                                    label="Scheduled date"
                                    type="date"
                                    value={sessionScheduledDate}
                                    onChange={(event) => setSessionScheduledDate(event.target.value)}
                                  />
                                  <Select
                                    label="Status"
                                    value={sessionStatus}
                                    onChange={(event) =>
                                      setSessionStatus(
                                        event.target.value as "upcoming" | "available" | "completed" | "skipped"
                                      )
                                    }
                                    options={[
                                      { value: "upcoming", label: "Upcoming" },
                                      { value: "available", label: "Available" },
                                      { value: "completed", label: "Completed" },
                                      { value: "skipped", label: "Skipped" },
                                    ]}
                                  />
                                </div>
                                <TextArea
                                  label="Coach note"
                                  value={sessionCoachNote}
                                  onChange={(event) => setSessionCoachNote(event.target.value)}
                                  placeholder="Add or adjust the coach note for this session."
                                />
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleSaveSession(session.id)}
                                    disabled={savingSession}
                                  >
                                    {savingSession ? "Saving..." : "Save session"}
                                  </Button>
                                  <Button type="button" variant="ghost" size="sm" onClick={cancelEditSession}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-gf-muted">No PT sessions materialized yet.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
                    <p className="text-xs uppercase tracking-wide text-gf-muted">Recent workout logs</p>
                    {ptOverview?.logs?.length ? (
                      <div className="mt-3 space-y-2">
                        {ptOverview.logs.slice(0, 5).map((log) => (
                          <div key={log.id} className="rounded-lg border border-gf-border px-3 py-2">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-white">
                                  {new Date(log.logged_at).toLocaleString("en-GB")}
                                </p>
                                <p className="text-xs text-gf-muted">
                                  {log.completion_status}
                                  {log.session_rpe ? ` • Session RPE ${log.session_rpe}` : ""}
                                  {log.energy_rating ? ` • Energy ${log.energy_rating}/10` : ""}
                                </p>
                              </div>
                              <Badge variant={log.completion_status === "completed" ? "success" : "default"}>
                                {log.completion_status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-gf-muted">No workout logs recorded yet.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
                    <p className="text-xs uppercase tracking-wide text-gf-muted">Assignment history</p>
                    {ptOverview?.assignment_history?.length ? (
                      <div className="mt-3 space-y-2">
                        {ptOverview.assignment_history.map((assignment) => (
                          <div key={assignment.id} className="rounded-lg border border-gf-border px-3 py-2">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-white">
                                  {assignment.program_name_snapshot}
                                </p>
                                <p className="mt-1 text-xs text-gf-muted">
                                  {assignment.program_version_snapshot
                                    ? `${assignment.program_version_snapshot} • `
                                    : ""}
                                  Created {new Date(assignment.created_at).toLocaleDateString("en-GB")}
                                  {assignment.assigned_start_date
                                    ? ` • Start ${new Date(assignment.assigned_start_date).toLocaleDateString("en-GB")}`
                                    : ""}
                                  {assignment.assigned_end_date
                                    ? ` • End ${new Date(assignment.assigned_end_date).toLocaleDateString("en-GB")}`
                                    : ""}
                                </p>
                              </div>
                              {assignmentStatusBadge(assignment.status)}
                            </div>
                            <p className="mt-2 text-xs text-gf-muted">
                              {assignment.completed_sessions_count}/{assignment.total_sessions_count} sessions completed
                              {" • "}
                              {assignment.adherence_percent}% adherence
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-gf-muted">No PT assignment history yet.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
                  <CardTitle>Assign program</CardTitle>
                  <p className="mt-2 text-sm text-gf-muted">
                    Assign one active PT program for this client. The plan is materialized into client sessions rather than recomputed on every load.
                  </p>
                  {ptOverview?.assignment ? (
                    <p className="mt-2 text-xs text-gf-muted">
                      Assigning a new program will replace the current active assignment.
                    </p>
                  ) : null}
                  <form onSubmit={handleAssignProgram} className="mt-4 space-y-4">
                    <Select
                      label="Program"
                      value={assignmentProgramId}
                      onChange={(event) => setAssignmentProgramId(event.target.value)}
                      options={[
                        { value: "", label: "Select program..." },
                        ...ptPrograms.map((program) => ({
                          value: program.id,
                          label: `${program.name} (${program.duration_weeks} weeks)`,
                        })),
                      ]}
                    />
                    <Input
                      label="Start date"
                      type="date"
                      value={assignmentStartDate}
                      onChange={(event) => setAssignmentStartDate(event.target.value)}
                    />
                    <TextArea
                      label="Assignment note"
                      value={assignmentNote}
                      onChange={(event) => setAssignmentNote(event.target.value)}
                      placeholder="Optional coach note for this assignment."
                    />
                    {assignmentError ? <p className="text-sm text-red-400">{assignmentError}</p> : null}
                    <Button type="submit" disabled={assigningProgram || !assignmentProgramId}>
                      {assigningProgram ? "Assigning..." : "Assign program"}
                    </Button>
                  </form>
                </div>
              </div>
            </Card>
          </section>
        ) : null}
      </div>
    </div>
  )
}
