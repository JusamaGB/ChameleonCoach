import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const publicPaths = ["/login", "/register", "/onboarding", "/api/auth", "/api/invite/accept"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    publicPaths.some((p) => pathname.startsWith(p)) ||
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/google/callback")
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (pathname.startsWith("/admin")) {
    const { data: role } = await supabase
      .from("user_roles")
      .select("role, stripe_subscription_status, trial_ends_at")
      .eq("user_id", user.id)
      .single()

    const isCoach = role?.role === "coach" || role?.role === "admin"
    if (!isCoach) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    // Subscription gate — expired trial or cancelled/unpaid subscription
    if (pathname !== "/admin/billing" && !pathname.startsWith("/admin/billing")) {
      const status = role?.stripe_subscription_status as string | undefined
      const trialEnds = role?.trial_ends_at as string | undefined
      const isLapsed =
        (status === "canceled" || status === "unpaid") &&
        trialEnds &&
        new Date(trialEnds) < new Date()

      if (isLapsed) {
        return NextResponse.redirect(new URL("/admin/billing", request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
