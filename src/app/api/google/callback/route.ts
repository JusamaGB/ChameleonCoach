import { NextResponse, type NextRequest } from "next/server"
import { createClient, createAdmin } from "@/lib/supabase/server"
import { exchangeCode } from "@/lib/google/auth"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")

  if (!code) {
    return NextResponse.redirect(
      new URL("/admin/settings?error=no_code", request.url)
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.role !== "coach") {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  try {
    const tokens = await exchangeCode(code)
    const admin = createAdmin()

    const { data: existing } = await admin
      .from("admin_settings")
      .select("id")
      .eq("user_id", user.id)
      .single()

    const settingsData = {
      user_id: user.id,
      google_refresh_token: tokens.refresh_token,
      google_access_token: tokens.access_token,
      google_token_expiry: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      await admin.from("admin_settings").update(settingsData).eq("id", existing.id)
    } else {
      await admin.from("admin_settings").insert(settingsData)
    }

    return NextResponse.redirect(new URL("/admin/settings?connected=true", request.url))
  } catch {
    return NextResponse.redirect(new URL("/admin/settings?error=auth_failed", request.url))
  }
}
