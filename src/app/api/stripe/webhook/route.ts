import { NextResponse, type NextRequest } from "next/server"
import { getStripe } from "@/lib/stripe"
import { createAdmin } from "@/lib/supabase/server"
import type Stripe from "stripe"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = createAdmin()

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription
    await supabase
      .from("user_roles")
      .update({
        stripe_subscription_status: subscription.status,
        stripe_subscription_id: subscription.id,
        subscription_ends_at: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
      })
      .eq("stripe_customer_id", subscription.customer as string)
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice
    await supabase
      .from("user_roles")
      .update({ stripe_subscription_status: "past_due" })
      .eq("stripe_customer_id", invoice.customer as string)
  }

  return NextResponse.json({ received: true })
}
