import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getClientPortalContext } from "@/lib/client-portal"
import { canAccessFeature } from "@/lib/modules"
import { WellnessWorkspace } from "@/components/wellness/wellness-workspace"

export const dynamic = "force-dynamic"

export default async function WellnessPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const portal = await getClientPortalContext(user.id)
  if (!canAccessFeature("client_portal_wellness", portal.modules.active_modules)) {
    redirect("/dashboard")
  }

  return <WellnessWorkspace initialBranding={portal.branding} initialActiveModules={portal.modules.active_modules} />
}
