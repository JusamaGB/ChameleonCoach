import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") || null

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.exchangeCodeForSession(code)

    if (!next && user) {
      // Route coaches to admin, clients to dashboard
      let { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single()

      // Self-heal: if role row is missing, recover it from app_metadata
      if (!role) {
        const metaRole = user.app_metadata?.role as string | undefined
        if (metaRole && ["coach", "admin", "client"].includes(metaRole)) {
          await supabase.from("user_roles").upsert({
            user_id: user.id,
            role: metaRole,
            stripe_subscription_status: "trialing",
          }, { onConflict: "user_id", ignoreDuplicates: true })
          role = { role: metaRole }
        }
      }

      const destination = (role?.role === "coach" || role?.role === "admin") ? "/admin" : "/dashboard"
      return NextResponse.redirect(new URL(destination, request.url))
    }
  }

  return NextResponse.redirect(new URL(next || "/dashboard", request.url))
}
