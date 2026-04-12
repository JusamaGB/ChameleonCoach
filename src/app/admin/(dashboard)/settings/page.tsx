"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Link2, CheckCircle, AlertCircle, ArrowRight, CreditCard, Layers3 } from "lucide-react"
import { type CoachTypePreset, type EnableableModule } from "@/lib/modules"
import { DeleteAccountCard } from "@/components/account/delete-account-card"

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const [connected, setConnected] = useState<boolean | null>(null)
  const [sheetsProvisioned, setSheetsProvisioned] = useState(false)
  const [managedWorkspaceSheetUrl, setManagedWorkspaceSheetUrl] = useState("")
  const [managedWorkspaceRootFolderUrl, setManagedWorkspaceRootFolderUrl] = useState("")
  const [workspaceStatus, setWorkspaceStatus] = useState<
    "healthy" | "missing" | "not_provisioned" | "disconnected"
  >("disconnected")
  const [missingArtifacts, setMissingArtifacts] = useState<string[]>([])
  const [disconnecting, setDisconnecting] = useState(false)
  const [provisioning, setProvisioning] = useState(false)
  const [connectionMessage, setConnectionMessage] = useState("")
  const [connectionError, setConnectionError] = useState("")

  const [displayName, setDisplayName] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [coachTypePreset, setCoachTypePreset] = useState<CoachTypePreset | null>(null)
  const [activeModules, setActiveModules] = useState<EnableableModule[]>([])
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState("")

  useEffect(() => {
    checkConnection()
    fetchProfile()
  }, [])

  useEffect(() => {
    const connectedParam = searchParams.get("connected")
    const errorParam = searchParams.get("error")

    if (connectedParam === "true") {
      setConnectionMessage("Google connected successfully for Sheets, Drive, and Calendar.")
      setConnectionError("")
      return
    }

    if (!errorParam) {
      setConnectionMessage("")
      setConnectionError("")
      return
    }

    setConnectionMessage("")

    switch (errorParam) {
      case "missing_google_env":
        setConnectionError(
          "Google OAuth is not configured. Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI."
        )
        break
      case "no_code":
        setConnectionError(
          "Google did not return an authorization code. Check the OAuth consent flow and redirect URI."
        )
        break
      default:
        setConnectionError(
          "Google connection failed. Check your Google OAuth client, redirect URI, Calendar scope grant, and environment variables, then try again."
        )
        break
    }
  }, [searchParams])

  function checkConnection() {
    fetch("/api/google/connect")
      .then((res) => res.json())
      .then((data) => {
        setConnected(data.connected)
        setSheetsProvisioned(Boolean(data.sheets_provisioned))
        setManagedWorkspaceSheetUrl(data.managed_workspace_sheet_url ?? "")
        setManagedWorkspaceRootFolderUrl(data.managed_workspace_root_folder_url ?? "")
        setWorkspaceStatus(data.workspace_status ?? "disconnected")
        setMissingArtifacts(Array.isArray(data.missing_artifacts) ? data.missing_artifacts : [])
      })
      .catch(() => {
        setConnected(false)
        setSheetsProvisioned(false)
        setManagedWorkspaceSheetUrl("")
        setManagedWorkspaceRootFolderUrl("")
        setWorkspaceStatus("disconnected")
        setMissingArtifacts([])
      })
  }

  function fetchProfile() {
    fetch("/api/admin/profile")
      .then((res) => res.json())
      .then((data) => {
        setDisplayName(data.display_name ?? "")
        setBusinessName(data.business_name ?? "")
        setCoachTypePreset(data.coach_type_preset ?? null)
        setActiveModules(Array.isArray(data.active_modules) ? data.active_modules : [])
      })
      .catch(() => {})
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileLoading(true)
    setProfileSaved(false)
    setProfileError("")
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          business_name: businessName,
          coach_type_preset: coachTypePreset,
          active_modules: activeModules,
        }),
      })
      if (!res.ok) throw new Error()
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    } catch {
      setProfileError("Failed to save. Please try again.")
    } finally {
      setProfileLoading(false)
    }
  }

  function handleConnect() {
    window.location.href = "/api/google/connect?action=auth"
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await fetch("/api/google/disconnect", { method: "POST" })
      setConnected(false)
      setSheetsProvisioned(false)
      setWorkspaceStatus("disconnected")
      setMissingArtifacts([])
      setManagedWorkspaceSheetUrl("")
      setManagedWorkspaceRootFolderUrl("")
    } catch {
      // ignore
    } finally {
      setDisconnecting(false)
    }
  }

  async function handleCreateChameleonSheets() {
    setProvisioning(true)
    setConnectionError("")
    setConnectionMessage("")

    try {
      const response = await fetch("/api/google/provision", { method: "POST" })
      const data = await response.json()

      if (!response.ok) {
        setConnectionError(data.error || "Failed to create Chameleon Sheets.")
        setWorkspaceStatus(data.workspace_status ?? "missing")
        setMissingArtifacts(Array.isArray(data.missing_artifacts) ? data.missing_artifacts : [])
        return
      }

      setSheetsProvisioned(data.workspace_status === "healthy")
      setManagedWorkspaceSheetUrl(data.managed_workspace_sheet_url ?? "")
      setManagedWorkspaceRootFolderUrl(data.managed_workspace_root_folder_url ?? "")
      setWorkspaceStatus(data.workspace_status ?? "healthy")
      setMissingArtifacts(Array.isArray(data.missing_artifacts) ? data.missing_artifacts : [])
      setConnectionMessage(
        data.already_provisioned
          ? "The coach-owned Drive workspace is already provisioned."
          : "The coach-owned Drive workspace, control workbook, and required folders were created in your Google Drive."
      )
    } catch {
      setConnectionError("Failed to create Chameleon Sheets.")
    } finally {
      setProvisioning(false)
      checkConnection()
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <p className="text-gf-muted mb-8">Manage your profile and integrations</p>

      {connectionMessage && (
        <Card className="mb-6 border-green-500/30">
          <div className="flex items-start gap-2 text-sm text-green-400">
            <CheckCircle size={16} className="mt-0.5 shrink-0" />
            <p>{connectionMessage}</p>
          </div>
        </Card>
      )}

      {connectionError && (
        <Card className="mb-6 border-yellow-500/30">
          <div className="flex items-start gap-2 text-sm text-yellow-300">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p>{connectionError}</p>
          </div>
        </Card>
      )}

      <Card className="mb-6">
        <CardTitle>Profile</CardTitle>
        <p className="text-sm text-gf-muted mt-2 mb-4">
          Your name and business details shown to clients.
        </p>
        <form onSubmit={saveProfile} className="space-y-4">
          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Sarah Jones"
          />
          <Input
            label="Business Name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. SJ Nutrition"
          />
          {profileError && <p className="text-sm text-red-400">{profileError}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={profileLoading} size="sm">
              {profileLoading ? "Saving..." : "Save"}
            </Button>
            {profileSaved && (
              <span className="text-sm text-green-400 flex items-center gap-1">
                <CheckCircle size={14} /> Saved
              </span>
            )}
          </div>
        </form>
      </Card>

      <Card className="mb-6">
        <CardTitle>Workspace Surfaces</CardTitle>
        <p className="text-sm text-gf-muted mt-2 mb-4">
          Module bundles and billing are now accessed from dedicated workspace-level surfaces instead of living in the main client workflow.
        </p>
        <div className="space-y-3">
          <Link
            href="/admin/modules"
            className="flex items-center justify-between rounded-xl border border-gf-border bg-gf-surface p-4 text-sm text-white transition-colors hover:border-gf-pink/40"
          >
            <div className="flex items-start gap-3">
              <Layers3 size={18} className="mt-0.5 text-gf-pink" />
              <div>
                <p className="font-medium">Modules</p>
                <p className="mt-1 text-xs text-gf-muted">
                  Enable workspace bundles here, then use them inside client workspaces.
                </p>
              </div>
            </div>
            <ArrowRight size={16} className="text-gf-muted" />
          </Link>
          <Link
            href="/admin/marketing"
            className="flex items-center justify-between rounded-xl border border-gf-border bg-gf-surface p-4 text-sm text-white transition-colors hover:border-gf-pink/40"
          >
            <div className="flex items-start gap-3">
              <Layers3 size={18} className="mt-0.5 text-gf-pink" />
              <div>
                <p className="font-medium">Marketing</p>
                <p className="mt-1 text-xs text-gf-muted">
                  Manage Marketing AI BYOK, lead discovery, and outreach drafts from the marketing workspace.
                </p>
              </div>
            </div>
            <ArrowRight size={16} className="text-gf-muted" />
          </Link>
          <Link
            href="/admin/billing"
            className="flex items-center justify-between rounded-xl border border-gf-border bg-gf-surface p-4 text-sm text-white transition-colors hover:border-gf-pink/40"
          >
            <div className="flex items-start gap-3">
              <CreditCard size={18} className="mt-0.5 text-gf-pink" />
              <div>
                <p className="font-medium">Billing</p>
                <p className="mt-1 text-xs text-gf-muted">
                  Subscription and payment-account actions remain available here without taking a primary sidebar slot.
                </p>
              </div>
            </div>
            <ArrowRight size={16} className="text-gf-muted" />
          </Link>
          <Link
            href="/admin/payments"
            className="flex items-center justify-between rounded-xl border border-gf-border bg-gf-surface p-4 text-sm text-white transition-colors hover:border-gf-pink/40"
          >
            <div className="flex items-start gap-3">
              <CreditCard size={18} className="mt-0.5 text-gf-pink" />
              <div>
                <p className="font-medium">Payments</p>
                <p className="mt-1 text-xs text-gf-muted">
                  Connect Stripe for client-to-coach invoices and payment collection.
                </p>
              </div>
            </div>
            <ArrowRight size={16} className="text-gf-muted" />
          </Link>
        </div>
      </Card>

      <Card>
        <CardTitle>Google Sheets + Drive Connection</CardTitle>
        <p className="text-sm text-gf-muted mt-2 mb-4">
          Connect your Google account so client sheets can be created and stored
          in your Drive, meal plans can sync through Google Sheets, and confirmed
          appointments can be added to your Google Calendar.
        </p>
        {connected && !sheetsProvisioned && (
          <p className="text-sm text-gf-muted mb-4">
            {workspaceStatus === "missing"
              ? "Google is connected, but part of the managed Drive workspace is missing. Regenerate it so Chameleon can restore the coach-owned folder structure."
              : "Google is connected. Create the coach-owned Drive workspace so Chameleon can keep control files, coach libraries, and client workbooks separate."}
          </p>
        )}
        {connected && sheetsProvisioned && (
          <p className="text-sm text-gf-muted mb-4">
            Your coach-owned Drive workspace is provisioned. The control workbook stays private,
            coach libraries stay private, and client workbooks are created inside the dedicated
            Clients folder. Use the workspace folder button to view the whole Drive structure.
          </p>
        )}
        {!connected && (
          <p className="text-sm text-gf-muted mb-4">
            If Google permissions change later, you can reconnect after the
            initial connection is in place.
          </p>
        )}
        {connectionError && (
          <div className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm text-yellow-300">
            {connectionError}
          </div>
        )}
        {connected && workspaceStatus === "missing" && missingArtifacts.length > 0 && (
          <div className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm text-yellow-300">
            Missing Drive artifacts detected: {missingArtifacts.join(", ")}.
          </div>
        )}
        {connectionMessage && (
          <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/5 p-3 text-sm text-green-300">
            {connectionMessage}
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {connected === null ? (
              <Badge>Checking...</Badge>
            ) : connected ? (
              <>
                <CheckCircle size={16} className="text-green-400" />
                <Badge variant="success">Connected</Badge>
                <Badge variant={sheetsProvisioned ? "success" : "warning"}>
                  {sheetsProvisioned
                    ? "Chameleon Sheets ready"
                    : workspaceStatus === "missing"
                    ? "Workspace missing"
                    : "Sheets not provisioned"}
                </Badge>
              </>
            ) : (
              <>
                <AlertCircle size={16} className="text-yellow-400" />
                <Badge variant="warning">Not connected</Badge>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {connected && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            )}
            {connected ? (
              sheetsProvisioned ? (
                <div className="flex items-center gap-2">
                  {managedWorkspaceRootFolderUrl ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => window.open(managedWorkspaceRootFolderUrl, "_blank", "noopener,noreferrer")}
                    >
                      Open Drive Workspace Folder
                    </Button>
                  ) : null}
                  {managedWorkspaceSheetUrl ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => window.open(managedWorkspaceSheetUrl, "_blank", "noopener,noreferrer")}
                    >
                      Open Control Workbook
                    </Button>
                  ) : null}
                </div>
              ) : (
                <Button size="sm" onClick={handleCreateChameleonSheets} disabled={provisioning}>
                  {provisioning
                    ? "Creating..."
                    : workspaceStatus === "missing"
                    ? "Regenerate Chameleon Sheets"
                    : "Create Chameleon Sheets"}
                </Button>
              )
            ) : (
              <Button variant="primary" size="sm" onClick={handleConnect}>
                <Link2 size={14} className="mr-1.5" />
                Connect Google
              </Button>
            )}
          </div>
        </div>
      </Card>

      <DeleteAccountCard
        title="Delete Workspace"
        warning="This permanently deletes your coach account, workspace settings, clients, appointments, modules, branding, and other platform data for this workspace."
        details="Account access is removed immediately after deletion. You can create a new workspace later with the same email, but Google Sheets and files already stored in your Google Drive are retained."
      />
    </div>
  )
}
