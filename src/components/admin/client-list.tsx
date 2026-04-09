"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardTitle } from "@/components/ui/card"
import { UserPlus, Search, ArrowRight, CalendarDays, FileText } from "lucide-react"
import type { Client } from "@/types"

interface ClientListProps {
  clients: Client[]
}

type SortKey = "name" | "created_at" | "status"

export function ClientList({ clients }: ClientListProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<SortKey>("created_at")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState("")

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    )
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name)
    if (sortBy === "status") {
      const statusOrder = (c: Client) =>
        c.onboarding_completed ? 0 : c.invite_accepted_at ? 1 : 2
      return statusOrder(a) - statusOrder(b)
    }
    // created_at desc
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  function formatCreatedAt(value: string) {
    return new Date(value).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  function provisioningBadge(client: Client) {
    switch (client.provisioning_status) {
      case "ready":
        return <Badge variant="success">Workspace ready</Badge>
      case "provisioning":
        return <Badge variant="warning">Provisioning</Badge>
      case "failed":
        return <Badge variant="warning">Needs repair</Badge>
      default:
        return <Badge>Awaiting setup</Badge>
    }
  }

  async function revokeInvite(client: Client) {
    setBusyId(client.id)
    setActionError("")

    try {
      const response = await fetch(`/api/admin/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invite_token: null,
          invite_expires_at: null,
          invite_accepted_at: null,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to revoke invite")
      }

      router.refresh()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to revoke invite")
    } finally {
      setBusyId(null)
    }
  }

  async function deleteClient(client: Client) {
    if (!confirm(`Delete ${client.name}? This cannot be undone.`)) {
      return
    }

    setBusyId(client.id)
    setActionError("")

    try {
      const response = await fetch(`/api/admin/clients/${client.id}`, {
        method: "DELETE",
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete client")
      }

      router.refresh()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to delete client")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <CardTitle>Clients</CardTitle>
        <Link
          href="/admin/invite"
          className="flex items-center gap-1.5 text-sm text-gf-pink hover:text-gf-pink-light transition-colors"
        >
          <UserPlus size={16} />
          Invite
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gf-muted"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="w-full bg-gf-surface border border-gf-border rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-gf-muted/50 focus:outline-none focus:border-gf-pink focus:ring-1 focus:ring-gf-pink/30"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="bg-gf-surface border border-gf-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gf-pink"
        >
          <option value="created_at">Newest</option>
          <option value="name">Name</option>
          <option value="status">Status</option>
        </select>
      </div>

      {actionError ? <p className="mb-4 text-sm text-red-400">{actionError}</p> : null}

      {sorted.length === 0 ? (
        <p className="text-sm text-gf-muted py-4">
          {clients.length === 0 ? (
            <>
              No clients yet.{" "}
              <Link href="/admin/invite" className="text-gf-pink hover:underline">
                Send your first invite
              </Link>
            </>
          ) : (
            "No clients match your search."
          )}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sorted.map((client) => (
            <div
              key={client.id}
              className="rounded-xl border border-gf-border bg-gf-black/30 p-4 transition-colors hover:border-gf-pink/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-white">{client.name}</p>
                  <p className="truncate text-sm text-gf-muted">{client.email}</p>
                </div>
                <div>
                  {client.onboarding_completed ? (
                    <Badge variant="success">Active</Badge>
                  ) : client.invite_accepted_at ? (
                    <Badge variant="warning">Onboarding</Badge>
                  ) : (
                    <Badge>Invited</Badge>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-gf-border px-3 py-1 text-xs text-gf-muted">
                  <CalendarDays size={12} />
                  Added {formatCreatedAt(client.created_at)}
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-gf-border px-3 py-1 text-xs text-gf-muted">
                  <FileText size={12} />
                  {client.sheet_id ? "Sheet linked" : "Sheet pending"}
                </div>
                {provisioningBadge(client)}
              </div>

              {client.provisioning_status === "failed" && client.provisioning_last_error ? (
                <p className="mt-3 text-xs text-yellow-300">
                  {client.provisioning_last_error}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/admin/clients/${client.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gf-pink px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gf-pink-light"
                >
                  Open workspace
                  <ArrowRight size={14} />
                </Link>
                {!client.onboarding_completed && client.invite_token ? (
                  <button
                    type="button"
                    disabled={busyId === client.id}
                    onClick={() => revokeInvite(client)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gf-border px-3 py-2 text-sm text-gf-muted transition-colors hover:border-gf-pink/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyId === client.id ? "Revoking..." : "Revoke invite"}
                  </button>
                ) : !client.onboarding_completed ? (
                  <button
                    type="button"
                    disabled={busyId === client.id}
                    onClick={() => deleteClient(client)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-300 transition-colors hover:border-red-400 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyId === client.id ? "Deleting..." : "Delete"}
                  </button>
                ) : (
                  <Link
                    href={`/admin/clients/${client.id}#overview`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gf-border px-3 py-2 text-sm text-gf-muted transition-colors hover:border-gf-pink/40 hover:text-white"
                  >
                    Profile
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
