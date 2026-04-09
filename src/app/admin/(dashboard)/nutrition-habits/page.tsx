import { createClient } from "@/lib/supabase/server"
import { Card } from "@/components/ui/card"
import { resolveActiveModules } from "@/lib/modules"
import { NutritionHabitManager } from "@/components/admin/nutrition-habit-manager"
import { listNutritionHabitTemplatesForCoach } from "@/lib/nutrition"

export const dynamic = "force-dynamic"

export default async function AdminNutritionHabitsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: settings } = user
    ? await supabase
        .from("admin_settings")
        .select("coach_type_preset, active_modules")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null }

  const modules = resolveActiveModules(settings ?? {})
  if (!modules.has_module("nutrition_core")) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="border-yellow-500/30">
          <p className="text-sm text-yellow-300">Nutrition Core is not active for this workspace.</p>
          <p className="mt-2 text-sm text-gf-muted">Enable Nutrition Core from Modules to build nutrition habit templates.</p>
        </Card>
      </div>
    )
  }

  const habits = user ? await listNutritionHabitTemplatesForCoach(supabase, user.id) : []
  return <NutritionHabitManager initialHabits={habits} />
}
