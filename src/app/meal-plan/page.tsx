import { createClient } from "@/lib/supabase/server"
import { getMealPlan } from "@/lib/google/sheets"
import type { MealPlanDay } from "@/types"
import { ClientNav } from "@/components/layout/client-nav"
import { MealPlanView } from "@/components/meal-plan/meal-plan-view"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function MealPlanPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", user.id)
    .single()

  let mealPlan: MealPlanDay[] = []

  if (client?.sheet_id && client?.coach_id) {
    try {
      mealPlan = await getMealPlan(client.sheet_id, client.coach_id)
    } catch {
      // Sheet not accessible
    }
  }

  return (
    <div className="flex min-h-screen">
      <ClientNav />
      <main className="flex-1 p-6 md:p-10 pb-24 md:pb-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Meal Plan</h1>
          <p className="text-gf-muted mb-8">Your weekly nutrition plan</p>
          <MealPlanView mealPlan={mealPlan} highlightToday />
        </div>
      </main>
    </div>
  )
}
