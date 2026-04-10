import { createClient } from "@/lib/supabase/server"
import { Card } from "@/components/ui/card"
import { resolveActiveModules } from "@/lib/modules"
import { WellnessHabitManager } from "@/components/admin/wellness-habit-manager"
import { listWellnessHabitTemplatesForCoach } from "@/lib/wellness"

export const dynamic = "force-dynamic"

export default async function AdminWellnessHabitsPage() {
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
  if (!modules.has_module("wellness_core")) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="border-yellow-500/30">
          <p className="text-sm text-yellow-300">Wellness Core is not active for this workspace.</p>
          <p className="mt-2 text-sm text-gf-muted">Enable Wellness Core from Modules to build wellness habit libraries.</p>
        </Card>
      </div>
    )
  }

  const habits = user ? await listWellnessHabitTemplatesForCoach(supabase, user.id) : []
  return <WellnessHabitManager initialHabits={habits} />
}
