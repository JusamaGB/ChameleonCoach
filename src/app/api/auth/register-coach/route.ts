import { NextResponse, type NextRequest } from "next/server"
import { createAdmin } from "@/lib/supabase/server"
import { createStripeCustomer, createTrialSubscription } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { name, email, password } = body

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
  }

  let supabase: ReturnType<typeof createAdmin>
  try {
    supabase = createAdmin()
  } catch {
    return NextResponse.json(
      { error: "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is not set in environment variables." },
      { status: 500 }
    )
  }

  // Create auth user — email_confirm omitted so Supabase sends a confirmation email
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { name },
  })

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message || "Failed to create account" },
      { status: 400 }
    )
  }

  // Create Stripe customer + trial subscription
  let stripeCustomerId: string | null = null
  let stripeSubscriptionId: string | null = null
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_COACH_PRICE_ID) {
    try {
      stripeCustomerId = await createStripeCustomer(email, name)
      stripeSubscriptionId = await createTrialSubscription(stripeCustomerId)
    } catch {
      // Non-fatal — coach can still use the platform during trial window
    }
  }

  // Assign coach role with Stripe IDs
  const { error: roleError } = await supabase
    .from("user_roles")
    .insert({
      user_id: authData.user.id,
      role: "coach",
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_subscription_status: "trialing",
    })

  if (roleError) {
    // Clean up auth user if role insert fails
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: `Failed to assign coach role: ${roleError.message} (code: ${roleError.code})` }, { status: 500 })
  }

  // Set app_metadata so JWT contains role without needing a DB trigger
  await supabase.auth.admin.updateUserById(authData.user.id, {
    app_metadata: { role: "coach" },
  })

  return NextResponse.json({ ok: true })
}
