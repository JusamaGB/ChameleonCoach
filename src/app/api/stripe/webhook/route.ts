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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const appointmentId = session.metadata?.appointment_id

    if (appointmentId && session.mode === "payment") {
      await supabase
        .from("appointments")
        .update({
          payment_status: "paid",
          payment_paid_at: new Date().toISOString(),
          payment_failed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", appointmentId)
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session
    const appointmentId = session.metadata?.appointment_id

    if (appointmentId && session.mode === "payment") {
      await supabase
        .from("appointments")
        .update({
          payment_status: "payment_failed",
          payment_failed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", appointmentId)
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    const appointmentId = paymentIntent.metadata?.appointment_id

    if (appointmentId) {
      await supabase
        .from("appointments")
        .update({
          payment_status: "payment_failed",
          payment_failed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", appointmentId)
    }
  }

  return NextResponse.json({ received: true })
}
