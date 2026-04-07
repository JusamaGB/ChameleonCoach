import { createClient } from "@/lib/supabase/server"
import { getMealPlan, getProgress } from "@/lib/google/sheets"
import type { MealPlanDay, ProgressEntry } from "@/types"
import { ClientNav } from "@/components/layout/client-nav"
import { TodaysMeals } from "@/components/meal-plan/meal-plan-view"
import { ProgressForm } from "@/components/progress/progress-form"
import { Card } from "@/components/ui/card"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
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
  let progress: ProgressEntry[] = []

  if (client?.sheet_id && client?.coach_id) {
    try {
      ;[mealPlan, progress] = await Promise.all([
        getMealPlan(client.sheet_id, client.coach_id),
        getProgress(client.sheet_id, client.coach_id),
      ])
    } catch {
      // Sheet not accessible yet
    }
  }

  const latestWeight = [...progress]
    .reverse()
    .find((e) => e.weight)?.weight

  return (
    <div className="flex min-h-screen">
      <ClientNav />
      <main className="flex-1 p-6 md:p-10 pb-24 md:pb-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">
            Hey, {client?.name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-gf-muted mb-8">Here&apos;s your day at a glance</p>

          <div className="grid gap-6">
            {/* Quick stats */}
            {latestWeight && (
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <p className="text-xs text-gf-muted">Latest Weight</p>
                  <p className="text-2xl font-bold text-gf-pink mt-1">
                    {latestWeight}
                  </p>
                </Card>
                <Card>
                  <p className="text-xs text-gf-muted">Entries Logged</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {progress.length}
                  </p>
                </Card>
              </div>
            )}

            <TodaysMeals mealPlan={mealPlan} />
            <ProgressForm />
          </div>
        </div>
      </main>
    </div>
  )
}
