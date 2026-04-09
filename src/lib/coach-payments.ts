import Stripe from "stripe"
import { getStripe } from "@/lib/stripe"
import { PLATFORM_NAME } from "@/lib/platform"
import { findClientByIdForCoach, listClientsForCoach } from "@/lib/clients"

type SupabaseLike = {
  from: (table: string) => any
}

export type InvoiceItemInput = {
  label: string
  description?: string | null
  quantity: number
  unit_amount: number
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
}

function connectCountry() {
  return process.env.STRIPE_CONNECT_COUNTRY || "GB"
}

function normalizeCurrency(value: string | null | undefined) {
  const currency = String(value || "gbp").trim().toLowerCase()
  return currency.length === 3 ? currency : "gbp"
}

function normalizeInvoiceStatus(status: string | null | undefined) {
  switch (status) {
    case "paid":
      return "paid" as const
    case "void":
      return "void" as const
    case "uncollectible":
      return "uncollectible" as const
    case "open":
      return "open" as const
    default:
      return "draft" as const
  }
}

function dueDateToUnix(dateValue: string | null | undefined) {
  if (!dateValue) return null
  const date = new Date(`${dateValue}T23:59:59`)
  const time = date.getTime()
  if (!Number.isFinite(time)) return null
  return Math.floor(time / 1000)
}

function stripeAccountOptions(stripeAccountId: string): Stripe.RequestOptions {
  return { stripeAccount: stripeAccountId }
}

export async function getCoachPaymentAccount(
  supabase: SupabaseLike,
  coachId: string
) {
  return supabase
    .from("coach_payment_accounts")
    .select("*")
    .eq("coach_id", coachId)
    .maybeSingle()
}

