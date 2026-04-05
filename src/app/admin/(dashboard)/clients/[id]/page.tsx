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

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single()

  if (!client) redirect("/admin")

  let profile: ProfileData | null = null
  let mealPlan: MealPlanDay[] = []
  let progress: ProgressEntry[] = []

  if (client.sheet_id) {
    try {
      ;[profile, mealPlan, progress] = await Promise.all([
        getProfile(client.sheet_id),
        getMealPlan(client.sheet_id),
        getProgress(client.sheet_id),
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
