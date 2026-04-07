import { NextResponse } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { createAdmin } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe"

export async function POST() {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user } = result

  const admin = createAdmin()
  const { data: role } = await admin
    .from("user_roles")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single()

  if (!role?.stripe_customer_id) {
    return NextResponse.json({ error: "No Stripe customer found" }, { status: 400 })
  }

  const session = await getStripe().checkout.sessions.create({
    customer: role.stripe_customer_id,
    mode: "setup",
    payment_method_types: ["card"],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing?payment=added`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing`,
  })

  return NextResponse.json({ url: session.url })
}
