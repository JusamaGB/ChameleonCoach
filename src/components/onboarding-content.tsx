"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { OnboardingForm } from "@/components/onboarding/onboarding-form"
import { PoweredBy } from "@/components/branding/powered-by"
import { Loading } from "@/components/ui/loading"
import { Card } from "@/components/ui/card"
import { DEFAULT_COACH_BRANDING, type CoachBranding } from "@/lib/branding"

export default function OnboardingContent() {
  const searchParams = useSearchParams()
  const token = searchParams?.get("token") ?? null
  const [state, setState] = useState<
    "loading" | "valid" | "invalid" | "expired"
  >("loading")
  const [email, setEmail] = useState("")
  const [branding, setBranding] = useState<CoachBranding>(DEFAULT_COACH_BRANDING)

  useEffect(() => {
    if (!token) {
      setState("invalid")
      return
    }

    fetch(`/api/invite/accept?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.branding) {
          setBranding(data.branding)
        }
        if (data.valid) {
          setState("valid")
          setEmail(data.email)
        } else {
          setState(data.reason === "expired" ? "expired" : "invalid")
        }
      })
      .catch(() => setState("invalid"))
  }, [token])

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading text="Validating your invite..." />
      </div>
    )
  }

  if (state === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <Card className="text-center max-w-sm">
          <h2 className="text-xl font-semibold mb-2">Invalid Invite</h2>
          <p className="text-sm text-gf-muted">
            This invite link isn&apos;t valid. Ask your coach to send a fresh onboarding invite.
          </p>
          {branding.show_powered_by && <PoweredBy className="mt-6" />}
        </Card>
      </div>
    )
  }

  if (state === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <Card className="text-center max-w-sm">
          <h2 className="text-xl font-semibold mb-2">Invite Expired</h2>
          <p className="text-sm text-gf-muted">
            This invite link has expired. Ask your coach to send a new onboarding invite.
          </p>
          {branding.show_powered_by && <PoweredBy className="mt-6" />}
        </Card>
      </div>
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
          Complete your onboarding to activate your client portal.
        </p>
      </div>
      <OnboardingForm token={token!} email={email} branding={branding} />
      {branding.show_powered_by && <PoweredBy className="mt-8 text-center" />}
    </div>
  )
}
