import { createClient } from "@/lib/supabase/server"
import { getProfile, getMealPlan, getProgress } from "@/lib/google/sheets"
import { ClientDetailView } from "@/components/admin/client-detail-view"
import { resolveActiveModules } from "@/lib/modules"
import { getClientPTOverviewForCoach, listPTProgramsForCoach } from "@/lib/pt"
import { redirect } from "next/navigation"
import type { MealPlanDay, ProgressEntry, ProfileData } from "@/types"

export const dynamic = 'force-dynamic'

type ClientAppointment = {
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
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  let client = null
  let activeModules: string[] = ["shared_core"]
  let appointments: ClientAppointment[] = []
  try {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single()
    client = data
  } catch {
    // Table may not exist
  }

  if (!client) redirect("/admin/clients")

  const [{ data: settings }, { data: appointmentData }] = await Promise.all([
    supabase
      .from("admin_settings")
      .select("coach_type_preset, active_modules")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("appointments")
      .select(
        "id, status, confirmed_at, requested_note, coach_note, duration_minutes, session_price_amount, session_price_currency, payment_status, created_at"
      )
      .eq("coach_id", user.id)
      .eq("client_id", id)
      .order("confirmed_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
  ])

  activeModules = resolveActiveModules(settings ?? {}).active_modules
  appointments = (appointmentData ?? []) as ClientAppointment[]

  let profile: ProfileData | null = null
  let mealPlan: MealPlanDay[] = []
  let progress: ProgressEntry[] = []
  let ptOverview = { assignment: null, sessions: [], logs: [] }
  let ptPrograms: any[] = []

  if (client.sheet_id) {
    try {
      ;[profile, mealPlan, progress] = await Promise.all([
        getProfile(client.sheet_id, user.id),
        getMealPlan(client.sheet_id, user.id),
        getProgress(client.sheet_id, user.id),
      ])
    } catch {
      // Sheet access issue
    }
  }

  if (activeModules.includes("pt_core")) {
    try {
      ;[ptOverview, ptPrograms] = await Promise.all([
        getClientPTOverviewForCoach(supabase, user.id, id) as Promise<any>,
        listPTProgramsForCoach(supabase, user.id),
      ])
    } catch {
      // PT data may not be available yet
    }
  }

  return (
    <ClientDetailView
      client={client}
      profile={profile}
      mealPlan={mealPlan}
      progress={progress}
      appointments={appointments}
      activeModules={activeModules}
      ptOverview={ptOverview}
      ptPrograms={ptPrograms}
    />
  )
}
