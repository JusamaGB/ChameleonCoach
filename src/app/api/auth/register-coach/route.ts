import { NextResponse, type NextRequest } from "next/server"
import { createAdmin } from "@/lib/supabase/server"
import { createStripeCustomer, createTrialSubscription } from "@/lib/stripe"
import { normalizeCoachTypePreset, seedModulesForPreset } from "@/lib/modules"

function isMissingColumnError(error: { code?: string | null; message?: string | null } | null) {
  return error?.code === "PGRST204"
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { name, email, password, coach_type_preset } = body

  if (!name || !email || !password || !coach_type_preset) {
    return NextResponse.json({ error: "Name, email, password and coach type are required" }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
  }

  const preset = normalizeCoachTypePreset(coach_type_preset)
  if (!preset) {
    return NextResponse.json({ error: "Invalid coach type" }, { status: 400 })
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

  // Create and auto-confirm the coach account.
  // The admin createUser API does not send confirmation emails.
  // app_metadata.role is set at creation time so the callback can self-heal
  // if the user_roles insert below ever fails.
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
    app_metadata: { role: "coach" },
  })

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message || "Failed to create account" },
      { status: 400 }
    )
  }

  // Always create the coach role first.
  // Billing metadata is optional and should never block account creation.
  const { error: roleError } = await supabase
    .from("user_roles")
    .insert({
      user_id: authData.user.id,
      role: "coach",
    })

  if (roleError) {
    // Clean up auth user if role insert fails
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: `Failed to assign coach role: ${roleError.message} (code: ${roleError.code})` }, { status: 500 })
  }

  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_COACH_PRICE_ID) {
    try {
      const stripeCustomerId = await createStripeCustomer(email, name)
      const stripeSubscriptionId = await createTrialSubscription(stripeCustomerId)

      const { error: billingError } = await supabase
        .from("user_roles")
        .update({
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          stripe_subscription_status: "trialing",
        })
        .eq("user_id", authData.user.id)

      if (billingError && !isMissingColumnError(billingError)) {
        return NextResponse.json(
          { error: `Failed to save billing state: ${billingError.message} (code: ${billingError.code})` },
          { status: 500 }
        )
      }
    } catch {
      // Non-fatal — coach can still use the platform even if Stripe setup is unavailable.
    }
  }

  const { error: settingsError } = await supabase
    .from("admin_settings")
    .upsert(
      {
        user_id: authData.user.id,
        display_name: name,
        coach_type_preset: preset,
        active_modules: seedModulesForPreset(preset),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )

  if (settingsError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json(
      { error: `Failed to create coach settings: ${settingsError.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
