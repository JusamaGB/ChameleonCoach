"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { OnboardingForm } from "@/components/onboarding/onboarding-form"
import { PoweredBy } from "@/components/branding/powered-by"
import { Loading } from "@/components/ui/loading"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DEFAULT_COACH_BRANDING, type CoachBranding } from "@/lib/branding"

type InviteState = "loading" | "invalid" | "expired" | "ready"
type CodeStage = "code" | "identifier" | "onboarding"
type IdentifierType = "email" | "phone"

export default function OnboardingContent() {
  const searchParams = useSearchParams()
  const token = searchParams?.get("token") ?? null

  const [inviteState, setInviteState] = useState<InviteState>(token ? "loading" : "ready")
  const [stage, setStage] = useState<CodeStage>(token ? "onboarding" : "code")
  const [branding, setBranding] = useState<CoachBranding>(DEFAULT_COACH_BRANDING)
  const [email, setEmail] = useState("")
  const [resolvedToken, setResolvedToken] = useState(token ?? "")
  const [code, setCode] = useState("")
  const [identifier, setIdentifier] = useState("")
  const [identifierType, setIdentifierType] = useState<IdentifierType>("email")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!token) {
      return
    }

    fetch(`/api/invite/accept?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.branding) {
          setBranding(data.branding)
        }
        if (data.valid) {
          setInviteState("ready")
          setEmail(data.email)
          setResolvedToken(token)
          setStage("onboarding")
        } else {
          setInviteState(data.reason === "expired" ? "expired" : "invalid")
        }
      })
      .catch(() => setInviteState("invalid"))
  }, [token])

  async function handleCodeLookup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/invite/code/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const body = await res.json()

      if (!res.ok) {
        throw new Error(body.error || "Invite code not found.")
      }

      setBranding(body.branding ?? DEFAULT_COACH_BRANDING)
      setIdentifierType(body.identifier_type === "phone" ? "phone" : "email")
      setIdentifier("")
      setStage("identifier")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite code not found.")
    } finally {
      setLoading(false)
    }
  }

  async function handleIdentifierVerify(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/invite/code/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, identifier }),
      })
      const body = await res.json()

      if (!res.ok) {
        throw new Error(body.error || "That information does not match this invite.")
      }

      setBranding(body.branding ?? DEFAULT_COACH_BRANDING)
      setResolvedToken(body.token)
      setEmail(body.email ?? "")
      setStage("onboarding")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "That information does not match this invite."
      )
    } finally {
      setLoading(false)
    }
  }

  if (inviteState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading text="Validating your invite..." />
      </div>
    )
  }

  if (inviteState === "invalid") {
    return (
      <InviteStatusCard
        branding={branding}
        title="Invalid Invite"
        body="This invite link isn't valid. Ask your coach to send a fresh onboarding invite."
      />
    )
  }

  if (inviteState === "expired") {
    return (
      <InviteStatusCard
        branding={branding}
        title="Invite Expired"
        body="This invite link has expired. Ask your coach to send a new onboarding invite."
      />
    )
  }

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="text-center mb-8">
        <div className="mb-4 flex justify-center">
          {branding.brand_logo_url ? (
            <img
              src={branding.brand_logo_url}
              alt={`${branding.brand_title} logo`}
              className="h-16 w-16 rounded-2xl object-cover"
            />
          ) : (
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold text-white"
              style={{ backgroundColor: branding.brand_primary_color }}
            >
              {branding.brand_title.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <h1 className="text-3xl font-bold" style={{ color: branding.brand_primary_color }}>
          {branding.brand_title}
        </h1>
        <p className="mt-2" style={{ color: branding.brand_accent_color }}>
          {branding.brand_welcome_text}
        </p>
        <p className="mt-3 text-sm text-gf-muted">
          {stage === "onboarding"
            ? "Complete your onboarding to activate your client portal."
            : "Use your invite code to join your coach's workspace."}
        </p>
      </div>

      {stage === "code" && (
        <Card className="mx-auto max-w-md">
          <form className="space-y-4" onSubmit={handleCodeLookup}>
            <h2 className="text-xl font-semibold">Enter Your Invite Code</h2>
            <Input
              label="Invite Code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD1234"
              required
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Checking..." : "Continue"}
            </Button>
          </form>
        </Card>
      )}

      {stage === "identifier" && (
        <Card className="mx-auto max-w-md">
          <form className="space-y-4" onSubmit={handleIdentifierVerify}>
            <h2 className="text-xl font-semibold">Confirm Your Details</h2>
            <Input
              label={
                identifierType === "phone"
                  ? "Mobile Number"
                  : "Email Address"
              }
              type={identifierType === "phone" ? "tel" : "email"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={
                identifierType === "phone"
                  ? "Enter the mobile number your coach used"
                  : "Enter the email address your coach used"
              }
              required
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setStage("code")
                  setError("")
                }}
              >
                Back
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Checking..." : "Continue"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {stage === "onboarding" && resolvedToken && (
        <OnboardingForm token={resolvedToken} email={email} branding={branding} />
      )}

      {branding.show_powered_by && <PoweredBy className="mt-8 text-center" />}
    </div>
  )
}

function InviteStatusCard({
  branding,
  title,
  body,
}: {
  branding: CoachBranding
  title: string
  body: string
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <Card className="text-center max-w-sm">
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-sm text-gf-muted">{body}</p>
        {branding.show_powered_by && <PoweredBy className="mt-6" />}
      </Card>
    </div>
  )
}
