"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input, Select, TextArea } from "@/components/ui/input"
import { Card, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Link2, CheckCircle, AlertCircle } from "lucide-react"
import { DEFAULT_COACH_BRANDING } from "@/lib/branding"

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const [connected, setConnected] = useState<boolean | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [connectionMessage, setConnectionMessage] = useState("")
  const [connectionError, setConnectionError] = useState("")

  const [displayName, setDisplayName] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [brandTitle, setBrandTitle] = useState(DEFAULT_COACH_BRANDING.brand_title)
  const [brandLogoUrl, setBrandLogoUrl] = useState("")
  const [brandPrimaryColor, setBrandPrimaryColor] = useState(
    DEFAULT_COACH_BRANDING.brand_primary_color
  )
  const [brandAccentColor, setBrandAccentColor] = useState(
    DEFAULT_COACH_BRANDING.brand_accent_color
  )
  const [brandWelcomeText, setBrandWelcomeText] = useState(
    DEFAULT_COACH_BRANDING.brand_welcome_text
  )
  const [showPoweredBy, setShowPoweredBy] = useState(true)
  const [appointmentBookingMode, setAppointmentBookingMode] = useState("coach_only")
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
      .then((data) => setConnected(data.connected))
      .catch(() => setConnected(false))
  }

  function fetchProfile() {
    fetch("/api/admin/profile")
      .then((res) => res.json())
      .then((data) => {
        setDisplayName(data.display_name ?? "")
        setBusinessName(data.business_name ?? "")
        setBrandTitle(data.brand_title ?? DEFAULT_COACH_BRANDING.brand_title)
        setBrandLogoUrl(data.brand_logo_url ?? "")
        setBrandPrimaryColor(
          data.brand_primary_color ?? DEFAULT_COACH_BRANDING.brand_primary_color
        )
        setBrandAccentColor(
          data.brand_accent_color ?? DEFAULT_COACH_BRANDING.brand_accent_color
        )
        setBrandWelcomeText(
          data.brand_welcome_text ?? DEFAULT_COACH_BRANDING.brand_welcome_text
        )
        setShowPoweredBy(data.show_powered_by ?? true)
        setAppointmentBookingMode(data.appointment_booking_mode ?? "coach_only")
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
          brand_title: brandTitle,
          brand_logo_url: brandLogoUrl,
          brand_primary_color: brandPrimaryColor,
          brand_accent_color: brandAccentColor,
          brand_welcome_text: brandWelcomeText,
          show_powered_by: showPoweredBy,
          appointment_booking_mode: appointmentBookingMode,
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
    } catch {
      // ignore
    } finally {
      setDisconnecting(false)
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
        <CardTitle>Client Branding</CardTitle>
        <p className="text-sm text-gf-muted mt-2 mb-4">
          Lightweight branding for client-facing, invite, and onboarding surfaces.
        </p>
        <form onSubmit={saveProfile} className="space-y-4">
          <Input
            label="Brand Title"
            value={brandTitle}
            onChange={(e) => setBrandTitle(e.target.value)}
            placeholder="e.g. Eliot Nutrition"
          />
          <Input
            label="Logo URL"
            value={brandLogoUrl}
            onChange={(e) => setBrandLogoUrl(e.target.value)}
            placeholder="https://..."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Primary Color"
              type="color"
              value={brandPrimaryColor}
              onChange={(e) => setBrandPrimaryColor(e.target.value)}
              className="h-12"
            />
            <Input
              label="Accent Color"
              type="color"
              value={brandAccentColor}
              onChange={(e) => setBrandAccentColor(e.target.value)}
              className="h-12"
            />
          </div>
          <TextArea
            label="Welcome Text"
            value={brandWelcomeText}
            onChange={(e) => setBrandWelcomeText(e.target.value)}
            placeholder="Short welcome shown to clients during onboarding and in the client portal."
          />
          <label className="flex items-center gap-3 text-sm text-white">
            <input
              type="checkbox"
              checked={showPoweredBy}
              onChange={(e) => setShowPoweredBy(e.target.checked)}
              className="h-4 w-4 rounded border-gf-border bg-gf-surface"
            />
            Show "Powered by Chameleon Coach"
          </label>
          <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
            <div className="flex items-center gap-3">
              {brandLogoUrl ? (
                <img
                  src={brandLogoUrl}
                  alt={`${brandTitle || "Brand"} logo`}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ backgroundColor: brandPrimaryColor }}
                >
                  {(brandTitle || "C").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold" style={{ color: brandPrimaryColor }}>
                  {brandTitle || DEFAULT_COACH_BRANDING.brand_title}
                </p>
                <p className="text-sm" style={{ color: brandAccentColor }}>
                  {brandWelcomeText || DEFAULT_COACH_BRANDING.brand_welcome_text}
                </p>
              </div>
            </div>
            {showPoweredBy && (
              <p className="mt-4 text-xs text-gf-muted/70">Powered by Chameleon Coach</p>
            )}
          </div>
          {profileError && <p className="text-sm text-red-400">{profileError}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={profileLoading} size="sm">
              {profileLoading ? "Saving..." : "Save Branding"}
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
        <CardTitle>Appointment Booking</CardTitle>
        <p className="text-sm text-gf-muted mt-2 mb-4">
          Control whether clients only request sessions manually or can also see published slots.
        </p>
        <form onSubmit={saveProfile} className="space-y-4">
          <Select
            label="Booking Mode"
            value={appointmentBookingMode}
            onChange={(e) => setAppointmentBookingMode(e.target.value)}
            options={[
              { value: "coach_only", label: "Coach only" },
              { value: "client_request_visible_slots", label: "Client request visible slots" },
            ]}
          />
          <p className="text-xs text-gf-muted">
            Clients are never auto-confirmed in this mode. Coaches still confirm or decline requests manually.
          </p>
          {profileError && <p className="text-sm text-red-400">{profileError}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={profileLoading} size="sm">
              {profileLoading ? "Saving..." : "Save Booking Mode"}
            </Button>
            {profileSaved && (
              <span className="text-sm text-green-400 flex items-center gap-1">
                <CheckCircle size={14} /> Saved
              </span>
            )}
          </div>
        </form>
      </Card>

      <Card>
        <CardTitle>Google Sheets + Drive Connection</CardTitle>
        <p className="text-sm text-gf-muted mt-2 mb-4">
          Connect your Google account so client sheets can be created and stored
          in your Drive, meal plans can sync through Google Sheets, and confirmed
          appointments can be added to your Google Calendar.
        </p>
        <p className="text-sm text-gf-muted mb-4">
          If you connected Google before Calendar sync was added, reconnect once
          to grant the new Calendar permission.
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {connected === null ? (
              <Badge>Checking...</Badge>
            ) : connected ? (
              <>
                <CheckCircle size={16} className="text-green-400" />
                <Badge variant="success">Connected</Badge>
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
            <Button
              variant={connected ? "secondary" : "primary"}
              size="sm"
              onClick={handleConnect}
            >
              <Link2 size={14} className="mr-1.5" />
              {connected ? "Reconnect" : "Connect Google"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
