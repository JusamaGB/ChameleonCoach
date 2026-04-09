import { redirect } from "next/navigation"
import { createAdmin, createClient } from "@/lib/supabase/server"
import { getCoachPaymentsDashboardData } from "@/lib/coach-payments"
import { PaymentsManager } from "@/components/admin/payments-manager"

export const dynamic = "force-dynamic"

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const admin = createAdmin()
  const { account, clients, invoices } = await getCoachPaymentsDashboardData(admin, user.id)
  const params = await searchParams

  const prefillClientId = typeof params.client_id === "string" ? params.client_id : ""
  const prefillAmount = typeof params.amount === "string" ? params.amount : ""
  const prefillDescription = typeof params.description === "string" ? params.description : ""
  const prefillAppointmentId =
    typeof params.source_appointment_id === "string" ? params.source_appointment_id : ""

  return (
    <PaymentsManager
      initialAccount={account}
      clients={clients}
      initialInvoices={invoices}
      initialForm={{
        client_id: prefillClientId,
        description: prefillDescription,
        source_appointment_id: prefillAppointmentId,
        items: prefillAmount
          ? [{ label: "Session payment", description: "", quantity: "1", unit_amount_major: prefillAmount }]
          : undefined,
      }}
    />
  )
}
