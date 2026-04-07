"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function BillingActions({ status }: { status: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleAddPayment() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || "Something went wrong")
        setLoading(false)
      }
    } catch {
      setError("Something went wrong")
      setLoading(false)
    }
  }

  if (status === "active") return null

  return (
    <div className="space-y-2">
      <Button onClick={handleAddPayment} disabled={loading} className="w-full">
        {loading ? "Redirecting..." : "Add Payment Method"}
      </Button>
      {error && <p className="text-sm text-red-400 text-center">{error}</p>}
    </div>
  )
}
