"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Send, CheckCircle, Clock } from "lucide-react"
import type { Client } from "@/types"

type WorkspaceStatus = "healthy" | "missing" | "not_provisioned" | "disconnected" | "unknown"
type ClientSheetSetupChoice = "template" | "connect" | "import" | null

export default function InvitePage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [clientCount, setClientCount] = useState(0)
  const [pending, setPending] = useState<Client[]>([])
  const [workspaceLoading, setWorkspaceLoading] = useState(true)
  const [workspaceReady, setWorkspaceReady] = useState(false)
  const [workspaceStatus, setWorkspaceStatus] = useState<WorkspaceStatus>("unknown")
  const [workspaceError, setWorkspaceError] = useState("")
  const [missingArtifacts, setMissingArtifacts] = useState<string[]>([])
  const [setupChoice, setSetupChoice] = useState<ClientSheetSetupChoice>(null)

  const loadPending = useCallback(async () => {
    try {
      const data = await fetch("/api/admin/clients").then((r) => r.json())
      const clients: Client[] = data.clients ?? []
      setClientCount(clients.length)
      setPending(clients.filter((c) => !c.onboarding_completed && c.invite_token))
    } catch {
      // ignore
    }
  }, [])

  const loadWorkspaceReadiness = useCallback(async () => {
    setWorkspaceLoading(true)
    setWorkspaceError("")

    try {
      const response = await fetch("/api/google/connect")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to load workspace readiness")
      }

      const status = (data.workspace_status ?? "unknown") as WorkspaceStatus
      setWorkspaceStatus(status)
      setMissingArtifacts(Array.isArray(data.missing_artifacts) ? data.missing_artifacts : [])
      setWorkspaceReady(Boolean(data.connected) && status === "healthy")
    } catch (err) {
      setWorkspaceStatus("unknown")
      setWorkspaceReady(false)
      setMissingArtifacts([])
      setWorkspaceError(err instanceof Error ? err.message : "Failed to load workspace readiness")
    } finally {
      setWorkspaceLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPending()
    loadWorkspaceReadiness()
  }, [loadPending, loadWorkspaceReadiness])

  function workspaceMessage() {
    if (workspaceError) {
      return workspaceError
    }

    if (workspaceLoading) {
      return "Checking whether your Chameleon client workspace is ready for invites."
    }

    switch (workspaceStatus) {
      case "healthy":
        return "Your Chameleon workspace is ready. New client invites can provision a client folder and workbook during onboarding."
      case "disconnected":
        return "Connect Google first, then create Chameleon Sheets before inviting clients."
      case "not_provisioned":
        return "Create Chameleon Sheets first so client invites have a ready workspace template."
      case "missing":
        return `Part of the managed Drive workspace is missing${missingArtifacts.length > 0 ? `: ${missingArtifacts.join(", ")}` : ""}. Repair it in Settings before inviting clients.`
      default:
        return "Invite readiness could not be confirmed. Open Settings to verify the Google workspace."
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    if (!workspaceReady) return

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch("/api/invite/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || "Failed to send invite")
      }

      setSuccess(`Invite sent to ${email}`)
      setName("")
      setEmail("")
      loadPending()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  async function resend(clientName: string, clientEmail: string) {
    setError("")
    setSuccess("")
    if (!workspaceReady) return
    try {
      const res = await fetch("/api/invite/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: clientName, email: clientEmail }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || "Failed to resend invite")
      }
      setSuccess(`Invite resent to ${clientEmail}`)
      loadPending()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  const now = new Date()
  const firstInviteSetupRequired = workspaceReady && clientCount === 0 && setupChoice !== "template"

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">Invite Client</h1>
      <p className="text-gf-muted mb-8">
        Send an onboarding invite to a new client
      </p>

      <Card className="mb-8">
        <CardTitle>New Invitation</CardTitle>
        {!workspaceReady ? (
          <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
            <p className="text-sm text-yellow-300">{workspaceMessage()}</p>
            <Link
              href="/admin/settings"
              className="mt-3 inline-flex items-center justify-center rounded-lg border border-gf-border bg-gf-surface px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:border-gf-pink/50"
            >
              Open Settings
            </Link>
          </div>
        ) : null}
        {firstInviteSetupRequired ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gf-muted">
              Before the first client invite, choose how this workspace should handle client sheets. Only the Chameleon template flow is live right now.
            </p>

            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => setSetupChoice("template")}
                className="rounded-xl border border-gf-pink/40 bg-gf-pink/10 p-4 text-left transition-colors hover:bg-gf-pink/15"
              >
                <p className="font-medium text-white">Use Chameleon template</p>
                <p className="mt-1 text-sm text-gf-muted">
                  New clients will get a Chameleon-managed workbook created during onboarding.
                </p>
              </button>

              <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">Connect existing sheet</p>
                    <p className="mt-1 text-sm text-gf-muted">
                      Link a client-owned spreadsheet instead of creating a Chameleon workbook.
                    </p>
                  </div>
                  <Badge>Coming soon</Badge>
                </div>
              </div>

              <div className="rounded-xl border border-gf-border bg-gf-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">Import sheet</p>
                    <p className="mt-1 text-sm text-gf-muted">
                      Import an existing spreadsheet into the client workspace flow.
                    </p>
                  </div>
                  <Badge>Coming soon</Badge>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4 mt-4">
            {setupChoice === "template" ? (
              <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-3 text-sm text-green-300">
                Chosen setup path: Chameleon template. The client workbook will be created when the client completes onboarding.
              </div>
            ) : null}

            <Input
              label="Client Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Smith"
              required
            />
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              required
            />

            {error && <p className="text-sm text-red-400">{error}</p>}

            {success && (
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle size={16} />
                {success}
              </div>
            )}

            <Button type="submit" disabled={loading || workspaceLoading || !workspaceReady} className="w-full">
              <Send size={16} className="mr-2" />
              {loading ? "Sending..." : workspaceReady ? "Send Invite" : "Invite blocked until workspace is ready"}
            </Button>
          </form>
        )}
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">Pending Invitations</h2>
        {pending.length === 0 ? (
          <p className="text-gf-muted text-sm">No pending invitations.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((c) => {
              const expired = c.invite_expires_at ? new Date(c.invite_expires_at) < now : false
              return (
                <Card key={c.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-gf-muted">{c.email}</p>
                      {c.invite_expires_at && (
                        <p className="text-xs text-gf-muted flex items-center gap-1">
                          <Clock size={11} />
                          {expired
                            ? "Expired"
                            : `Expires ${new Date(c.invite_expires_at).toLocaleDateString("en-GB")}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {expired ? (
                        <Badge variant="default">Expired</Badge>
                      ) : (
                        <Badge variant="warning">Pending</Badge>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!workspaceReady}
                        onClick={() => resend(c.name, c.email)}
                      >
                        Resend
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-gf-muted text-center mt-8">
        The client will receive an email with a link to complete their
        onboarding questionnaire and create their account. The link expires
        after 7 days.
      </p>
    </div>
  )
}
