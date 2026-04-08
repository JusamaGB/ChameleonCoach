"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type DeleteAccountCardProps = {
  title: string
  warning: string
  details: string
}

export function DeleteAccountCard({
  title,
  warning,
  details,
}: DeleteAccountCardProps) {
  const router = useRouter()
  const [confirmationText, setConfirmationText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleDelete() {
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/account", { method: "DELETE" })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete account")
      }

      try {
        await createClient().auth.signOut()
      } catch {
        // Session may already be invalid after auth deletion.
      }
      router.push("/login?deleted=true")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account")
      setLoading(false)
    }
  }

  return (
    <Card className="mt-6 border-red-500/30">
      <CardTitle>{title}</CardTitle>
      <div className="mt-3 space-y-4">
        <p className="text-sm text-red-200">{warning}</p>
        <p className="text-sm text-gf-muted">{details}</p>
        <p className="text-sm text-gf-muted">
          Google Sheets and files in Google Drive are not deleted by this action.
        </p>
        <Input
          label='Type "DELETE" to confirm'
          value={confirmationText}
          onChange={(e) => setConfirmationText(e.target.value)}
          placeholder="DELETE"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button
          type="button"
          variant="secondary"
          onClick={handleDelete}
          disabled={loading || confirmationText !== "DELETE"}
          className="w-full border border-red-500/40 text-red-100 hover:bg-red-500/10"
        >
          {loading ? "Deleting..." : "Delete Permanently"}
        </Button>
      </div>
    </Card>
  )
}
