"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { canAccessFeature } from "@/lib/modules"
import { MealPlanView } from "@/components/meal-plan/meal-plan-view"
import { ProgressChart, ProgressHistory } from "@/components/progress/progress-chart"
import { ClientProfileEditor } from "./client-profile-editor"
import { MealPlanEditor } from "./meal-plan-editor"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Pencil, Trash2 } from "lucide-react"
import type { Client, ProfileData, MealPlanDay, ProgressEntry } from "@/types"

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
}

export function ClientDetailView({
  client,
  profile,
  mealPlan,
  progress,
  appointments,
  activeModules,
}: ClientDetailViewProps) {
  const router = useRouter()
  const [editingProfile, setEditingProfile] = useState(false)
  const [editingMealPlan, setEditingMealPlan] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const sheetUrl = client.sheet_id
    ? `https://docs.google.com/spreadsheets/d/${client.sheet_id}`
    : null
  const workspaceSections = [
    { id: "overview", label: "Overview", enabled: canAccessFeature("client_overview", activeModules) },
    { id: "meal-plan", label: "Meal Plan", enabled: canAccessFeature("client_meal_plan", activeModules) },
    { id: "progress", label: "Progress", enabled: canAccessFeature("client_progress", activeModules) },
    { id: "appointments", label: "Appointments", enabled: canAccessFeature("client_appointments", activeModules) },
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
                    <p className="text-xs text-gf-muted">Client sections</p>
                    <p className="mt-0.5 text-sm text-white">{workspaceSections.length}</p>
                  </div>
                </div>
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
      </div>
    </div>
  )
}
