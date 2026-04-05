"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { Send, CheckCircle } from "lucide-react"

export default function InvitePage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">Invite Client</h1>
      <p className="text-gf-muted mb-8">
        Send an onboarding invite to a new client
      </p>

      <Card>
        <CardTitle>New Invitation</CardTitle>
        <form onSubmit={handleInvite} className="space-y-4 mt-4">
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

          <Button type="submit" disabled={loading} className="w-full">
            <Send size={16} className="mr-2" />
            {loading ? "Sending..." : "Send Invite"}
          </Button>
        </form>
      </Card>

      <p className="text-xs text-gf-muted text-center mt-6">
        The client will receive an email with a link to complete their
        onboarding questionnaire and create their account. The link expires
        after 7 days.
      </p>
    </div>
  )
}
