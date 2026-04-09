import { createClient } from "@/lib/supabase/server"
import { createAdmin } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BillingActions } from "@/components/admin/billing-actions"
import { getStripe } from "@/lib/stripe"
import Stripe from "stripe"
import Link from "next/link"

export const dynamic = "force-dynamic"

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function statusBadge(status: string | null) {
  switch (status) {
    case "trialing":
      return <Badge variant="warning">Trial</Badge>
    case "active":
      return <Badge variant="success">Active</Badge>
    case "past_due":
      return <Badge variant="default">Past Due</Badge>
    case "canceled":
      return <Badge variant="default">Cancelled</Badge>
    default:
      return <Badge variant="default">{status ?? "Unknown"}</Badge>
  }
}

async function getPlanName(subscriptionId: string | null): Promise<string> {
  if (!subscriptionId) return "Coach Monthly"
  try {
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price.product"],
    })
    const product = subscription.items.data[0]?.price?.product as Stripe.Product | undefined
    return product?.name ?? "Coach Monthly"
  } catch {
    return "Coach Monthly"
  }
}

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const admin = createAdmin()
  const { data: role } = await admin
    .from("user_roles")
    .select("stripe_subscription_status, stripe_subscription_id, trial_ends_at, subscription_ends_at")
    .eq("user_id", user.id)
    .single()

  const status = role?.stripe_subscription_status ?? "trialing"
  const trialEnds = role?.trial_ends_at ?? null
  const subEnds = role?.subscription_ends_at ?? null
  const planName = await getPlanName(role?.stripe_subscription_id ?? null)

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Billing</h1>
      <p className="mb-6 text-sm text-gf-muted">
        This page is only for your Chameleon platform subscription. Client-to-coach invoices and payments live in <Link href="/admin/payments" className="text-gf-pink hover:text-gf-pink-light">Payments</Link>.
      </p>

      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gf-muted text-sm">Plan</span>
            <span className="font-medium">{planName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gf-muted text-sm">Status</span>
            {statusBadge(status)}
          </div>
          {status === "trialing" && trialEnds && (
            <div className="flex items-center justify-between">
              <span className="text-gf-muted text-sm">Trial ends</span>
              <span className="text-sm">{formatDate(trialEnds)}</span>
            </div>
          )}
          {subEnds && status !== "trialing" && (
            <div className="flex items-center justify-between">
              <span className="text-gf-muted text-sm">
                {status === "active" ? "Renews" : "Access until"}
              </span>
              <span className="text-sm">{formatDate(subEnds)}</span>
            </div>
          )}
        </div>
      </Card>

      <div className="mt-6">
        <BillingActions status={status} />
      </div>
    </div>
  )
}
