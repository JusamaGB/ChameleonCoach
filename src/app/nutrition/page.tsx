import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getClientPortalContext } from "@/lib/client-portal"
import { canAccessFeature } from "@/lib/modules"
import { NutritionWorkspace } from "@/components/nutrition/nutrition-workspace"

export const dynamic = "force-dynamic"

export default async function NutritionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const portal = await getClientPortalContext(user.id)
  if (!canAccessFeature("client_portal_meal_plan", portal.modules.active_modules)) {
    redirect("/dashboard")
  }

  return <NutritionWorkspace initialBranding={portal.branding} initialActiveModules={portal.modules.active_modules} />
}
