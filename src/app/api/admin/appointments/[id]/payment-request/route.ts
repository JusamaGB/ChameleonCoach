import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { getStripe } from "@/lib/stripe"
import { sendAppointmentPaymentRequestEmail } from "@/lib/resend"

const DEFAULT_CURRENCY = "gbp"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { supabase } = result

  const { id } = await params
  const body = await request.json()
  const amount = Number(body.amount)
  const currency = typeof body.currency === "string" ? body.currency.toLowerCase() : DEFAULT_CURRENCY

  if (!Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: "A positive amount in minor units is required" }, { status: 400 })
  }

  const { data: appointment, error } = await supabase
    .from("appointments")
    .select(`
      id,
      status,
      confirmed_at,
      duration_minutes,
      clients (
        name,
        email
      )
    `)
    .eq("id", id)
    .single()

  if (error || !appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
  }

  const client = Array.isArray(appointment.clients) ? appointment.clients[0] : appointment.clients

  if (appointment.status !== "confirmed" || !appointment.confirmed_at) {
    return NextResponse.json({ error: "Only confirmed appointments can be billed" }, { status: 400 })
  }

  if (!client?.email) {
    return NextResponse.json({ error: "Client email is required to send a payment request" }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const stripe = getStripe()
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: client.email,
    success_url: `${appUrl}/appointments?payment=success`,
    cancel_url: `${appUrl}/appointments?payment=cancelled`,
    metadata: {
      appointment_id: appointment.id,
      payment_kind: "appointment_session",
    },
    payment_intent_data: {
      metadata: {
        appointment_id: appointment.id,
        payment_kind: "appointment_session",
      },
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amount,
          product_data: {
            name: "Session payment",
            description: `Confirmed for ${new Date(appointment.confirmed_at).toLocaleString("en-GB", {
              dateStyle: "medium",
              timeStyle: "short",
            })}`,
          },
        },
      },
    ],
  })

  if (!session.url) {
    return NextResponse.json({ error: "Stripe did not return a hosted checkout URL" }, { status: 500 })
  }

  const paymentRequestedAt = new Date().toISOString()
  await supabase
    .from("appointments")
    .update({
      session_price_amount: amount,
      session_price_currency: currency,
      payment_status: "payment_requested",
      payment_requested_at: paymentRequestedAt,
      payment_checkout_session_id: session.id,
      payment_checkout_url: session.url,
      payment_checkout_expires_at: session.expires_at
        ? new Date(session.expires_at * 1000).toISOString()
        : null,
      payment_paid_at: null,
      payment_failed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", appointment.id)

  let emailSent = true
  try {
    await sendAppointmentPaymentRequestEmail(
      client.email,
      client.name || "there",
      appointment.confirmed_at,
      amount,
      currency,
      session.url
    )
  } catch {
    emailSent = false
  }

  return NextResponse.json({ ok: true, emailSent, url: session.url })
}
