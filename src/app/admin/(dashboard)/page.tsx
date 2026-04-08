import Link from "next/link"
import {
  ArrowRight,
  Calendar,
  CalendarPlus,
  CreditCard,
  FolderKanban,
  Users,
  UserPlus,
} from "lucide-react"
import { createAdmin, createClient } from "@/lib/supabase/server"
import { listClientsForCoach } from "@/lib/clients"
import { resolveActiveModules } from "@/lib/modules"
import { getCoachDriveWorkspaceHealth } from "@/lib/google/template"
import { Card, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const dynamic = "force-dynamic"

type AppointmentRow = {
  id: string
  client_id: string
  status: "pending" | "confirmed" | "declined" | "cancelled"
  confirmed_at: string | null
  requested_note: string | null
  payment_status: "unpaid" | "payment_requested" | "paid" | "payment_failed"
  created_at: string
}

type SlotRow = {
  id: string
  starts_at: string
  is_visible: boolean
  appointment_id: string | null
}

function formatDateTime(value: string | null) {
  if (!value) return "Awaiting confirmation"

  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function workspaceTone(status: string) {
  if (status === "healthy") {
    return {
      badge: <Badge variant="success">Healthy</Badge>,
      message: "Google is connected and the managed Chameleon workspace is ready.",
    }
  }

  if (status === "missing") {
    return {
      badge: <Badge variant="warning">Needs repair</Badge>,
      message: "Some managed Drive files are missing. Open Settings to repair the workspace.",
    }
  }

  if (status === "not_provisioned") {
    return {
      badge: <Badge variant="warning">Not provisioned</Badge>,
      message: "Create Chameleon Sheets in Settings before inviting and onboarding clients.",
    }
  }

  return {
    badge: <Badge>Disconnected</Badge>,
    message: "Reconnect Google in Settings before using the managed Sheets workspace.",
  }
}

export default async function AdminDashboard() {
  const supabase = await createClient()
  const admin = createAdmin()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-gf-muted">Coach session not found.</p>
      </div>
    )
  }

  const [{ data: clients, error: clientsError }, { data: settings }, { data: appointments }, { data: slots }] =
    await Promise.all([
      listClientsForCoach(supabase, user.id),
      admin
        .from("admin_settings")
        .select(
          "google_refresh_token, active_modules, coach_type_preset, managed_workspace_sheet_id, managed_workspace_sheet_url, managed_workspace_sheet_modules, managed_workspace_sheet_provisioned_at, managed_workspace_root_folder_id, managed_workspace_root_folder_url, managed_clients_folder_id, managed_clients_folder_url, managed_pt_library_sheet_id, managed_pt_library_sheet_url, managed_nutrition_library_sheet_id, managed_nutrition_library_sheet_url"
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("appointments")
        .select("id, client_id, status, confirmed_at, requested_note, payment_status, created_at")
        .eq("coach_id", user.id)
        .order("confirmed_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("appointment_slots")
        .select("id, starts_at, is_visible, appointment_id")
        .eq("coach_id", user.id)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true }),
    ])

  const allClients = (clients ?? []) as Array<{
    id: string
    name: string
    email: string
    invite_token: string | null
    invite_expires_at: string | null
    invite_accepted_at: string | null
    onboarding_completed: boolean
    sheet_id: string | null
    created_at: string
  }>
  const allAppointments = (appointments ?? []) as AppointmentRow[]
  const futureSlots = (slots ?? []) as SlotRow[]

  const activeClients = allClients.filter((client) => client.onboarding_completed)
  const pendingInvites = allClients.filter(
    (client) => !client.onboarding_completed && !!client.invite_token
  )
  const onboardingClients = allClients.filter(
    (client) => !client.onboarding_completed && !!client.invite_accepted_at
  )
  const linkedSheets = allClients.filter((client) => !!client.sheet_id)
  const unpaidSessions = allAppointments.filter(
    (appointment) => appointment.payment_status === "payment_requested"
  )
  const visibleSlots = futureSlots.filter((slot) => slot.is_visible)
  const bookedVisibleSlots = visibleSlots.filter((slot) => !!slot.appointment_id)
  const upcomingAppointments = allAppointments
    .filter(
      (appointment) =>
        appointment.status === "confirmed" &&
        appointment.confirmed_at &&
        new Date(appointment.confirmed_at) >= new Date()
    )
    .slice(0, 5)

  const clientNames = new Map(allClients.map((client) => [client.id, client.name]))
  const modules = resolveActiveModules(settings ?? {})
  const workspaceHealth = await getCoachDriveWorkspaceHealth({
    coachId: user.id,
    activeModules: modules.enableable_modules,
    settings,
  })
  const workspaceInfo = workspaceTone(workspaceHealth.status)
  const fillRate =
    visibleSlots.length > 0
      ? Math.round((bookedVisibleSlots.length / visibleSlots.length) * 100)
      : 0

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
          <p className="text-gf-muted">
            A universal coach view of clients, invites, appointments, and workspace health.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/invite"
            className="inline-flex items-center gap-2 rounded-lg bg-gf-pink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gf-pink-light"
          >
            <UserPlus size={16} />
            Invite client
          </Link>
          <Link
            href="/admin/appointments"
            className="inline-flex items-center gap-2 rounded-lg border border-gf-border px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-gf-pink/50"
          >
            <CalendarPlus size={16} />
            Manage appointments
          </Link>
        </div>
      </div>

      {clientsError ? (
        <Card className="mt-8">
          <p className="text-sm text-yellow-400">Database notice: {clientsError.message}</p>
          <p className="text-xs text-gf-muted mt-1">
            The dashboard loaded partially because client records could not be read cleanly.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-4 mt-8 sm:grid-cols-2 xl:grid-cols-4">
        <Card glow>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-2xl font-bold">{activeClients.length}</p>
              <p className="text-sm text-gf-muted mt-1">Active clients</p>
            </div>
            <Users className="text-gf-pink" size={20} />
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-2xl font-bold">{pendingInvites.length}</p>
              <p className="text-sm text-gf-muted mt-1">Pending invites</p>
            </div>
            <UserPlus className="text-yellow-400" size={20} />
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-2xl font-bold">
                {bookedVisibleSlots.length}/{visibleSlots.length}
              </p>
              <p className="text-sm text-gf-muted mt-1">Booked visible slots</p>
            </div>
            <Calendar className="text-green-400" size={20} />
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-2xl font-bold">{unpaidSessions.length}</p>
              <p className="text-sm text-gf-muted mt-1">Payment requests outstanding</p>
            </div>
            <CreditCard className="text-gf-pink" size={20} />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 mt-8 lg:grid-cols-[1.2fr,0.8fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Upcoming Appointments</CardTitle>
              <p className="text-sm text-gf-muted mt-1">
                Your next confirmed sessions and current booking pressure.
              </p>
            </div>
            <Badge variant={fillRate >= 70 ? "success" : fillRate >= 30 ? "warning" : "default"}>
              {fillRate}% fill rate
            </Badge>
          </div>

          {upcomingAppointments.length === 0 ? (
            <p className="text-sm text-gf-muted mt-6">
              No confirmed appointments are scheduled yet.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {upcomingAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="rounded-xl border border-gf-border bg-gf-black/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">
                        {clientNames.get(appointment.client_id) ?? "Client"}
                      </p>
                      <p className="text-sm text-gf-muted mt-1">
                        {formatDateTime(appointment.confirmed_at)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        appointment.payment_status === "paid"
                          ? "success"
                          : appointment.payment_status === "payment_requested"
                            ? "warning"
                            : "default"
                      }
                    >
                      {appointment.payment_status === "payment_requested"
                        ? "Payment requested"
                        : appointment.payment_status === "paid"
                          ? "Paid"
                          : "Unpaid"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Workspace Health</CardTitle>
              <p className="text-sm text-gf-muted mt-1">
                Shared Google workspace status for client onboarding and Sheets.
              </p>
            </div>
            {workspaceInfo.badge}
          </div>

          <div className="mt-6 space-y-4">
            <p className="text-sm text-gf-muted">{workspaceInfo.message}</p>

            {workspaceHealth.missingArtifacts.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {workspaceHealth.missingArtifacts.map((artifact) => (
                  <Badge key={artifact} variant="warning">
                    {artifact}
                  </Badge>
                ))}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                <p className="text-xs uppercase tracking-wide text-gf-muted">Linked sheets</p>
                <p className="mt-2 text-xl font-semibold">{linkedSheets.length}</p>
                <p className="text-sm text-gf-muted mt-1">Clients with a workbook attached</p>
              </div>
              <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                <p className="text-xs uppercase tracking-wide text-gf-muted">Modules enabled</p>
                <p className="mt-2 text-xl font-semibold">{modules.enableable_modules.length}</p>
                <p className="text-sm text-gf-muted mt-1">Current coach workspace mix</p>
              </div>
            </div>

            <Link
              href="/admin/settings"
              className="inline-flex items-center gap-2 text-sm font-semibold text-gf-pink hover:text-gf-pink-light"
            >
              Open workspace settings
              <ArrowRight size={14} />
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 mt-8 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Client Flow</CardTitle>
              <p className="text-sm text-gf-muted mt-1">
                At-a-glance movement through invite and onboarding states.
              </p>
            </div>
            <Link
              href="/admin/clients"
              className="inline-flex items-center gap-2 text-sm font-semibold text-gf-pink hover:text-gf-pink-light"
            >
              Open clients
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid gap-3 mt-6 sm:grid-cols-3">
            <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
              <p className="text-2xl font-bold">{allClients.length}</p>
              <p className="text-sm text-gf-muted mt-1">Total records</p>
            </div>
            <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
              <p className="text-2xl font-bold">{pendingInvites.length}</p>
              <p className="text-sm text-gf-muted mt-1">Awaiting invite acceptance</p>
            </div>
            <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
              <p className="text-2xl font-bold">{onboardingClients.length}</p>
              <p className="text-sm text-gf-muted mt-1">In onboarding</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {pendingInvites.slice(0, 4).map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-gf-border bg-gf-black/20 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{client.name}</p>
                  <p className="truncate text-sm text-gf-muted">{client.email}</p>
                </div>
                <Badge variant="warning">Pending</Badge>
              </div>
            ))}

            {pendingInvites.length === 0 ? (
              <p className="text-sm text-gf-muted">No pending invites right now.</p>
            ) : null}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Quick Actions</CardTitle>
              <p className="text-sm text-gf-muted mt-1">
                Fast access to the most common coach tasks.
              </p>
            </div>
            <FolderKanban className="text-gf-pink" size={18} />
          </div>

          <div className="mt-6 grid gap-3">
            <Link
              href="/admin/invite"
              className="flex items-center justify-between rounded-xl border border-gf-border bg-gf-black/20 p-4 transition-colors hover:border-gf-pink/40"
            >
              <div>
                <p className="font-medium text-white">Invite a new client</p>
                <p className="text-sm text-gf-muted mt-1">
                  Send a new onboarding invite into the managed workspace flow.
                </p>
              </div>
              <ArrowRight size={16} className="text-gf-muted" />
            </Link>

            <Link
              href="/admin/appointments"
              className="flex items-center justify-between rounded-xl border border-gf-border bg-gf-black/20 p-4 transition-colors hover:border-gf-pink/40"
            >
              <div>
                <p className="font-medium text-white">Review appointments</p>
                <p className="text-sm text-gf-muted mt-1">
                  Confirm requests, add slots, and handle payment requests.
                </p>
              </div>
              <ArrowRight size={16} className="text-gf-muted" />
            </Link>

            <Link
              href="/admin/premium"
              className="flex items-center justify-between rounded-xl border border-gf-border bg-gf-black/20 p-4 transition-colors hover:border-gf-pink/40"
            >
              <div>
                <p className="font-medium text-white">Adjust branding</p>
                <p className="text-sm text-gf-muted mt-1">
                  Update the coach-facing brand your clients see in portal and onboarding.
                </p>
              </div>
              <ArrowRight size={16} className="text-gf-muted" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
