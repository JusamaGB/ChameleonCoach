import { createClient } from "@/lib/supabase/server"
import { getMealPlan, getProgress } from "@/lib/google/sheets"
import type { MealPlanDay, ProgressEntry } from "@/types"
import { ClientNav } from "@/components/layout/client-nav"
import { PoweredBy } from "@/components/branding/powered-by"
import { TodaysMeals } from "@/components/meal-plan/meal-plan-view"
import { ProgressForm } from "@/components/progress/progress-form"
import { Card } from "@/components/ui/card"
import { redirect } from "next/navigation"
import { getClientPortalContext } from "@/lib/client-portal"
import { canAccessFeature } from "@/lib/modules"

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
  const portal = await getClientPortalContext(user.id)

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
  const branding = portal.branding
  const activeModules = portal.modules.active_modules
  const showMealPlan = canAccessFeature("client_portal_meal_plan", activeModules)
  const showTraining = canAccessFeature("client_portal_training", activeModules)
  const showWellness = canAccessFeature("client_portal_wellness", activeModules)

  return (
    <div className="flex min-h-screen">
      <ClientNav branding={branding} activeModules={activeModules} />
      <main className="flex-1 p-6 md:p-10 pb-24 md:pb-10">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 flex items-center gap-3">
            {branding.brand_logo_url ? (
              <img
                src={branding.brand_logo_url}
                alt={`${branding.brand_title} logo`}
                className="h-12 w-12 rounded-xl object-cover"
              />
            ) : (
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: branding.brand_primary_color }}
              >
                {branding.brand_title.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-medium" style={{ color: branding.brand_primary_color }}>
                {branding.brand_title}
              </p>
              <p className="text-sm" style={{ color: branding.brand_accent_color }}>
                {branding.brand_welcome_text}
              </p>
            </div>
          </div>
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
                  <p className="text-2xl font-bold mt-1" style={{ color: branding.brand_primary_color }}>
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

            {showMealPlan ? (
              <>
                <TodaysMeals
                  mealPlan={mealPlan}
                  primaryColor={branding.brand_primary_color}
                  accentColor={branding.brand_accent_color}
                />
                <Card>
                  <p className="text-xs text-gf-muted">Nutrition Core</p>
                  <h2 className="mt-1 text-lg font-semibold text-white">Nutrition workspace available</h2>
                  <p className="mt-2 text-sm text-gf-muted">
                    Log nutrition habits, weekly check-ins, and real-world meal notes for your coach.
                  </p>
                  <a
                    href="/nutrition"
                    className="mt-4 inline-flex text-sm font-semibold"
                    style={{ color: branding.brand_primary_color }}
                  >
                    Open nutrition workspace
                  </a>
                </Card>
              </>
            ) : null}
            {showTraining ? (
              <Card>
                <p className="text-xs text-gf-muted">PT Core</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Training plan available</h2>
                <p className="mt-2 text-sm text-gf-muted">
                  Your coach can assign sessions and log-ready workouts inside your training workspace.
                </p>
                <a
                  href="/training"
                  className="mt-4 inline-flex text-sm font-semibold"
                  style={{ color: branding.brand_primary_color }}
                >
                  Open training
                </a>
              </Card>
            ) : null}
            {showWellness ? (
              <Card>
                <p className="text-xs text-gf-muted">Wellness Core</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Wellness workspace available</h2>
                <p className="mt-2 text-sm text-gf-muted">
                  Check your goals, log wellness habits, and submit weekly reflections for your coach.
                </p>
                <a
                  href="/wellness"
                  className="mt-4 inline-flex text-sm font-semibold"
                  style={{ color: branding.brand_primary_color }}
                >
                  Open wellness workspace
                </a>
              </Card>
            ) : null}
            <ProgressForm primaryColor={branding.brand_primary_color} />
            {branding.show_powered_by && <PoweredBy />}
          </div>
        </div>
      </main>
    </div>
  )
}
