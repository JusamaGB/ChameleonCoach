"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { Input, TextArea, Select } from "@/components/ui/input"
import type { Client, ClientInvoice, CoachPaymentAccount } from "@/types"

type InvoiceRecord = ClientInvoice & {
  clients?: { id: string; name: string; email: string } | null
  client_invoice_items?: Array<{
    id: string
    label: string
    description: string | null
    quantity: number
    unit_amount: number
  }>
}

type InvoiceFormState = {
  client_id: string
  currency: string
  due_date: string
  description: string
  internal_note: string
  source_appointment_id: string
  items: Array<{
    label: string
    description: string
    quantity: string
    unit_amount_major: string
  }>
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

function accountBadge(account: CoachPaymentAccount | null) {
  if (!account) return <Badge variant="warning">Not connected</Badge>
  if (account.charges_enabled && account.payouts_enabled) {
    return <Badge variant="success">Ready to accept payments</Badge>
  }
  if (account.details_submitted) {
    return <Badge variant="warning">Stripe review in progress</Badge>
  }
  return <Badge variant="warning">Onboarding incomplete</Badge>
}

function invoiceBadge(status: InvoiceRecord["status"]) {
  switch (status) {
    case "paid":
      return <Badge variant="success">Paid</Badge>
    case "open":
      return <Badge variant="warning">Open</Badge>
    case "void":
      return <Badge>Voided</Badge>
    case "uncollectible":
      return <Badge>Uncollectible</Badge>
    default:
      return <Badge>Draft</Badge>
  }
}

export function PaymentsManager({
  initialAccount,
  clients,
  initialInvoices,
  initialForm,
}: {
  initialAccount: CoachPaymentAccount | null
  clients: Client[]
  initialInvoices: InvoiceRecord[]
  initialForm: Partial<InvoiceFormState>
}) {
  const router = useRouter()
  const [account, setAccount] = useState<CoachPaymentAccount | null>(initialAccount)
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(initialInvoices)
  const [loadingConnect, setLoadingConnect] = useState(false)
  const [loadingDashboard, setLoadingDashboard] = useState(false)
  const [refreshingAccount, setRefreshingAccount] = useState(false)
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [voidingInvoiceId, setVoidingInvoiceId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [form, setForm] = useState<InvoiceFormState>({
    client_id: initialForm.client_id ?? "",
    currency: initialForm.currency ?? (initialAccount?.default_currency ?? "gbp"),
    due_date: initialForm.due_date ?? "",
    description: initialForm.description ?? "",
    internal_note: initialForm.internal_note ?? "",
    source_appointment_id: initialForm.source_appointment_id ?? "",
    items:
      initialForm.items && initialForm.items.length > 0
        ? initialForm.items
        : [{ label: "", description: "", quantity: "1", unit_amount_major: "" }],
  })

  const clientOptions = useMemo(
    () =>
      clients.map((client) => ({
        value: client.id,
        label: `${client.name} (${client.email})`,
      })),
    [clients]
  )

  async function beginStripeOnboarding() {
    setLoadingConnect(true)
    setError("")
    try {
      const res = await fetch("/api/payments/connect/onboarding", { method: "POST" })
      const data = await res.json()
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to open Stripe onboarding")
      }
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open Stripe onboarding")
      setLoadingConnect(false)
    }
  }

  async function openStripeDashboard() {
    setLoadingDashboard(true)
    setError("")
    try {
      const res = await fetch("/api/payments/connect/dashboard", { method: "POST" })
      const data = await res.json()
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to open Stripe dashboard")
      }
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open Stripe dashboard")
      setLoadingDashboard(false)
    }
  }

  async function refreshAccount() {
    setRefreshingAccount(true)
    setError("")
    try {
      const res = await fetch("/api/payments/account", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to refresh Stripe account state")
      }
      setAccount(data.account ?? null)
      setSuccess("Stripe account status refreshed")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh Stripe account state")
    } finally {
      setRefreshingAccount(false)
    }
  }

  function updateItem(index: number, field: keyof InvoiceFormState["items"][number], value: string) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { label: "", description: "", quantity: "1", unit_amount_major: "" }],
    }))
  }

  function removeItem(index: number) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  async function createInvoice(event: React.FormEvent) {
    event.preventDefault()
    setCreatingInvoice(true)
    setError("")
    setSuccess("")

    try {
      const payload = {
        client_id: form.client_id,
        currency: form.currency,
        due_date: form.due_date || null,
        description: form.description || null,
        internal_note: form.internal_note || null,
        source_appointment_id: form.source_appointment_id || null,
        items: form.items.map((item) => ({
          label: item.label,
          description: item.description || null,
          quantity: Number(item.quantity || 1),
          unit_amount: Math.round(Number(item.unit_amount_major || 0) * 100),
        })),
      }

      const res = await fetch("/api/payments/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to create invoice")
      }

      setSuccess("Invoice created and sent via Stripe")
      setForm({
        client_id: "",
        currency: account?.default_currency ?? "gbp",
        due_date: "",
        description: "",
        internal_note: "",
        source_appointment_id: "",
        items: [{ label: "", description: "", quantity: "1", unit_amount_major: "" }],
      })
      router.refresh()
      if (data.invoice) {
        setInvoices((prev) => [data.invoice, ...prev])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice")
    } finally {
      setCreatingInvoice(false)
    }
  }

  async function voidInvoice(invoiceId: string) {
    setVoidingInvoiceId(invoiceId)
    setError("")
    setSuccess("")
    try {
      const res = await fetch(`/api/payments/invoices/${invoiceId}/void`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Failed to void invoice")
      }
      setSuccess("Invoice voided")
      router.refresh()
      setInvoices((prev) =>
        prev.map((invoice) =>
          invoice.id === invoiceId ? { ...invoice, status: "void", voided_at: new Date().toISOString() } : invoice
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to void invoice")
    } finally {
      setVoidingInvoiceId(null)
    }
  }

  const paymentsReady = Boolean(account?.charges_enabled && account?.payouts_enabled)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-gf-muted">
            Coach payments stay separate from Chameleon platform billing. Clients pay you here; you pay Chameleon from <Link href="/admin/billing" className="text-gf-pink hover:text-gf-pink-light">Billing</Link>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={refreshAccount} disabled={refreshingAccount}>
            {refreshingAccount ? "Refreshing..." : "Refresh Stripe status"}
          </Button>
          {account ? (
            <Button variant="secondary" size="sm" onClick={openStripeDashboard} disabled={loadingDashboard}>
              {loadingDashboard ? "Opening..." : "Open Stripe dashboard"}
            </Button>
          ) : null}
          <Button size="sm" onClick={beginStripeOnboarding} disabled={loadingConnect}>
            {loadingConnect ? "Redirecting..." : account ? "Finish Stripe onboarding" : "Connect Stripe"}
          </Button>
        </div>
      </div>

      {error ? <Card className="border-yellow-500/30"><p className="text-sm text-yellow-300">{error}</p></Card> : null}
      {success ? <Card className="border-green-500/30"><p className="text-sm text-green-400">{success}</p></Card> : null}

      <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Coach Payments Account</CardTitle>
              <p className="mt-2 text-sm text-gf-muted">
                This Stripe account is only for client-to-coach payments and invoices.
              </p>
            </div>
            {accountBadge(account)}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
              <p className="text-xs uppercase tracking-wide text-gf-muted">Charges</p>
              <p className="mt-2 text-sm font-medium">{account?.charges_enabled ? "Enabled" : "Not enabled"}</p>
            </div>
            <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
              <p className="text-xs uppercase tracking-wide text-gf-muted">Payouts</p>
              <p className="mt-2 text-sm font-medium">{account?.payouts_enabled ? "Enabled" : "Not enabled"}</p>
            </div>
            <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
              <p className="text-xs uppercase tracking-wide text-gf-muted">Currency</p>
              <p className="mt-2 text-sm font-medium">{(account?.default_currency ?? "gbp").toUpperCase()}</p>
            </div>
            <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
              <p className="text-xs uppercase tracking-wide text-gf-muted">Country</p>
              <p className="mt-2 text-sm font-medium">{account?.country ?? "GB"}</p>
            </div>
          </div>
          {!paymentsReady ? (
            <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm text-yellow-200">
              Finish Stripe onboarding before you try to send invoices. Platform billing remains separate in <Link href="/admin/billing" className="text-gf-pink hover:text-gf-pink-light">Billing</Link>.
            </div>
          ) : null}
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Create Invoice</CardTitle>
              <p className="mt-2 text-sm text-gf-muted">
                Stripe will send the hosted invoice page to the client after creation.
              </p>
            </div>
            {!paymentsReady ? <Badge variant="warning">Connect Stripe first</Badge> : null}
          </div>

          <form onSubmit={createInvoice} className="mt-5 space-y-4">
            <Select
              label="Client"
              options={clientOptions}
              value={form.client_id}
              onChange={(e) => setForm((prev) => ({ ...prev, client_id: e.target.value }))}
              disabled={!paymentsReady}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Currency"
                value={form.currency}
                onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value.toLowerCase() }))}
                placeholder="gbp"
                disabled={!paymentsReady}
              />
              <Input
                label="Due Date"
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
                disabled={!paymentsReady}
              />
            </div>
            <Input
              label="Description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="e.g. April coaching invoice"
              disabled={!paymentsReady}
            />
            <Input
              label="Source Appointment ID (optional)"
              value={form.source_appointment_id}
              onChange={(e) => setForm((prev) => ({ ...prev, source_appointment_id: e.target.value }))}
              placeholder="Optional appointment link"
              disabled={!paymentsReady}
            />
            <TextArea
              label="Internal Note"
              value={form.internal_note}
              onChange={(e) => setForm((prev) => ({ ...prev, internal_note: e.target.value }))}
              placeholder="Visible to you only"
              disabled={!paymentsReady}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">Line items</p>
                <Button type="button" size="sm" variant="secondary" onClick={addItem} disabled={!paymentsReady}>
                  Add item
                </Button>
              </div>
              {form.items.map((item, index) => (
                <div key={index} className="rounded-xl border border-gf-border bg-gf-surface p-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label="Label"
                      value={item.label}
                      onChange={(e) => updateItem(index, "label", e.target.value)}
                      placeholder="Coaching session"
                      disabled={!paymentsReady}
                    />
                    <Input
                      label="Amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_amount_major}
                      onChange={(e) => updateItem(index, "unit_amount_major", e.target.value)}
                      placeholder="75.00"
                      disabled={!paymentsReady}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[0.5fr,1fr,auto]">
                    <Input
                      label="Qty"
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      disabled={!paymentsReady}
                    />
                    <Input
                      label="Description"
                      value={item.description}
                      onChange={(e) => updateItem(index, "description", e.target.value)}
                      placeholder="Optional details"
                      disabled={!paymentsReady}
                    />
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => removeItem(index)}
                        disabled={form.items.length === 1 || !paymentsReady}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gf-muted">
                Platform subscription billing is separate and managed from <Link href="/admin/billing" className="text-gf-pink hover:text-gf-pink-light">Billing</Link>.
              </p>
              <Button type="submit" disabled={!paymentsReady || creatingInvoice}>
                {creatingInvoice ? "Creating..." : "Create & Send Invoice"}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Invoices</CardTitle>
            <p className="mt-2 text-sm text-gf-muted">
              Client invoices created through your connected Stripe account.
            </p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <p className="mt-5 text-sm text-gf-muted">No invoices yet.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-xl border border-gf-border bg-gf-surface p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{invoice.clients?.name ?? "Unknown client"}</p>
                      {invoiceBadge(invoice.status)}
                      {invoice.source_appointment_id ? <Badge>Appointment-linked</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-gf-muted">{invoice.clients?.email ?? "No email"}</p>
                    {invoice.description ? <p className="mt-2 text-sm">{invoice.description}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-gf-muted">
                      <span>Total {formatMoney(invoice.total_amount, invoice.currency)}</span>
                      {invoice.due_date ? <span>Due {new Date(invoice.due_date).toLocaleDateString("en-GB")}</span> : null}
                      {invoice.paid_at ? <span>Paid {new Date(invoice.paid_at).toLocaleDateString("en-GB")}</span> : null}
                    </div>
                    {invoice.client_invoice_items?.length ? (
                      <div className="mt-3 text-xs text-gf-muted">
                        {invoice.client_invoice_items.map((item) => (
                          <p key={item.id}>
                            {item.quantity} x {item.label} ({formatMoney(item.quantity * item.unit_amount, invoice.currency)})
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {invoice.stripe_hosted_invoice_url ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => window.open(invoice.stripe_hosted_invoice_url || "", "_blank", "noopener,noreferrer")}
                      >
                        Open invoice
                      </Button>
                    ) : null}
                    {(invoice.status === "draft" || invoice.status === "open") ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => voidInvoice(invoice.id)}
                        disabled={voidingInvoiceId === invoice.id}
                      >
                        {voidingInvoiceId === invoice.id ? "Voiding..." : "Void invoice"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
