"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Input, Select } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Send, CheckCircle, Clock, Copy } from "lucide-react"
import type { Client } from "@/types"

type WorkspaceStatus = "healthy" | "missing" | "not_provisioned" | "disconnected" | "unknown"

const contactOptions = [
  { value: "email", label: "Email address" },
  { value: "phone", label: "Mobile number" },
]

export default function InvitePage() {
  const [name, setName] = useState("")
  const [contactType, setContactType] = useState<"email" | "phone">("email")
  const [contactValue, setContactValue] = useState("")
  const [sendEmail, setSendEmail] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [latestInviteCode, setLatestInviteCode] = useState("")
  const [pending, setPending] = useState<Client[]>([])
  const [workspaceLoading, setWorkspaceLoading] = useState(true)
  const [workspaceReady, setWorkspaceReady] = useState(false)
  const [workspaceStatus, setWorkspaceStatus] = useState<WorkspaceStatus>("unknown")
  const [workspaceError, setWorkspaceError] = useState("")
  const [missingArtifacts, setMissingArtifacts] = useState<string[]>([])

  const loadPending = useCallback(async () => {
    try {
      const data = await fetch("/api/admin/clients").then((r) => r.json())
      const clients: Client[] = data.clients ?? []
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
    if (!name.trim() || !contactValue.trim()) return
    if (!workspaceReady) return

    setLoading(true)
    setError("")
    setSuccess("")
    setLatestInviteCode("")

    try {
      const res = await fetch("/api/invite/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contact_type: contactType,
          contact_value: contactValue.trim(),
          send_email: sendEmail,
        }),
      })

      const body = await res.json()

      if (!res.ok) {
        throw new Error(body.error || "Failed to create invite")
      }

      setSuccess(
        sendEmail && contactType === "email"
          ? `Invite created and emailed to ${contactValue.trim()}.`
          : "Invite created. Copy the code and send it to your client."
      )
      setLatestInviteCode(body.invite_code ?? "")
      setName("")
      setContactValue("")
      setSendEmail(false)
      loadPending()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  async function copyInviteCode(code: string) {
    await navigator.clipboard.writeText(code)
    setSuccess(`Invite code ${code} copied.`)
  }

  const now = new Date()
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Invite Client</h1>
      <p className="text-gf-muted mb-8">
        Create a join code for a client, then send it however you usually communicate.
      </p>

      <Card className="mb-8">
        <CardTitle>New Invitation</CardTitle>
        {workspaceLoading ? (
          <div className="mt-4 h-20 animate-pulse rounded-xl border border-gf-border bg-gf-surface/40" />
        ) : !workspaceReady ? (
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
        {!workspaceLoading && workspaceReady ? (
          <form onSubmit={handleInvite} className="space-y-4 mt-4">
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-3 text-sm text-green-300">
              Clients will use a code first, then confirm either the email address or mobile number attached to that invite.
            </div>

            <Input
              label="Client Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Smith"
              required
            />
            <Select
              label="Verification Method"
              options={contactOptions}
              value={contactType}
              onChange={(e) => setContactType((e.target.value === "phone" ? "phone" : "email"))}
            />
            <Input
              label={contactType === "phone" ? "Mobile Number" : "Email Address"}
              type={contactType === "phone" ? "tel" : "email"}
              value={contactValue}
              onChange={(e) => setContactValue(e.target.value)}
              placeholder={contactType === "phone" ? "e.g. +44 7123 456789" : "client@example.com"}
              required
            />

            {contactType === "email" && (
              <label className="flex items-center gap-3 rounded-lg border border-gf-border bg-gf-surface px-4 py-3 text-sm text-gf-muted">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                />
                Email the invite code as well
              </label>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            {success && (
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle size={16} />
                {success}
              </div>
            )}

            {latestInviteCode && (
              <div className="rounded-xl border border-gf-pink/30 bg-gf-pink/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-gf-muted">Latest invite code</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-2xl font-bold tracking-[0.2em] text-white">{latestInviteCode}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => copyInviteCode(latestInviteCode)}
                  >
                    <Copy size={14} className="mr-2" />
                    Copy
                  </Button>
                </div>
              </div>
            )}

            <Button type="submit" disabled={loading || workspaceLoading || !workspaceReady} className="w-full">
              <Send size={16} className="mr-2" />
              {loading ? "Creating invite..." : "Create Invite Code"}
            </Button>
          </form>
        ) : null}
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">Pending Invitations</h2>
        {pending.length === 0 ? (
          <p className="text-gf-muted text-sm">No pending invitations.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((client) => {
              const expired = client.invite_expires_at ? new Date(client.invite_expires_at) < now : false
              const inviteCode = client.invite_code || (client.drive_folder_url?.startsWith("http") ? null : client.drive_folder_url)
              const inviteContactType =
                client.invite_contact_type
                || (
                  client.sheet_shared_permission_id === "phone" || client.sheet_shared_permission_id === "email"
                    ? client.sheet_shared_permission_id
                    : "email"
                )
              const inviteContactValue = client.invite_contact_value || client.sheet_shared_email || client.email

              return (
                <Card key={client.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{client.name}</p>
                        {expired ? <Badge variant="default">Expired</Badge> : <Badge variant="warning">Pending</Badge>}
                      </div>
                      <p className="text-xs text-gf-muted">
                        {inviteContactType === "phone" ? "Phone" : "Email"}: {inviteContactValue}
                      </p>
                      {inviteCode && (
                        <p className="text-xs text-gf-muted">
                          Code: <span className="font-semibold tracking-[0.18em] text-white">{inviteCode}</span>
                        </p>
                      )}
                      {client.invite_expires_at && (
                        <p className="text-xs text-gf-muted flex items-center gap-1">
                          <Clock size={11} />
                          {expired
                            ? "Expired"
                            : `Expires ${new Date(client.invite_expires_at).toLocaleDateString("en-GB")}`}
                        </p>
                      )}
                    </div>
                    {inviteCode && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => copyInviteCode(inviteCode)}
                      >
                        <Copy size={14} className="mr-2" />
                        Copy
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-gf-muted text-center mt-8">
        The client enters their invite code first, then confirms the exact email address or mobile number you used for that invite.
      </p>
    </div>
  )
}
