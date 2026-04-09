import { NextResponse } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { createAdmin } from "@/lib/supabase/server"
import { createCoachOnboardingLink } from "@/lib/coach-payments"

export async function POST() {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user } = result

  const admin = createAdmin()
  const { data: settings } = await admin
    .from("admin_settings")
    .select("display_name, business_name")
    .eq("user_id", user.id)
    .maybeSingle()

  const { url } = await createCoachOnboardingLink(admin, {
    id: user.id,
    email: user.email,
    displayName: settings?.display_name ?? null,
    businessName: settings?.business_name ?? null,
  })

  return NextResponse.json({ url })
}
