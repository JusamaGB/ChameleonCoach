import { createAdmin } from "@/lib/supabase/server"
import { normalizeCoachBranding } from "@/lib/branding"
import { resolveActiveModules } from "@/lib/modules"

const CLIENT_PORTAL_SELECT =
  "brand_title, brand_logo_url, brand_primary_color, brand_accent_color, brand_welcome_text, show_powered_by, coach_type_preset, active_modules"

export async function getClientPortalContext(userId: string) {
  const admin = createAdmin()
  const { data: client } = await admin
    .from("clients")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  const { data: settings } = client?.coach_id
    ? await admin
        .from("admin_settings")
        .select(CLIENT_PORTAL_SELECT)
        .eq("user_id", client.coach_id)
        .maybeSingle()
    : { data: null }

  const modules = resolveActiveModules(settings ?? {})
  const branding = normalizeCoachBranding(settings)

  return {
    client,
    branding,
    modules,
  }
}
