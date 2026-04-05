"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input, TextArea } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"

export function ProgressForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [weight, setWeight] = useState("")
  const [measurements, setMeasurements] = useState("")
  const [notes, setNotes] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!weight && !measurements && !notes) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/sheets/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date().toISOString().split("T")[0],
          weight,
          measurements,
          notes,
        }),
      })

      if (!res.ok) throw new Error("Failed to save")

      setWeight("")
      setMeasurements("")
      setNotes("")
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      router.refresh()
    } catch {
      setError("Failed to save progress. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardTitle>Log Progress</CardTitle>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <Input
          label="Weight"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="e.g. 79.5kg"
        />
        <Input
          label="Measurements"
          value={measurements}
          onChange={(e) => setMeasurements(e.target.value)}
          placeholder="e.g. Waist: 32in, Chest: 40in"
        />
        <TextArea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How are you feeling? Any changes?"
        />

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && (
          <p className="text-sm text-green-400">Logged successfully</p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Saving..." : "Log Progress"}
        </Button>
      </form>
    </Card>
  )
}
