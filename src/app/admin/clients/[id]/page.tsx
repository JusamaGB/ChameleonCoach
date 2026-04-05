import { createAdmin } from "@/lib/supabase/server"
import { getProfile, getMealPlan, getProgress } from "@/lib/google/sheets"
import { Card, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MealPlanView } from "@/components/meal-plan/meal-plan-view"
import { ProgressChart, ProgressHistory } from "@/components/progress/progress-chart"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ExternalLink } from "lucide-react"

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdmin()

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single()

  if (!client) redirect("/admin")

  let profile = null
  let mealPlan: Awaited<ReturnType<typeof getMealPlan>> = []
  let progress: Awaited<ReturnType<typeof getProgress>> = []

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

  const sheetUrl = client.sheet_id
    ? `https://docs.google.com/spreadsheets/d/${client.sheet_id}`
    : null

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/admin"
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
        </div>
      </div>

      <div className="grid gap-6">
        {/* Profile data */}
        {profile && (
          <Card>
            <CardTitle>Profile</CardTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
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
                <p className="text-sm text-white mt-0.5">
                  {profile.fitness_goals}
                </p>
              </div>
            )}
            {profile.dietary_restrictions && (
              <div className="mt-3">
                <p className="text-xs text-gf-muted">Dietary Restrictions</p>
                <p className="text-sm text-white mt-0.5">
                  {profile.dietary_restrictions}
                </p>
              </div>
            )}
            {profile.health_conditions && (
              <div className="mt-3">
                <p className="text-xs text-gf-muted">Health Conditions</p>
                <p className="text-sm text-white mt-0.5">
                  {profile.health_conditions}
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Meal plan */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Meal Plan</h2>
          <MealPlanView mealPlan={mealPlan} />
        </div>

        {/* Progress */}
        {progress.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Progress</h2>
            <div className="grid gap-6">
              <ProgressChart entries={progress} />
              <ProgressHistory entries={progress} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
