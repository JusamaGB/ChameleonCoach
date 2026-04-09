import { createClient } from "@/lib/supabase/server"
import { getMealPlan } from "@/lib/google/sheets"
import type { MealPlanDay } from "@/types"
import { ClientNav } from "@/components/layout/client-nav"
import { PoweredBy } from "@/components/branding/powered-by"
import { MealPlanView } from "@/components/meal-plan/meal-plan-view"
import { redirect } from "next/navigation"
import { getClientPortalContext } from "@/lib/client-portal"
import { canAccessFeature } from "@/lib/modules"

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
  const portal = await getClientPortalContext(user.id)
  if (!canAccessFeature("client_portal_meal_plan", portal.modules.active_modules)) {
    redirect("/dashboard")
  }

  let mealPlan: MealPlanDay[] = []

  if (client?.sheet_id && client?.coach_id) {
    try {
      mealPlan = await getMealPlan(client.sheet_id, client.coach_id)
    } catch {
      // Sheet not accessible
    }
  }
  const branding = portal.branding

  return (
    <div className="flex min-h-screen">
      <ClientNav branding={branding} activeModules={portal.modules.active_modules} />
      <main className="flex-1 p-6 md:p-10 pb-24 md:pb-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-2" style={{ color: branding.brand_primary_color }}>
            Meal Plan
          </h1>
          <p className="text-gf-muted mb-8">Your weekly nutrition plan</p>
          <a
            href="/nutrition"
            className="mb-6 inline-flex text-sm font-semibold"
            style={{ color: branding.brand_primary_color }}
          >
            Open nutrition workspace
          </a>
          <MealPlanView
            mealPlan={mealPlan}
            highlightToday
            primaryColor={branding.brand_primary_color}
            accentColor={branding.brand_accent_color}
          />
          {branding.show_powered_by && <PoweredBy className="mt-8" />}
        </div>
      </main>
    </div>
  )
}
