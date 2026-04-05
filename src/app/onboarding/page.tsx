"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { OnboardingForm } from "@/components/onboarding/onboarding-form"
import { Loading } from "@/components/ui/loading"
import { Card } from "@/components/ui/card"

export default function OnboardingPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [state, setState] = useState<
    "loading" | "valid" | "invalid" | "expired"
  >("loading")
  const [email, setEmail] = useState("")

  useEffect(() => {
    if (!token) {
      setState("invalid")
      return
    }

    fetch(`/api/invite/accept?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
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
            This invite link isn&apos;t valid. Please ask your coach to send a
            new one.
          </p>
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
            This invite link has expired. Please ask your coach to send a new
            one.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">
          Welcome to <span className="text-gf-pink">G</span>-Fitness
        </h1>
        <p className="text-gf-muted mt-2">
          Let&apos;s get to know you so your coach can build your plan
        </p>
      </div>
      <OnboardingForm token={token!} email={email} />
    </div>
  )
}
