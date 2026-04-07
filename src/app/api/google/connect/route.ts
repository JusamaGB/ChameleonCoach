import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { createAdmin } from "@/lib/supabase/server"
import { getAuthUrl } from "@/lib/google/auth"

export async function GET(request: NextRequest) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user } = result

  const action = request.nextUrl.searchParams.get("action")

  if (action === "auth") {
    const url = getAuthUrl()
    return NextResponse.redirect(url)
  }

  const admin = createAdmin()
  const { data: settings } = await admin
    .from("admin_settings")
    .select("google_refresh_token")
    .eq("user_id", user.id)
    .single()

  return NextResponse.json({
    connected: !!settings?.google_refresh_token,
  })
}