export async function syncCoachPaymentAccountStatus(
  supabase: SupabaseLike,
  coachId: string,
  stripeAccountId: string
) {
  const stripe = getStripe()
  const account = await stripe.accounts.retrieve(stripeAccountId)
  const payload = {
    coach_id: coachId,
    stripe_account_id: account.id,
    account_type: "express",
    onboarding_completed: Boolean(account.details_submitted),
    details_submitted: Boolean(account.details_submitted),
    charges_enabled: Boolean(account.charges_enabled),
    payouts_enabled: Boolean(account.payouts_enabled),
    default_currency: account.default_currency || "gbp",
    country: account.country || connectCountry(),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("coach_payment_accounts")
    .upsert(payload, { onConflict: "coach_id" })
    .select("*")
    .single()

  if (error) throw error
  return data
}

export async function ensureCoachPaymentAccount(
  supabase: SupabaseLike,
  coach: {
    id: string
    email: string | null | undefined
    displayName?: string | null
    businessName?: string | null
  }
) {
  const existing = await getCoachPaymentAccount(supabase, coach.id)
  if (existing.data?.stripe_account_id) {
    return syncCoachPaymentAccountStatus(supabase, coach.id, existing.data.stripe_account_id)
  }

  const stripe = getStripe()
  const account = await stripe.accounts.create({
    type: "express",
    country: connectCountry(),
    email: coach.email || undefined,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: {
      name: coach.businessName || coach.displayName || PLATFORM_NAME,
      product_description: "Coaching payments and invoices",
    },
    metadata: {
      coach_id: coach.id,
      platform: PLATFORM_NAME,
    },
  })

  return syncCoachPaymentAccountStatus(supabase, coach.id, account.id)
}

export async function createCoachOnboardingLink(
  supabase: SupabaseLike,
  coach: {
    id: string
    email: string | null | undefined
    displayName?: string | null
    businessName?: string | null
  }
) {
  const account = await ensureCoachPaymentAccount(supabase, coach)
  const stripe = getStripe()
  const link = await stripe.accountLinks.create({
    account: account.stripe_account_id,
    refresh_url: `${appUrl()}/admin/payments?connect=refresh`,
    return_url: `${appUrl()}/admin/payments?connect=return`,
    type: "account_onboarding",
  })

  await supabase
    .from("coach_payment_accounts")
    .update({
      last_account_link_url: link.url,
      last_account_link_expires_at: link.expires_at
        ? new Date(link.expires_at * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("coach_id", coach.id)

  return { account, url: link.url }
}

export async function createCoachDashboardLoginLink(
  supabase: SupabaseLike,
  coachId: string
) {
  const { data: account } = await getCoachPaymentAccount(supabase, coachId)
  if (!account?.stripe_account_id) {
    throw new Error("Stripe payments are not connected yet.")
  }

  const stripe = getStripe()
  const link = await stripe.accounts.createLoginLink(account.stripe_account_id)
  return link.url
}

export async function ensureCoachClientPaymentCustomer(
  supabase: SupabaseLike,
  {
    coachId,
    clientId,
    stripeAccountId,
    clientName,
    clientEmail,
  }: {
    coachId: string
    clientId: string
    stripeAccountId: string
    clientName: string
    clientEmail: string
  }
) {
  const existing = await supabase
    .from("coach_client_payment_customers")
    .select("*")
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .maybeSingle()

  if (existing.data?.stripe_customer_id && existing.data.stripe_account_id === stripeAccountId) {
    return existing.data
  }

  const stripe = getStripe()
  const customer = await stripe.customers.create(
    {
      email: clientEmail,
      name: clientName,
      metadata: {
        coach_id: coachId,
        client_id: clientId,
      },
    },
    stripeAccountOptions(stripeAccountId)
  )

  const { data, error } = await supabase
    .from("coach_client_payment_customers")
    .upsert(
      {
        coach_id: coachId,
        client_id: clientId,
        stripe_account_id: stripeAccountId,
        stripe_customer_id: customer.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "coach_id,client_id" }
    )
    .select("*")
    .single()

  if (error) throw error
  return data
}

export async function createCoachInvoice(
  supabase: SupabaseLike,
  {
    coachId,
    clientId,
    currency,
    dueDate,
    description,
    internalNote,
    sourceAppointmentId,
    items,
  }: {
    coachId: string
    clientId: string
    currency?: string | null
    dueDate?: string | null
    description?: string | null
    internalNote?: string | null
    sourceAppointmentId?: string | null
    items: InvoiceItemInput[]
  }
) {
  if (!items.length) {
    throw new Error("Add at least one invoice item.")
  }

  const { data: account } = await getCoachPaymentAccount(supabase, coachId)
  if (!account?.stripe_account_id) {
    throw new Error("Connect Stripe before creating invoices.")
  }
  if (!account.charges_enabled || !account.payouts_enabled) {
    throw new Error("Finish Stripe onboarding before sending invoices.")
  }

  const { data: client, error: clientError } = await findClientByIdForCoach(
    supabase,
    coachId,
    clientId,
    "id, name, email"
  )
  if (clientError || !client) {
    throw new Error("Client not found.")
  }
  if (!client.email) {
    throw new Error("Client email is required before sending an invoice.")
  }

  const normalizedItems = items.map((item, index) => {
    const label = String(item.label || "").trim()
    const quantity = Math.max(1, Number(item.quantity) || 1)
    const unitAmount = Number(item.unit_amount)

    if (!label) {
      throw new Error(`Invoice item ${index + 1} needs a label.`)
    }
    if (!Number.isInteger(unitAmount) || unitAmount <= 0) {
      throw new Error(`Invoice item ${index + 1} needs a positive amount in minor units.`)
    }

    return {
      label,
      description: item.description?.trim() || null,
      quantity,
      unit_amount: unitAmount,
      sort_order: index,
    }
  })

  const subtotal = normalizedItems.reduce((sum, item) => sum + item.quantity * item.unit_amount, 0)
  const invoiceCurrency = normalizeCurrency(currency || account.default_currency)
  const customer = await ensureCoachClientPaymentCustomer(supabase, {
    coachId,
    clientId,
    stripeAccountId: account.stripe_account_id,
    clientName: client.name,
    clientEmail: client.email,
  })

  const { data: createdInvoice, error: invoiceInsertError } = await supabase
    .from("client_invoices")
    .insert({
      coach_id: coachId,
      client_id: clientId,
      stripe_account_id: account.stripe_account_id,
      stripe_customer_id: customer.stripe_customer_id,
      status: "draft",
      currency: invoiceCurrency,
      subtotal_amount: subtotal,
      total_amount: subtotal,
      due_date: dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : null,
      description: description?.trim() || null,
      internal_note: internalNote?.trim() || null,
      source_appointment_id: sourceAppointmentId || null,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single()

  if (invoiceInsertError || !createdInvoice) {
    throw invoiceInsertError ?? new Error("Failed to create invoice record.")
  }

  const { error: itemInsertError } = await supabase
    .from("client_invoice_items")
    .insert(
      normalizedItems.map((item) => ({
        invoice_id: createdInvoice.id,
        ...item,
      }))
    )

  if (itemInsertError) {
    await supabase.from("client_invoices").delete().eq("id", createdInvoice.id)
    throw itemInsertError
  }

  const stripe = getStripe()

  try {
    for (const item of normalizedItems) {
      await stripe.invoiceItems.create(
        {
          customer: customer.stripe_customer_id,
          currency: invoiceCurrency,
          quantity: item.quantity,
          unit_amount: item.unit_amount,
          description: item.description ? `${item.label} - ${item.description}` : item.label,
          metadata: {
            app_invoice_id: createdInvoice.id,
            coach_id: coachId,
            client_id: clientId,
          },
        },
        stripeAccountOptions(account.stripe_account_id)
      )
    }

    const dueDateUnix = dueDateToUnix(dueDate)
    const draftInvoice = await stripe.invoices.create(
      {
        customer: customer.stripe_customer_id,
        collection_method: "send_invoice",
        ...(dueDateUnix ? { due_date: dueDateUnix } : { days_until_due: 7 }),
        description: description?.trim() || undefined,
        metadata: {
          app_invoice_id: createdInvoice.id,
          coach_id: coachId,
          client_id: clientId,
          payment_kind: "coach_invoice",
          source_appointment_id: sourceAppointmentId || "",
        },
      },
      stripeAccountOptions(account.stripe_account_id)
    )

    const finalized = await stripe.invoices.finalizeInvoice(
      draftInvoice.id,
      {},
      stripeAccountOptions(account.stripe_account_id)
    )
    const sent = await stripe.invoices.sendInvoice(
      finalized.id,
      {},
      stripeAccountOptions(account.stripe_account_id)
    )

    const { data, error } = await supabase
      .from("client_invoices")
      .update({
        stripe_invoice_id: sent.id,
        stripe_invoice_number: sent.number ?? null,
        stripe_hosted_invoice_url: sent.hosted_invoice_url ?? null,
        stripe_invoice_pdf_url: sent.invoice_pdf ?? null,
        status: normalizeInvoiceStatus(sent.status),
        subtotal_amount: sent.subtotal ?? subtotal,
        total_amount: sent.total ?? subtotal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", createdInvoice.id)
      .select("*")
      .single()

    if (error || !data) {
      throw error ?? new Error("Failed to save Stripe invoice metadata.")
    }

    return data
  } catch (error) {
    await supabase.from("client_invoices").delete().eq("id", createdInvoice.id)
    throw error
  }
}

export async function voidCoachInvoice(
  supabase: SupabaseLike,
  coachId: string,
  invoiceId: string
) {
  const { data: invoice, error } = await supabase
    .from("client_invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("coach_id", coachId)
    .maybeSingle()

  if (error || !invoice) {
    throw new Error("Invoice not found.")
  }
  if (!invoice.stripe_invoice_id) {
    throw new Error("Invoice is not linked to Stripe.")
  }

  const stripe = getStripe()
  const voided = await stripe.invoices.voidInvoice(
    invoice.stripe_invoice_id,
    {},
    stripeAccountOptions(invoice.stripe_account_id)
  )

  await supabase
    .from("client_invoices")
    .update({
      status: normalizeInvoiceStatus(voided.status),
      stripe_hosted_invoice_url: voided.hosted_invoice_url ?? invoice.stripe_hosted_invoice_url,
      stripe_invoice_pdf_url: voided.invoice_pdf ?? invoice.stripe_invoice_pdf_url,
      voided_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoice.id)

  return voided
}

export async function syncInvoiceFromStripeEvent(
  supabase: SupabaseLike,
  invoice: Stripe.Invoice,
  stripeAccountId: string
) {
  const appInvoiceId = invoice.metadata?.app_invoice_id
  const updatePayload = {
    stripe_account_id: stripeAccountId,
    stripe_customer_id: typeof invoice.customer === "string" ? invoice.customer : null,
    stripe_invoice_id: invoice.id,
    stripe_invoice_number: invoice.number ?? null,
    stripe_hosted_invoice_url: invoice.hosted_invoice_url ?? null,
    stripe_invoice_pdf_url: invoice.invoice_pdf ?? null,
    status: normalizeInvoiceStatus(invoice.status),
    subtotal_amount: invoice.subtotal ?? 0,
    total_amount: invoice.total ?? 0,
    currency: normalizeCurrency(invoice.currency),
    due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
    description: invoice.description ?? null,
    paid_at: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      : null,
    voided_at: invoice.status === "void" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }

  if (appInvoiceId) {
    await supabase
      .from("client_invoices")
      .update(updatePayload)
      .eq("id", appInvoiceId)
    return
  }

  await supabase
    .from("client_invoices")
    .update(updatePayload)
    .eq("stripe_invoice_id", invoice.id)
}

export async function getCoachPaymentsDashboardData(
  supabase: SupabaseLike,
  coachId: string
) {
  const [{ data: account }, clientQuery, invoiceQuery] = await Promise.all([
    getCoachPaymentAccount(supabase, coachId),
    listClientsForCoach(supabase, coachId),
    supabase
      .from("client_invoices")
      .select(`
        *,
        clients (
          id,
          name,
          email
        ),
        client_invoice_items (
          *
        )
      `)
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false }),
  ])

  return {
    account: account ?? null,
    clients: clientQuery.data ?? [],
    invoices: invoiceQuery.data ?? [],
  }
}
