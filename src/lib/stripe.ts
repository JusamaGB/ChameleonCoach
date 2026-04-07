import Stripe from "stripe"

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2023-10-16",
    })
  }
  return stripeInstance
}

export async function createStripeCustomer(email: string, name: string): Promise<string> {
  const stripe = getStripe()
  const customer = await stripe.customers.create({ email, name })
  return customer.id
}

export async function createTrialSubscription(customerId: string): Promise<string> {
  const stripe = getStripe()
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: process.env.STRIPE_COACH_PRICE_ID! }],
    trial_period_days: 14,
    payment_settings: {
      save_default_payment_method: "on_subscription",
    },
  })
  return subscription.id
}
