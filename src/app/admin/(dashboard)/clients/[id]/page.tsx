import { createClient } from "@/lib/supabase/server"
import { getProfile, getMealPlan, getProgress } from "@/lib/google/sheets"
import { ClientDetailView } from "@/components/admin/client-detail-view"
import { redirect } from "next/navigation"
import type { MealPlanDay, ProgressEntry, ProfileData } from "@/types"

export const dynamic = 'force-dynamic'

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

  if (!client) redirect("/admin")

  let profile: ProfileData | null = null
  let mealPlan: MealPlanDay[] = []
  let progress: ProgressEntry[] = []

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

  return (
    <ClientDetailView
      client={client}
      profile={profile}
      mealPlan={mealPlan}
      progress={progress}
    />
  )
}
