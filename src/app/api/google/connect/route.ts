import { NextResponse, type NextRequest } from "next/server"
import { createClient, createAdmin } from "@/lib/supabase/server"
import { getAuthUrl } from "@/lib/google/auth"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const action = request.nextUrl.searchParams.get("action")

  if (action === "auth") {
    const url = getAuthUrl()
    return NextResponse.redirect(url)
  }

  // Check connection status
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
