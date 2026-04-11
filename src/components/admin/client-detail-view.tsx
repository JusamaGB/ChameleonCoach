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
import { WellnessClientSection } from "./wellness-client-section"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Pencil, Trash2 } from "lucide-react"
import type {
  Client,
  ClientNutritionCheckIn,
  ClientNutritionHabitAssignment,
  ClientNutritionHabitLog,
  ClientNutritionLogEntry,
  ClientPTLog,
  ClientPTProgramAssignment,
  ClientPTSessionExercise,
  ClientPTSession,
  MealPlanDay,
  NutritionHabitTemplate,
  NutritionMealPlanTemplate,
  NutritionMealPlanTemplateDay,
  ProfileData,
  ProgressEntry,
  WellnessGoalTemplate,
  WellnessHabitTemplate,
  ClientWellnessGoalAssignment,
  ClientWellnessHabitAssignment,
  ClientWellnessHabitLog,
  ClientWellnessCheckIn,
  ClientWellnessSessionNote,
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

function formatDisplayDate(value: string | null | undefined) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function isFilled(value: string | null | undefined) {
  return Boolean(value && value.trim())
}

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
    session_exercises: ClientPTSessionExercise[]
  } | null
  ptPrograms: Array<{
    id: string
    name: string
    duration_weeks: number
    progression_mode?: string | null
    progression_notes?: string | null
  }>
  nutritionTemplates: Array<NutritionMealPlanTemplate & { days?: NutritionMealPlanTemplateDay[] }>
  nutritionHabitTemplates: NutritionHabitTemplate[]
  nutritionHabitAssignments: ClientNutritionHabitAssignment[]
  nutritionHabitLogs: ClientNutritionHabitLog[]
  nutritionCheckIns: ClientNutritionCheckIn[]
  nutritionLogs: ClientNutritionLogEntry[]
  wellnessGoalTemplates: WellnessGoalTemplate[]
  wellnessHabitTemplates: WellnessHabitTemplate[]
  wellnessGoalAssignments: ClientWellnessGoalAssignment[]
  wellnessHabitAssignments: ClientWellnessHabitAssignment[]
  wellnessHabitLogs: ClientWellnessHabitLog[]
  wellnessCheckIns: ClientWellnessCheckIn[]
  wellnessSessionNotes: ClientWellnessSessionNote[]
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
  nutritionTemplates,
  nutritionHabitTemplates,
  nutritionHabitAssignments,
  nutritionHabitLogs,
  nutritionCheckIns,
  nutritionLogs,
  wellnessGoalTemplates,
  wellnessHabitTemplates,
  wellnessGoalAssignments,
  wellnessHabitAssignments,
  wellnessHabitLogs,
  wellnessCheckIns,
  wellnessSessionNotes,
}: ClientDetailViewProps) {
  const router = useRouter()
  const [editingProfile, setEditingProfile] = useState(false)
  const [editingMealPlan, setEditingMealPlan] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [nutritionHabitTemplateId, setNutritionHabitTemplateId] = useState("")
  const [nutritionHabitStartDate, setNutritionHabitStartDate] = useState("")
  const [assigningNutritionHabit, setAssigningNutritionHabit] = useState(false)
  const [updatingNutritionHabitId, setUpdatingNutritionHabitId] = useState<string | null>(null)
  const [nutritionCheckInForm, setNutritionCheckInForm] = useState({
    submitted_at: todayKey(),
    week_label: defaultWeekLabel(),
    adherence_score: "7",
    energy_score: "7",
    hunger_score: "7",
    digestion_score: "7",
    sleep_score: "7",
    wins: "",
    struggles: "",
    coach_follow_up_note: "",
  })
  const [submittingNutritionCheckIn, setSubmittingNutritionCheckIn] = useState(false)
  const [editingNutritionCheckInId, setEditingNutritionCheckInId] = useState<string | null>(null)
  const [updatingNutritionCheckIn, setUpdatingNutritionCheckIn] = useState(false)
  const [nutritionLogForm, setNutritionLogForm] = useState({
    logged_at: todayKey(),
    meal_slot: "any",
    entry_title: "",
    notes: "",
    adherence_flag: "flexible",
    hunger_score: "7",
    coach_note: "",
  })
  const [submittingNutritionLog, setSubmittingNutritionLog] = useState(false)
  const [editingNutritionLogId, setEditingNutritionLogId] = useState<string | null>(null)
  const [updatingNutritionLog, setUpdatingNutritionLog] = useState(false)
  const [editingNutritionHabitLogId, setEditingNutritionHabitLogId] = useState<string | null>(null)
  const [nutritionHabitLogForm, setNutritionHabitLogForm] = useState({
    adherence_score: "",
    coach_note: "",
  })
  const [updatingNutritionHabitLog, setUpdatingNutritionHabitLog] = useState(false)
  const [nutritionError, setNutritionError] = useState("")
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
  const [editingSessionExerciseId, setEditingSessionExerciseId] = useState<string | null>(null)
  const [sessionExerciseForm, setSessionExerciseForm] = useState({
    block_label: "",
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
  })
  const [savingSessionExercise, setSavingSessionExercise] = useState(false)
  const [assignmentError, setAssignmentError] = useState("")
  const [repairingWorkspace, setRepairingWorkspace] = useState(false)
  const [workspaceMessage, setWorkspaceMessage] = useState("")
  const [workspaceError, setWorkspaceError] = useState("")

  const sheetUrl = client.sheet_id
    ? `https://docs.google.com/spreadsheets/d/${client.sheet_id}`
    : null
  const folderUrl = client.drive_folder_url
  const activeProgramRecord = ptOverview?.assignment?.program_id
    ? ptPrograms.find((program) => program.id === ptOverview.assignment?.program_id)
    : null
  const latestProgressEntry = [...progress]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] ?? null
  const upcomingAppointmentsCount = appointments.filter(
    (appointment) => appointment.status === "pending" || appointment.status === "confirmed"
  ).length
  const completedAppointmentsCount = appointments.filter(
    (appointment) => appointment.status === "confirmed"
  ).length
  const completedProfileFields = profile
    ? [
        profile.age,
        profile.gender,
        profile.height,
        profile.current_weight,
        profile.goal_weight,
        profile.activity_level,
        profile.fitness_goals,
        profile.dietary_restrictions,
        profile.health_conditions,
        profile.notes,
      ].filter((value) => isFilled(value)).length
    : 0
  const workspaceSections = [
    { id: "overview", label: "Overview", enabled: canAccessFeature("client_overview", activeModules) },
    { id: "meal-plan", label: "Nutrition", enabled: canAccessFeature("client_meal_plan", activeModules) },
    { id: "wellness", label: "Wellness", enabled: canAccessFeature("client_wellness", activeModules) },
    { id: "progress", label: "Progress", enabled: canAccessFeature("client_progress", activeModules) },
    { id: "appointments", label: "Appointments", enabled: canAccessFeature("client_appointments", activeModules) },
    { id: "training", label: "Training", enabled: canAccessFeature("client_training", activeModules) },
  ].filter((section) => section.enabled)
  const hasMealPlanSection = workspaceSections.some((section) => section.id === "meal-plan")
  const hasProgressSection = workspaceSections.some((section) => section.id === "progress")
  const hasAppointmentsSection = workspaceSections.some((section) => section.id === "appointments")
  const hasTrainingSection = workspaceSections.some((section) => section.id === "training")
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

  function resetNutritionCheckInForm() {
    setEditingNutritionCheckInId(null)
    setNutritionCheckInForm({
      submitted_at: todayKey(),
      week_label: defaultWeekLabel(),
      adherence_score: "7",
      energy_score: "7",
      hunger_score: "7",
      digestion_score: "7",
      sleep_score: "7",
      wins: "",
      struggles: "",
      coach_follow_up_note: "",
    })
  }

  function beginEditNutritionCheckIn(checkIn: ClientNutritionCheckIn) {
    setEditingNutritionCheckInId(checkIn.id)
    setNutritionCheckInForm({
      submitted_at: checkIn.submitted_at.slice(0, 10),
      week_label: checkIn.week_label ?? "",
      adherence_score: checkIn.adherence_score?.toString() ?? "",
      energy_score: checkIn.energy_score?.toString() ?? "",
      hunger_score: checkIn.hunger_score?.toString() ?? "",
      digestion_score: checkIn.digestion_score?.toString() ?? "",
      sleep_score: checkIn.sleep_score?.toString() ?? "",
      wins: checkIn.wins ?? "",
      struggles: checkIn.struggles ?? "",
      coach_follow_up_note: checkIn.coach_follow_up_note ?? "",
    })
    setNutritionError("")
  }

  function resetNutritionLogForm() {
    setEditingNutritionLogId(null)
    setNutritionLogForm({
      logged_at: todayKey(),
      meal_slot: "any",
      entry_title: "",
      notes: "",
      adherence_flag: "flexible",
      hunger_score: "7",
      coach_note: "",
    })
  }

  function resetNutritionHabitLogForm() {
    setEditingNutritionHabitLogId(null)
    setNutritionHabitLogForm({
      adherence_score: "",
      coach_note: "",
    })
  }

  function beginEditNutritionHabitLog(log: ClientNutritionHabitLog) {
    setEditingNutritionHabitLogId(log.id)
    setNutritionHabitLogForm({
      adherence_score: log.adherence_score?.toString() ?? "",
      coach_note: log.coach_note ?? "",
    })
    setNutritionError("")
  }

  function beginEditNutritionLog(log: ClientNutritionLogEntry) {
    setEditingNutritionLogId(log.id)
    setNutritionLogForm({
      logged_at: log.logged_at.slice(0, 10),
      meal_slot: log.meal_slot,
      entry_title: log.entry_title,
      notes: log.notes ?? "",
      adherence_flag: log.adherence_flag,
      hunger_score: log.hunger_score?.toString() ?? "",
      coach_note: log.coach_note ?? "",
    })
    setNutritionError("")
  }

  async function handleAssignNutritionHabit(event: React.FormEvent) {
    event.preventDefault()
    if (!nutritionHabitTemplateId) return

    setAssigningNutritionHabit(true)
    setNutritionError("")
    try {
      const response = await fetch(`/api/admin/clients/${client.id}/nutrition-habits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          habit_template_id: nutritionHabitTemplateId,
          assigned_start_date: nutritionHabitStartDate || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setNutritionError(data.error || "Failed to assign nutrition habit")
        return
      }
      setNutritionHabitTemplateId("")
      setNutritionHabitStartDate("")
      router.refresh()
    } catch {
      setNutritionError("Failed to assign nutrition habit")
    } finally {
      setAssigningNutritionHabit(false)
    }
  }

  async function handleSubmitNutritionCheckIn(event: React.FormEvent) {
    event.preventDefault()
    setSubmittingNutritionCheckIn(true)
    setNutritionError("")
    try {
      const response = await fetch(`/api/admin/clients/${client.id}/nutrition-check-ins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...nutritionCheckInForm,
          submitted_at: nutritionCheckInForm.submitted_at || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setNutritionError(data.error || "Failed to add nutrition check-in")
        return
      }
      resetNutritionCheckInForm()
      router.refresh()
    } catch {
      setNutritionError("Failed to add nutrition check-in")
    } finally {
      setSubmittingNutritionCheckIn(false)
    }
  }

  async function handleUpdateNutritionCheckIn() {
    if (!editingNutritionCheckInId) return

    setUpdatingNutritionCheckIn(true)
    setNutritionError("")
    try {
      const response = await fetch(`/api/admin/clients/${client.id}/nutrition-check-ins/${editingNutritionCheckInId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...nutritionCheckInForm,
          submitted_at: nutritionCheckInForm.submitted_at || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setNutritionError(data.error || "Failed to update nutrition check-in")
        return
      }
      resetNutritionCheckInForm()
      router.refresh()
    } catch {
      setNutritionError("Failed to update nutrition check-in")
    } finally {
      setUpdatingNutritionCheckIn(false)
    }
  }

  async function handleSubmitNutritionLog(event: React.FormEvent) {
    event.preventDefault()
    setSubmittingNutritionLog(true)
    setNutritionError("")
    try {
      const response = await fetch(`/api/admin/clients/${client.id}/nutrition-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...nutritionLogForm,
          logged_at: nutritionLogForm.logged_at || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setNutritionError(data.error || "Failed to add nutrition log")
        return
      }
      resetNutritionLogForm()
      router.refresh()
    } catch {
      setNutritionError("Failed to add nutrition log")
    } finally {
      setSubmittingNutritionLog(false)
    }
  }

  async function handleUpdateNutritionLog() {
    if (!editingNutritionLogId) return

    setUpdatingNutritionLog(true)
    setNutritionError("")
    try {
      const response = await fetch(`/api/admin/clients/${client.id}/nutrition-logs/${editingNutritionLogId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...nutritionLogForm,
          logged_at: nutritionLogForm.logged_at || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setNutritionError(data.error || "Failed to update nutrition log")
        return
      }
      resetNutritionLogForm()
      router.refresh()
    } catch {
      setNutritionError("Failed to update nutrition log")
    } finally {
      setUpdatingNutritionLog(false)
    }
  }

  async function handleUpdateNutritionHabit(
    assignmentId: string,
    status: ClientNutritionHabitAssignment["status"]
  ) {
    setUpdatingNutritionHabitId(assignmentId)
    setNutritionError("")
    try {
      const response = await fetch(`/api/admin/clients/${client.id}/nutrition-habits/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await response.json()
      if (!response.ok) {
        setNutritionError(data.error || "Failed to update nutrition habit")
        return
      }
      router.refresh()
    } catch {
      setNutritionError("Failed to update nutrition habit")
    } finally {
      setUpdatingNutritionHabitId(null)
    }
  }

  async function handleUpdateNutritionHabitLog(logId: string) {
    setUpdatingNutritionHabitLog(true)
    setNutritionError("")
    try {
      const response = await fetch(`/api/admin/clients/${client.id}/nutrition-habit-logs/${logId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adherence_score: nutritionHabitLogForm.adherence_score || null,
          coach_note: nutritionHabitLogForm.coach_note,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setNutritionError(data.error || "Failed to update nutrition habit log")
        return
      }
      resetNutritionHabitLogForm()
      router.refresh()
    } catch {
      setNutritionError("Failed to update nutrition habit log")
    } finally {
      setUpdatingNutritionHabitLog(false)
    }
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

  function startEditSessionExercise(exercise: ClientPTSessionExercise) {
    setEditingSessionExerciseId(exercise.id)
    setSessionExerciseForm({
      block_label: exercise.block_label ?? "",
      sets: exercise.sets?.toString() ?? "",
      reps: exercise.reps ?? "",
      duration_seconds: exercise.duration_seconds?.toString() ?? "",
      distance_value: exercise.distance_value?.toString() ?? "",
      distance_unit: exercise.distance_unit ?? "",
      rest_seconds: exercise.rest_seconds?.toString() ?? "",
      tempo: exercise.tempo ?? "",
      load_guidance: exercise.load_guidance ?? "",
      rpe_target: exercise.rpe_target?.toString() ?? "",
      notes: exercise.notes ?? "",
    })
    setAssignmentError("")
  }

  function cancelEditSessionExercise() {
    setEditingSessionExerciseId(null)
    setSessionExerciseForm({
      block_label: "",
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
    })
  }

  async function handleSaveSessionExercise(sessionId: string, sessionExerciseId: string) {
    setSavingSessionExercise(true)
    setAssignmentError("")
    try {
      const response = await fetch(
        `/api/admin/clients/${client.id}/pt-sessions/${sessionId}/exercises/${sessionExerciseId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sessionExerciseForm),
        }
      )
      const data = await response.json()
      if (!response.ok) {
        setAssignmentError(data.error || "Failed to update PT session exercise")
        return
      }
      cancelEditSessionExercise()
      router.refresh()
    } catch {
      setAssignmentError("Failed to update PT session exercise")
    } finally {
      setSavingSessionExercise(false)
    }
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

  const activeNutritionHabitsCount = nutritionHabitAssignments.filter((habit) => habit.status === "active").length
  const currentDayKey = todayKey()
  const habitLogsThisWeek = nutritionHabitLogs.filter((log) => {
    const date = new Date(log.completion_date)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
    return diffDays >= 0 && diffDays < 7
  })
  const completedHabitLogsThisWeek = habitLogsThisWeek.filter((log) => log.completion_status === "completed").length
  const missedHabitLogsThisWeek = habitLogsThisWeek.filter((log) => log.completion_status === "missed").length
  const latestHabitLog = nutritionHabitLogs[0] ?? null
  const latestNutritionCheckIn = nutritionCheckIns[0] ?? null
  const averageAdherence = nutritionCheckIns.length
    ? Math.round(
        nutritionCheckIns.reduce((sum, checkIn) => sum + (checkIn.adherence_score ?? 0), 0) / nutritionCheckIns.length
      )
    : null
  const latestNutritionLog = nutritionLogs[0] ?? null
  const offPlanLogsThisWeek = nutritionLogs.filter((log) => {
    const date = new Date(log.logged_at)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
    return diffDays >= 0 && diffDays < 7 && log.adherence_flag === "off_plan"
  }).length
  const lowSignalCheckIns = nutritionCheckIns.filter((checkIn) =>
    [checkIn.adherence_score, checkIn.energy_score, checkIn.digestion_score, checkIn.sleep_score].some(
      (score) => typeof score === "number" && score <= 4
    )
  ).length
  const checkInAgeDays = latestNutritionCheckIn
    ? Math.floor((Date.now() - new Date(latestNutritionCheckIn.submitted_at).getTime()) / 86400000)
    : null
  const needsNutritionFollowUp =
    missedHabitLogsThisWeek > 0
    || offPlanLogsThisWeek > 0
    || lowSignalCheckIns > 0
    || checkInAgeDays === null
    || checkInAgeDays > 10

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

  function provisioningBadge() {
    switch (client.provisioning_status) {
      case "ready":
        return <Badge variant="success">Workspace ready</Badge>
      case "provisioning":
        return <Badge variant="warning">Provisioning</Badge>
      case "failed":
        return <Badge variant="warning">Needs repair</Badge>
      default:
        return <Badge>Awaiting setup</Badge>
    }
  }

  async function handleRepairWorkspace() {
    setRepairingWorkspace(true)
    setWorkspaceMessage("")
    setWorkspaceError("")

    try {
      const response = await fetch(`/api/admin/clients/${client.id}/repair-workspace`, {
        method: "POST",
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || "Failed to repair workspace")
      }

      setWorkspaceMessage("Client workspace repaired. Refreshing the latest state...")
      router.refresh()
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Failed to repair workspace")
    } finally {
      setRepairingWorkspace(false)
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
          {client.onboarding_completed ? <Badge variant="success">Active</Badge> : <Badge variant="warning">Pending</Badge>}
          {provisioningBadge()}
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
        <div className="mt-4 rounded-xl border border-gf-border bg-gf-surface p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium text-white">Provisioning status</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {provisioningBadge()}
                {client.sheet_id ? <Badge variant="success">Sheet linked</Badge> : <Badge>Sheet pending</Badge>}
                {client.sheet_shared_at ? <Badge variant="success">Shared to client</Badge> : <Badge>Sharing pending</Badge>}
              </div>
              {client.provisioning_last_error ? (
                <p className="mt-3 text-sm text-yellow-300">{client.provisioning_last_error}</p>
              ) : null}
              {workspaceMessage ? (
                <p className="mt-3 text-sm text-green-400">{workspaceMessage}</p>
              ) : null}
              {workspaceError ? (
                <p className="mt-3 text-sm text-red-400">{workspaceError}</p>
              ) : null}
            </div>
            <Button
              size="sm"
              variant={client.provisioning_status === "ready" ? "secondary" : "primary"}
              onClick={handleRepairWorkspace}
              disabled={repairingWorkspace}
            >
              {repairingWorkspace
                ? "Repairing..."
                : client.provisioning_status === "ready"
                  ? "Re-sync workspace"
                  : "Repair workspace"}
            </Button>
          </div>
        </div>
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
                <div className="rounded-2xl border border-gf-border bg-gf-black/20 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={client.onboarding_completed ? "success" : "warning"}>
                          {client.onboarding_completed ? "Active client" : "Pending onboarding"}
                        </Badge>
                        <Badge variant={sheetUrl ? "success" : "default"}>
                          {sheetUrl ? "Sheet connected" : "Sheet pending"}
                        </Badge>
                        <Badge variant={client.sheet_shared_at ? "success" : "default"}>
                          {client.sheet_shared_at ? "Shared to client" : "Coach-only workbook"}
                        </Badge>
                      </div>
                      <h3 className="mt-4 text-2xl font-semibold text-white">{profile.name || client.name}</h3>
                      <p className="mt-1 text-sm text-gf-muted">
                        Coach-side Chameleon sheet snapshot for day-to-day review and action.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sheetUrl ? (
                        <a
                          href={sheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-gf-pink px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gf-pink-light"
                        >
                          <ExternalLink size={14} />
                          Open workbook
                        </a>
                      ) : null}
                      {folderUrl ? (
                        <a
                          href={folderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gf-border px-3 py-2 text-sm text-gf-muted transition-colors hover:border-gf-pink/40 hover:text-white"
                        >
                          Open folder
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
                      <p className="text-xs uppercase tracking-wide text-gf-muted">Sheet coverage</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{completedProfileFields}/10</p>
                      <p className="mt-1 text-sm text-gf-muted">Structured profile fields filled from the Chameleon workbook.</p>
                    </div>
                    <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
                      <p className="text-xs uppercase tracking-wide text-gf-muted">Latest progress</p>
                      <p className="mt-2 text-sm font-medium text-white">
                        {latestProgressEntry?.weight || "No progress yet"}
                      </p>
                      <p className="mt-1 text-sm text-gf-muted">
                        {latestProgressEntry
                          ? `${formatDisplayDate(latestProgressEntry.date) || latestProgressEntry.date}${latestProgressEntry.measurements ? ` • ${latestProgressEntry.measurements}` : ""}`
                          : "Progress updates will surface here once logged."}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
                      <p className="text-xs uppercase tracking-wide text-gf-muted">Appointments in play</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{upcomingAppointmentsCount}</p>
                      <p className="mt-1 text-sm text-gf-muted">
                        {completedAppointmentsCount} confirmed session{completedAppointmentsCount === 1 ? "" : "s"} in this workspace.
                      </p>
                    </div>
                    <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
                      <p className="text-xs uppercase tracking-wide text-gf-muted">Client sections</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{workspaceSections.length}</p>
                      <p className="mt-1 text-sm text-gf-muted">Enabled coach-facing sections for this client.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
                  <div className="rounded-2xl border border-gf-border bg-gf-black/10 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gf-muted">At a glance</p>
                        <p className="mt-1 text-lg font-semibold text-white">Core client details</p>
                      </div>
                      <Badge variant="pink">Profile tab</Badge>
                    </div>
                    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {[
                        { label: "Email", value: profile.email || client.email },
                        { label: "Age", value: profile.age },
                        { label: "Gender", value: profile.gender },
                        { label: "Height", value: profile.height },
                        { label: "Current weight", value: profile.current_weight },
                        { label: "Goal weight", value: profile.goal_weight },
                        { label: "Activity level", value: profile.activity_level },
                        { label: "Workbook access", value: client.sheet_shared_email || "Not shared yet" },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-xl border border-gf-border bg-gf-surface/70 p-4">
                          <p className="text-xs text-gf-muted">{label}</p>
                          <p className="mt-1 text-sm text-white">{value || "Not provided yet"}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gf-border bg-gf-black/10 p-5">
                    <p className="text-xs uppercase tracking-wide text-gf-muted">Coach actions</p>
                    <p className="mt-1 text-lg font-semibold text-white">Useful next moves</p>
                    <div className="mt-5 space-y-3">
                      {hasMealPlanSection ? (
                        <a
                          href="#meal-plan"
                          className="flex items-center justify-between rounded-xl border border-gf-border bg-gf-surface/70 px-4 py-3 text-sm text-white transition-colors hover:border-gf-pink/40"
                        >
                          <span>Review nutrition setup</span>
                          <span className="text-gf-muted">Meal plan, habits, check-ins</span>
                        </a>
                      ) : null}
                      {hasProgressSection ? (
                        <a
                          href="#progress"
                          className="flex items-center justify-between rounded-xl border border-gf-border bg-gf-surface/70 px-4 py-3 text-sm text-white transition-colors hover:border-gf-pink/40"
                        >
                          <span>Check progress history</span>
                          <span className="text-gf-muted">{progress.length} entries</span>
                        </a>
                      ) : null}
                      {hasAppointmentsSection ? (
                        <a
                          href="#appointments"
                          className="flex items-center justify-between rounded-xl border border-gf-border bg-gf-surface/70 px-4 py-3 text-sm text-white transition-colors hover:border-gf-pink/40"
                        >
                          <span>Open appointment context</span>
                          <span className="text-gf-muted">{appointments.length} total</span>
                        </a>
                      ) : null}
                      {hasTrainingSection ? (
                        <a
                          href="#training"
                          className="flex items-center justify-between rounded-xl border border-gf-border bg-gf-surface/70 px-4 py-3 text-sm text-white transition-colors hover:border-gf-pink/40"
                        >
                          <span>Open training assignment</span>
                          <span className="text-gf-muted">
                            {ptOverview?.assignment ? activeProgramRecord?.name || "Assigned program" : "Not assigned"}
                          </span>
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-3">
                  <div className="rounded-2xl border border-gf-border bg-gf-black/10 p-5 lg:col-span-2">
                    <p className="text-xs uppercase tracking-wide text-gf-muted">Coaching context</p>
                    <p className="mt-1 text-lg font-semibold text-white">Goals, restrictions, and health notes</p>
                    <div className="mt-5 space-y-4">
                      <div className="rounded-xl border border-gf-border bg-gf-surface/70 p-4">
                        <p className="text-xs text-gf-muted">Fitness goals</p>
                        <p className="mt-1 text-sm text-white">{profile.fitness_goals || "No goals recorded yet."}</p>
                      </div>
                      <div className="rounded-xl border border-gf-border bg-gf-surface/70 p-4">
                        <p className="text-xs text-gf-muted">Dietary restrictions</p>
                        <p className="mt-1 text-sm text-white">{profile.dietary_restrictions || "No dietary restrictions recorded."}</p>
                      </div>
                      <div className="rounded-xl border border-gf-border bg-gf-surface/70 p-4">
                        <p className="text-xs text-gf-muted">Health conditions</p>
                        <p className="mt-1 text-sm text-white">{profile.health_conditions || "No health conditions recorded."}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gf-border bg-gf-black/10 p-5">
                    <p className="text-xs uppercase tracking-wide text-gf-muted">Sheet metadata</p>
                    <p className="mt-1 text-lg font-semibold text-white">Workspace state</p>
                    <div className="mt-5 space-y-3 text-sm text-gf-muted">
                      <div className="rounded-xl border border-gf-border bg-gf-surface/70 p-4">
                        <p className="text-xs text-gf-muted">Provisioning</p>
                        <p className="mt-1 text-sm text-white">
                          {client.provisioning_status === "ready" ? "Workspace ready" : client.provisioning_status}
                        </p>
                      </div>
                      <div className="rounded-xl border border-gf-border bg-gf-surface/70 p-4">
                        <p className="text-xs text-gf-muted">Shared to</p>
                        <p className="mt-1 text-sm text-white">{client.sheet_shared_email || "Client access not granted yet"}</p>
                      </div>
                      <div className="rounded-xl border border-gf-border bg-gf-surface/70 p-4">
                        <p className="text-xs text-gf-muted">Shared on</p>
                        <p className="mt-1 text-sm text-white">{formatDisplayDate(client.sheet_shared_at) || "Not shared yet"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {profile.notes ? (
                  <div className="mt-6 rounded-2xl border border-gf-border bg-gf-black/10 p-5">
                    <p className="text-xs uppercase tracking-wide text-gf-muted">Coach notes from sheet</p>
                    <p className="mt-2 text-sm text-white">{profile.notes}</p>
                  </div>
                ) : null}
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
                <CardTitle>Nutrition</CardTitle>
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
                  templates={nutritionTemplates}
                  onSaved={handleSaved}
                  onCancel={() => setEditingMealPlan(false)}
                />
              ) : (
                <div className="space-y-6">
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-white">Meal plan</p>
                        <p className="mt-1 text-sm text-gf-muted">
                          Apply coach templates here, then adjust the client’s weekly meals directly.
                        </p>
                      </div>
                      {nutritionTemplates.length ? (
                        <Badge variant="default">{nutritionTemplates.length} templates ready</Badge>
                      ) : null}
                    </div>
                    <MealPlanView mealPlan={mealPlan} />
                  </div>

                  <div className="border-t border-gf-border pt-6">
                    <div className="mb-6 grid gap-4 md:grid-cols-4">
                      <div className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                        <p className="text-xs uppercase tracking-wide text-gf-muted">Active habits</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{activeNutritionHabitsCount}</p>
                        <p className="mt-1 text-sm text-gf-muted">Current nutrition accountability targets</p>
                      </div>
                      <div className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                        <p className="text-xs uppercase tracking-wide text-gf-muted">Average adherence</p>
                        <p className="mt-2 text-2xl font-semibold text-white">
                          {averageAdherence ? `${averageAdherence}/10` : "No data"}
                        </p>
                        <p className="mt-1 text-sm text-gf-muted">Based on recent nutrition check-ins</p>
                      </div>
                      <div className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                        <p className="text-xs uppercase tracking-wide text-gf-muted">Habit logs (7d)</p>
                        <p className="mt-2 text-2xl font-semibold text-white">
                          {habitLogsThisWeek.length ? `${completedHabitLogsThisWeek}/${habitLogsThisWeek.length}` : "No data"}
                        </p>
                        <p className="mt-1 text-sm text-gf-muted">
                          {latestHabitLog
                            ? `Latest ${latestHabitLog.completion_status} on ${new Date(latestHabitLog.completion_date).toLocaleDateString("en-GB")}`
                            : "Waiting for the first client habit completion"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                        <p className="text-xs uppercase tracking-wide text-gf-muted">Latest check-in</p>
                        <p className="mt-2 text-sm font-medium text-white">
                          {latestNutritionCheckIn
                            ? new Date(latestNutritionCheckIn.submitted_at).toLocaleDateString("en-GB")
                            : "None yet"}
                        </p>
                        <p className="mt-1 text-sm text-gf-muted">
                          {latestNutritionCheckIn?.week_label || "Add the first weekly nutrition check-in below"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                        <p className="text-xs uppercase tracking-wide text-gf-muted">Latest nutrition log</p>
                        <p className="mt-2 text-sm font-medium text-white">
                          {latestNutritionLog?.entry_title || "None yet"}
                        </p>
                        <p className="mt-1 text-sm text-gf-muted">
                          {latestNutritionLog
                            ? `${latestNutritionLog.meal_slot} • ${new Date(latestNutritionLog.logged_at).toLocaleDateString("en-GB")}`
                            : "Add the first real-world nutrition note below"}
                        </p>
                      </div>
                    </div>

                    <div className="mb-6 grid gap-4 md:grid-cols-4">
                      <div className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                        <p className="text-xs uppercase tracking-wide text-gf-muted">Follow-up radar</p>
                        <p className="mt-2 text-sm font-medium text-white">
                          {needsNutritionFollowUp ? "Needs coach review" : "Stable this week"}
                        </p>
                        <p className="mt-1 text-sm text-gf-muted">
                          Flags missed habits, off-plan logs, low check-in scores, or stale weekly updates.
                        </p>
                      </div>
                      <div className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                        <p className="text-xs uppercase tracking-wide text-gf-muted">Missed habits (7d)</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{missedHabitLogsThisWeek}</p>
                        <p className="mt-1 text-sm text-gf-muted">Client logs marked as missed this week.</p>
                      </div>
                      <div className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                        <p className="text-xs uppercase tracking-wide text-gf-muted">Off-plan logs (7d)</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{offPlanLogsThisWeek}</p>
                        <p className="mt-1 text-sm text-gf-muted">Real-world entries tagged off plan in the last week.</p>
                      </div>
                      <div className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                        <p className="text-xs uppercase tracking-wide text-gf-muted">Check-in freshness</p>
                        <p className="mt-2 text-sm font-medium text-white">
                          {checkInAgeDays === null ? "No check-in yet" : `${checkInAgeDays} days ago`}
                        </p>
                        <p className="mt-1 text-sm text-gf-muted">
                          {lowSignalCheckIns > 0 ? `${lowSignalCheckIns} low-signal check-in${lowSignalCheckIns === 1 ? "" : "s"} logged.` : "No low-signal check-ins flagged yet."}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-white">Nutrition habits</p>
                        <p className="mt-1 text-sm text-gf-muted">
                          Assign repeatable nutrition habits that should also remain visible in the client workbook.
                        </p>
                      </div>
                      <Badge variant={nutritionHabitAssignments.some((habit) => habit.status === "active") ? "success" : "default"}>
                        {nutritionHabitAssignments.filter((habit) => habit.status === "active").length} active
                      </Badge>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
                      <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
                        <p className="text-xs uppercase tracking-wide text-gf-muted">Assign habit</p>
                        {nutritionHabitTemplates.length > 0 ? (
                          <form onSubmit={handleAssignNutritionHabit} className="mt-4 space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gf-muted">Habit template</label>
                              <select
                                value={nutritionHabitTemplateId}
                                onChange={(event) => setNutritionHabitTemplateId(event.target.value)}
                                className="mt-1 w-full rounded-lg border border-gf-border bg-gf-black px-4 py-2.5 text-white focus:outline-none focus:border-gf-pink"
                              >
                                <option value="">Select a habit...</option>
                                {nutritionHabitTemplates.map((habit) => (
                                  <option key={habit.id} value={habit.id}>
                                    {habit.name} • {habit.target_count} per {habit.target_period}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gf-muted">Start date</label>
                              <input
                                type="date"
                                value={nutritionHabitStartDate}
                                onChange={(event) => setNutritionHabitStartDate(event.target.value)}
                                className="mt-1 w-full rounded-lg border border-gf-border bg-gf-black px-4 py-2.5 text-white focus:outline-none focus:border-gf-pink"
                              />
                            </div>
                            {nutritionError ? <p className="text-sm text-red-400">{nutritionError}</p> : null}
                            <Button type="submit" disabled={assigningNutritionHabit}>
                              {assigningNutritionHabit ? "Assigning..." : "Assign habit"}
                            </Button>
                          </form>
                        ) : (
                          <div className="mt-4 rounded-xl border border-dashed border-gf-border bg-gf-black/10 px-4 py-5">
                            <p className="text-sm font-medium text-white">No nutrition habits yet</p>
                            <p className="mt-1 text-sm text-gf-muted">
                              Build reusable habits from the Nutrition Core module layer first.
                            </p>
                            <Link href="/admin/nutrition-habits" className="mt-3 inline-flex text-sm text-gf-pink hover:text-gf-pink-light transition-colors">
                              Open nutrition habits
                            </Link>
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
                        <p className="text-xs uppercase tracking-wide text-gf-muted">Assigned habits</p>
                        {nutritionHabitAssignments.length > 0 ? (
                          <div className="mt-4 space-y-3">
                            {nutritionHabitAssignments.map((habit) => (
                              <div key={habit.id} className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-medium text-white">{habit.habit_name_snapshot}</p>
                                      <Badge variant={habit.status === "active" ? "success" : habit.status === "completed" ? "default" : "warning"}>
                                        {habit.status}
                                      </Badge>
                                      <Badge variant="default">
                                        {habit.target_count} per {habit.target_period}
                                      </Badge>
                                      <Badge variant="default">{habit.meal_slot}</Badge>
                                    </div>
                                    {habit.description_snapshot ? (
                                      <p className="mt-2 text-sm text-gf-muted">{habit.description_snapshot}</p>
                                    ) : null}
                                    {habit.coaching_notes ? (
                                      <p className="mt-2 text-sm text-gf-muted">{habit.coaching_notes}</p>
                                    ) : null}
                                    {habit.assigned_start_date ? (
                                      <p className="mt-2 text-xs text-gf-muted">
                                        Start date: {new Date(habit.assigned_start_date).toLocaleDateString("en-GB")}
                                      </p>
                                    ) : null}
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    {habit.status === "active" ? (
                                      <>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          disabled={updatingNutritionHabitId === habit.id}
                                          onClick={() => handleUpdateNutritionHabit(habit.id, "completed")}
                                        >
                                          Complete
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          disabled={updatingNutritionHabitId === habit.id}
                                          className="text-red-400 hover:text-red-300"
                                          onClick={() => handleUpdateNutritionHabit(habit.id, "cancelled")}
                                        >
                                          Cancel
                                        </Button>
                                      </>
                                    ) : (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        disabled={updatingNutritionHabitId === habit.id}
                                        onClick={() => handleUpdateNutritionHabit(habit.id, "active")}
                                      >
                                        Reactivate
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-4 rounded-xl border border-dashed border-gf-border bg-gf-black/10 px-4 py-5">
                            <p className="text-sm font-medium text-white">No habits assigned yet</p>
                            <p className="mt-1 text-sm text-gf-muted">
                              Assign coach-defined nutrition habits here to start the accountability loop.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 border-t border-gf-border pt-6">
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-white">Habit completion log</p>
                          <p className="mt-1 text-sm text-gf-muted">
                            Review client-submitted habit completions and quick adherence notes.
                          </p>
                        </div>
                        <Badge variant={nutritionHabitLogs.length ? "success" : "default"}>
                          {nutritionHabitLogs.length} logged
                        </Badge>
                      </div>
                      {nutritionHabitLogs.length > 0 ? (
                        <div className="space-y-3">
                          {nutritionHabitLogs.map((log) => {
                            const relatedHabit = nutritionHabitAssignments.find((habit) => habit.id === log.assignment_id)
                            return (
                              <div key={log.id} className="rounded-xl border border-gf-border bg-gf-surface p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-medium text-white">{relatedHabit?.habit_name_snapshot ?? "Nutrition habit"}</p>
                                      <Badge
                                        variant={
                                          log.completion_status === "completed"
                                            ? "success"
                                            : log.completion_status === "partial"
                                              ? "warning"
                                              : "default"
                                        }
                                      >
                                        {log.completion_status}
                                      </Badge>
                                      {log.adherence_score ? <Badge variant="default">{log.adherence_score}/10</Badge> : null}
                                      {log.completion_date === currentDayKey ? <Badge variant="default">Today</Badge> : null}
                                    </div>
                                    <p className="mt-2 text-xs text-gf-muted">
                                      {new Date(log.completion_date).toLocaleDateString("en-GB")} • Logged {new Date(log.logged_at).toLocaleString("en-GB")}
                                    </p>
                                    {log.notes ? <p className="mt-2 text-sm text-gf-muted">{log.notes}</p> : null}
                                    {editingNutritionHabitLogId === log.id ? (
                                      <div className="mt-3 grid gap-3 rounded-lg border border-gf-border/80 bg-gf-black/20 p-3">
                                        <Input
                                          label="Adherence score (1-10)"
                                          type="number"
                                          min="1"
                                          max="10"
                                          value={nutritionHabitLogForm.adherence_score}
                                          onChange={(event) =>
                                            setNutritionHabitLogForm((current) => ({
                                              ...current,
                                              adherence_score: event.target.value,
                                            }))
                                          }
                                        />
                                        <TextArea
                                          label="Coach note"
                                          value={nutritionHabitLogForm.coach_note}
                                          onChange={(event) =>
                                            setNutritionHabitLogForm((current) => ({
                                              ...current,
                                              coach_note: event.target.value,
                                            }))
                                          }
                                          placeholder="Add context or the next action for this habit."
                                        />
                                        {nutritionError ? <p className="text-sm text-red-400">{nutritionError}</p> : null}
                                        <div className="flex items-center gap-2">
                                          <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => handleUpdateNutritionHabitLog(log.id)}
                                            disabled={updatingNutritionHabitLog}
                                          >
                                            {updatingNutritionHabitLog ? "Saving..." : "Save note"}
                                          </Button>
                                          <Button type="button" variant="ghost" size="sm" onClick={resetNutritionHabitLogForm}>
                                            Cancel
                                          </Button>
                                        </div>
                                      </div>
                                    ) : log.coach_note ? (
                                      <p className="mt-2 text-sm text-gf-muted">
                                        <span className="text-white">Coach note:</span> {log.coach_note}
                                      </p>
                                    ) : (
                                      <p className="mt-2 text-sm text-gf-muted">No coach note added yet.</p>
                                    )}
                                  </div>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => beginEditNutritionHabitLog(log)}>
                                    {log.coach_note ? "Edit note" : "Add note"}
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-gf-border bg-gf-black/10 px-4 py-5">
                          <p className="text-sm font-medium text-white">No habit logs yet</p>
                          <p className="mt-1 text-sm text-gf-muted">
                            Once clients start marking nutrition habits complete or missed, review context will appear here.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 border-t border-gf-border pt-6">
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-white">Nutrition check-ins</p>
                          <p className="mt-1 text-sm text-gf-muted">
                            Capture weekly nutrition adherence and follow-up context in the client workspace and workbook.
                          </p>
                        </div>
                        <Badge variant={nutritionCheckIns.length ? "success" : "default"}>
                          {nutritionCheckIns.length} logged
                        </Badge>
                      </div>

                      <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
                        <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs uppercase tracking-wide text-gf-muted">
                              {editingNutritionCheckInId ? "Edit check-in" : "Add check-in"}
                            </p>
                            {editingNutritionCheckInId ? (
                              <Button type="button" variant="ghost" size="sm" onClick={resetNutritionCheckInForm}>
                                Cancel
                              </Button>
                            ) : null}
                          </div>
                          <form
                            onSubmit={(event) => {
                              if (editingNutritionCheckInId) {
                                event.preventDefault()
                                void handleUpdateNutritionCheckIn()
                              } else {
                                void handleSubmitNutritionCheckIn(event)
                              }
                            }}
                            className="mt-4 space-y-4"
                          >
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <label className="block text-sm font-medium text-gf-muted">Date</label>
                                <input
                                  type="date"
                                  value={nutritionCheckInForm.submitted_at}
                                  onChange={(event) => setNutritionCheckInForm((current) => ({ ...current, submitted_at: event.target.value }))}
                                  className="mt-1 w-full rounded-lg border border-gf-border bg-gf-black px-4 py-2.5 text-white focus:outline-none focus:border-gf-pink"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gf-muted">Week label</label>
                                <input
                                  type="text"
                                  value={nutritionCheckInForm.week_label}
                                  onChange={(event) => setNutritionCheckInForm((current) => ({ ...current, week_label: event.target.value }))}
                                  placeholder="e.g. Week of 8 April"
                                  className="mt-1 w-full rounded-lg border border-gf-border bg-gf-black px-4 py-2.5 text-white focus:outline-none focus:border-gf-pink"
                                />
                              </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                              {[
                                ["adherence_score", "Adherence"],
                                ["energy_score", "Energy"],
                                ["hunger_score", "Hunger"],
                                ["digestion_score", "Digestion"],
                                ["sleep_score", "Sleep"],
                              ].map(([field, label]) => (
                                <div key={field}>
                                  <label className="block text-sm font-medium text-gf-muted">{label} (1-10)</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={nutritionCheckInForm[field as keyof typeof nutritionCheckInForm] as string}
                                    onChange={(event) =>
                                      setNutritionCheckInForm((current) => ({
                                        ...current,
                                        [field]: event.target.value,
                                      }))
                                    }
                                    className="mt-1 w-full rounded-lg border border-gf-border bg-gf-black px-4 py-2.5 text-white focus:outline-none focus:border-gf-pink"
                                  />
                                </div>
                              ))}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gf-muted">Wins</label>
                              <textarea
                                value={nutritionCheckInForm.wins}
                                onChange={(event) => setNutritionCheckInForm((current) => ({ ...current, wins: event.target.value }))}
                                className="mt-1 min-h-[88px] w-full rounded-lg border border-gf-border bg-gf-black px-4 py-2.5 text-white focus:outline-none focus:border-gf-pink"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gf-muted">Struggles</label>
                              <textarea
                                value={nutritionCheckInForm.struggles}
                                onChange={(event) => setNutritionCheckInForm((current) => ({ ...current, struggles: event.target.value }))}
                                className="mt-1 min-h-[88px] w-full rounded-lg border border-gf-border bg-gf-black px-4 py-2.5 text-white focus:outline-none focus:border-gf-pink"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gf-muted">Coach follow-up note</label>
                              <textarea
                                value={nutritionCheckInForm.coach_follow_up_note}
                                onChange={(event) =>
                                  setNutritionCheckInForm((current) => ({ ...current, coach_follow_up_note: event.target.value }))
                                }
                                className="mt-1 min-h-[88px] w-full rounded-lg border border-gf-border bg-gf-black px-4 py-2.5 text-white focus:outline-none focus:border-gf-pink"
                              />
                            </div>

                            {nutritionError ? <p className="text-sm text-red-400">{nutritionError}</p> : null}
                            <Button type="submit" disabled={submittingNutritionCheckIn || updatingNutritionCheckIn}>
                              {editingNutritionCheckInId
                                ? updatingNutritionCheckIn ? "Saving..." : "Save check-in"
                                : submittingNutritionCheckIn ? "Adding..." : "Add check-in"}
                            </Button>
                          </form>
                        </div>

                        <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
                          <p className="text-xs uppercase tracking-wide text-gf-muted">Recent check-ins</p>
                          {nutritionCheckIns.length > 0 ? (
                            <div className="mt-4 space-y-3">
                              {nutritionCheckIns.map((checkIn) => (
                                <div key={checkIn.id} className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-medium text-white">
                                          {checkIn.week_label || new Date(checkIn.submitted_at).toLocaleDateString("en-GB")}
                                        </p>
                                        <Badge variant="default">
                                          {new Date(checkIn.submitted_at).toLocaleDateString("en-GB")}
                                        </Badge>
                                      </div>
                                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-gf-muted">
                                        {checkIn.adherence_score ? <span>Adherence {checkIn.adherence_score}/10</span> : null}
                                        {checkIn.energy_score ? <span>Energy {checkIn.energy_score}/10</span> : null}
                                        {checkIn.hunger_score ? <span>Hunger {checkIn.hunger_score}/10</span> : null}
                                        {checkIn.digestion_score ? <span>Digestion {checkIn.digestion_score}/10</span> : null}
                                        {checkIn.sleep_score ? <span>Sleep {checkIn.sleep_score}/10</span> : null}
                                      </div>
                                      {checkIn.wins ? (
                                        <p className="mt-3 text-sm text-gf-muted">
                                          <span className="text-white">Wins:</span> {checkIn.wins}
                                        </p>
                                      ) : null}
                                      {checkIn.struggles ? (
                                        <p className="mt-2 text-sm text-gf-muted">
                                          <span className="text-white">Struggles:</span> {checkIn.struggles}
                                        </p>
                                      ) : null}
                                      {checkIn.coach_follow_up_note ? (
                                        <p className="mt-2 text-sm text-gf-muted">
                                          <span className="text-white">Coach follow-up:</span> {checkIn.coach_follow_up_note}
                                        </p>
                                      ) : null}
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => beginEditNutritionCheckIn(checkIn)}>
                                      Edit
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-4 rounded-xl border border-dashed border-gf-border bg-gf-black/10 px-4 py-5">
                              <p className="text-sm font-medium text-white">No check-ins yet</p>
                              <p className="mt-1 text-sm text-gf-muted">
                                Add the first nutrition check-in to start building accountability and coach review context.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-gf-border pt-6">
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-white">Nutrition log</p>
                          <p className="mt-1 text-sm text-gf-muted">
                            Capture real-world meals, reflections, and on-plan/off-plan context between weekly check-ins.
                          </p>
                        </div>
                        <Badge variant={nutritionLogs.length ? "success" : "default"}>
                          {nutritionLogs.length} entries
                        </Badge>
                      </div>

                      <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
                        <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs uppercase tracking-wide text-gf-muted">
                              {editingNutritionLogId ? "Edit log entry" : "Add log entry"}
                            </p>
                            {editingNutritionLogId ? (
                              <Button type="button" variant="ghost" size="sm" onClick={resetNutritionLogForm}>
                                Cancel
                              </Button>
                            ) : null}
                          </div>
                          <form
                            onSubmit={(event) => {
                              if (editingNutritionLogId) {
                                event.preventDefault()
                                void handleUpdateNutritionLog()
                              } else {
                                void handleSubmitNutritionLog(event)
                              }
                            }}
                            className="mt-4 space-y-4"
                          >
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <label className="block text-sm font-medium text-gf-muted">Date</label>
                                <input
                                  type="date"
                                  value={nutritionLogForm.logged_at}
                                  onChange={(event) => setNutritionLogForm((current) => ({ ...current, logged_at: event.target.value }))}
                                  className="mt-1 w-full rounded-lg border border-gf-border bg-gf-black px-4 py-2.5 text-white focus:outline-none focus:border-gf-pink"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gf-muted">Meal slot</label>
                                <select
                                  value={nutritionLogForm.meal_slot}
                                  onChange={(event) => setNutritionLogForm((current) => ({ ...current, meal_slot: event.target.value }))}
                                  className="mt-1 w-full rounded-lg border border-gf-border bg-gf-black px-4 py-2.5 text-white focus:outline-none focus:border-gf-pink"
                                >
                                  <option value="any">Any</option>
                                  <option value="breakfast">Breakfast</option>
                                  <option value="lunch">Lunch</option>
                                  <option value="dinner">Dinner</option>
                                  <option value="snacks">Snacks</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gf-muted">Entry title</label>
                              <input
                                type="text"
                                value={nutritionLogForm.entry_title}
                                onChange={(event) => setNutritionLogForm((current) => ({ ...current, entry_title: event.target.value }))}
                                placeholder="e.g. Weekend dinner out"
                                className="mt-1 w-full rounded-lg border border-gf-border bg-gf-black px-4 py-2.5 text-white focus:outline-none focus:border-gf-pink"
                              />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <label className="block text-sm font-medium text-gf-muted">Adherence</label>
                                <select
                                  value={nutritionLogForm.adherence_flag}
                                  onChange={(event) => setNutritionLogForm((current) => ({ ...current, adherence_flag: event.target.value }))}
                                  className="mt-1 w-full rounded-lg border border-gf-border bg-gf-black px-4 py-2.5 text-white focus:outline-none focus:border-gf-pink"
                                >
                                  <option value="flexible">Flexible</option>
                                  <option value="on_plan">On plan</option>
                                  <option value="off_plan">Off plan</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gf-muted">Hunger (1-10)</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={nutritionLogForm.hunger_score}
                                  onChange={(event) => setNutritionLogForm((current) => ({ ...current, hunger_score: event.target.value }))}
                                  className="mt-1 w-full rounded-lg border border-gf-border bg-gf-black px-4 py-2.5 text-white focus:outline-none focus:border-gf-pink"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gf-muted">Notes</label>
                              <textarea
                                value={nutritionLogForm.notes}
                                onChange={(event) => setNutritionLogForm((current) => ({ ...current, notes: event.target.value }))}
                                className="mt-1 min-h-[88px] w-full rounded-lg border border-gf-border bg-gf-black px-4 py-2.5 text-white focus:outline-none focus:border-gf-pink"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gf-muted">Coach note</label>
                              <textarea
                                value={nutritionLogForm.coach_note}
                                onChange={(event) => setNutritionLogForm((current) => ({ ...current, coach_note: event.target.value }))}
                                className="mt-1 min-h-[88px] w-full rounded-lg border border-gf-border bg-gf-black px-4 py-2.5 text-white focus:outline-none focus:border-gf-pink"
                              />
                            </div>
                            {nutritionError ? <p className="text-sm text-red-400">{nutritionError}</p> : null}
                            <Button type="submit" disabled={submittingNutritionLog || updatingNutritionLog}>
                              {editingNutritionLogId
                                ? updatingNutritionLog ? "Saving..." : "Save log entry"
                                : submittingNutritionLog ? "Adding..." : "Add log entry"}
                            </Button>
                          </form>
                        </div>

                        <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
                          <p className="text-xs uppercase tracking-wide text-gf-muted">Recent log entries</p>
                          {nutritionLogs.length > 0 ? (
                            <div className="mt-4 space-y-3">
                              {nutritionLogs.map((log) => (
                                <div key={log.id} className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-medium text-white">{log.entry_title}</p>
                                        <Badge variant="default">{log.meal_slot}</Badge>
                                        <Badge
                                          variant={
                                            log.adherence_flag === "on_plan"
                                              ? "success"
                                              : log.adherence_flag === "off_plan"
                                                ? "warning"
                                                : "default"
                                          }
                                        >
                                          {log.adherence_flag.replace(/_/g, " ")}
                                        </Badge>
                                      </div>
                                      <p className="mt-2 text-xs text-gf-muted">
                                        {new Date(log.logged_at).toLocaleString("en-GB")}
                                        {log.hunger_score ? ` • Hunger ${log.hunger_score}/10` : ""}
                                      </p>
                                      {log.notes ? <p className="mt-3 text-sm text-gf-muted">{log.notes}</p> : null}
                                      {log.coach_note ? (
                                        <p className="mt-2 text-sm text-gf-muted">
                                          <span className="text-white">Coach note:</span> {log.coach_note}
                                        </p>
                                      ) : null}
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => beginEditNutritionLog(log)}>
                                      Edit
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-4 rounded-xl border border-dashed border-gf-border bg-gf-black/10 px-4 py-5">
                              <p className="text-sm font-medium text-white">No nutrition logs yet</p>
                              <p className="mt-1 text-sm text-gf-muted">
                                Add day-to-day nutrition reflections here so coaches can review what happened between weekly check-ins.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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

        {canAccessFeature("client_wellness", activeModules) ? (
          <div id="wellness">
            <WellnessClientSection
              clientId={client.id}
              goalTemplates={wellnessGoalTemplates}
              habitTemplates={wellnessHabitTemplates}
              goalAssignments={wellnessGoalAssignments}
              habitAssignments={wellnessHabitAssignments}
              habitLogs={wellnessHabitLogs}
              checkIns={wellnessCheckIns}
              sessionNotes={wellnessSessionNotes}
            />
          </div>
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
                        {ptOverview.sessions.slice(0, 6).map((session) => {
                          const sessionExercises = (ptOverview.session_exercises ?? []).filter(
                            (exercise) => exercise.client_session_id === session.id
                          )

                          return (
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
                            {sessionExercises.length ? (
                              <div className="mt-3 space-y-2">
                                {sessionExercises.map((exercise) => (
                                  <div
                                    key={exercise.id}
                                    className="rounded-lg border border-gf-border/80 bg-gf-black/20 px-3 py-2"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-medium text-white">
                                          {exercise.sort_order}. {exercise.exercise_name_snapshot}
                                        </p>
                                        <p className="mt-1 text-xs text-gf-muted">
                                          {exercise.sets ? `${exercise.sets} sets` : ""}
                                          {exercise.reps ? ` • ${exercise.reps} reps` : ""}
                                          {exercise.duration_seconds ? ` • ${exercise.duration_seconds}s` : ""}
                                          {exercise.rest_seconds ? ` • Rest ${exercise.rest_seconds}s` : ""}
                                          {exercise.tempo ? ` • Tempo ${exercise.tempo}` : ""}
                                        </p>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => startEditSessionExercise(exercise)}
                                      >
                                        Edit exercise
                                      </Button>
                                    </div>
                                    {editingSessionExerciseId === exercise.id ? (
                                      <div className="mt-3 grid gap-3 rounded-lg border border-gf-border/80 bg-gf-surface p-3">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                          <Input
                                            label="Block label"
                                            value={sessionExerciseForm.block_label}
                                            onChange={(event) =>
                                              setSessionExerciseForm((current) => ({ ...current, block_label: event.target.value }))
                                            }
                                          />
                                          <Input
                                            label="Sets"
                                            type="number"
                                            value={sessionExerciseForm.sets}
                                            onChange={(event) =>
                                              setSessionExerciseForm((current) => ({ ...current, sets: event.target.value }))
                                            }
                                          />
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                          <Input
                                            label="Reps"
                                            value={sessionExerciseForm.reps}
                                            onChange={(event) =>
                                              setSessionExerciseForm((current) => ({ ...current, reps: event.target.value }))
                                            }
                                          />
                                          <Input
                                            label="Duration (seconds)"
                                            type="number"
                                            value={sessionExerciseForm.duration_seconds}
                                            onChange={(event) =>
                                              setSessionExerciseForm((current) => ({ ...current, duration_seconds: event.target.value }))
                                            }
                                          />
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                          <Input
                                            label="Distance"
                                            type="number"
                                            value={sessionExerciseForm.distance_value}
                                            onChange={(event) =>
                                              setSessionExerciseForm((current) => ({ ...current, distance_value: event.target.value }))
                                            }
                                          />
                                          <Input
                                            label="Distance unit"
                                            value={sessionExerciseForm.distance_unit}
                                            onChange={(event) =>
                                              setSessionExerciseForm((current) => ({ ...current, distance_unit: event.target.value }))
                                            }
                                          />
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                          <Input
                                            label="Rest (seconds)"
                                            type="number"
                                            value={sessionExerciseForm.rest_seconds}
                                            onChange={(event) =>
                                              setSessionExerciseForm((current) => ({ ...current, rest_seconds: event.target.value }))
                                            }
                                          />
                                          <Input
                                            label="Tempo"
                                            value={sessionExerciseForm.tempo}
                                            onChange={(event) =>
                                              setSessionExerciseForm((current) => ({ ...current, tempo: event.target.value }))
                                            }
                                          />
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                          <Input
                                            label="Load guidance"
                                            value={sessionExerciseForm.load_guidance}
                                            onChange={(event) =>
                                              setSessionExerciseForm((current) => ({ ...current, load_guidance: event.target.value }))
                                            }
                                          />
                                          <Input
                                            label="RPE target"
                                            type="number"
                                            value={sessionExerciseForm.rpe_target}
                                            onChange={(event) =>
                                              setSessionExerciseForm((current) => ({ ...current, rpe_target: event.target.value }))
                                            }
                                          />
                                        </div>
                                        <TextArea
                                          label="Exercise note"
                                          value={sessionExerciseForm.notes}
                                          onChange={(event) =>
                                            setSessionExerciseForm((current) => ({ ...current, notes: event.target.value }))
                                          }
                                        />
                                        <div className="flex items-center gap-2">
                                          <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => handleSaveSessionExercise(session.id, exercise.id)}
                                            disabled={savingSessionExercise}
                                          >
                                            {savingSessionExercise ? "Saving..." : "Save exercise"}
                                          </Button>
                                          <Button type="button" variant="ghost" size="sm" onClick={cancelEditSessionExercise}>
                                            Cancel
                                          </Button>
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        )})}
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
