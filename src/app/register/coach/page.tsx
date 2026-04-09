"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PLATFORM_NAME } from "@/lib/platform"
import {
  COACH_TYPE_DESCRIPTIONS,
  COACH_TYPE_HIGHLIGHTS,
  COACH_TYPE_LABELS,
  COACH_TYPE_PRESETS,
  COACH_TYPE_STATUS,
} from "@/lib/modules"

export default function RegisterCoachPage() {
  const router = useRouter()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [coachTypePreset, setCoachTypePreset] = useState<(typeof COACH_TYPE_PRESETS)[number]>("personal_trainer")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/register-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, coach_type_preset: coachTypePreset }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Something went wrong")
        setLoading(false)
        return
      }

      router.push("/login?registered=coach")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-center mb-2">
          {PLATFORM_NAME}
        </h1>
        <p className="text-gf-muted text-center text-sm mb-8">
          Create your coach workspace
        </p>

        <Card>
          <form onSubmit={handleRegister} className="space-y-4">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gf-muted">
                  Coach Type
                </label>
                <p className="mt-1 text-xs text-gf-muted">
                  Pick the niche that best matches your starting workspace. You can expand into more modules later.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {COACH_TYPE_PRESETS.map((preset) => {
                  const selected = coachTypePreset === preset
                  const status = COACH_TYPE_STATUS[preset]

                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCoachTypePreset(preset)}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        selected
                          ? "border-gf-pink bg-gf-pink/10"
                          : "border-gf-border bg-gf-surface hover:border-gf-pink/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-white">{COACH_TYPE_LABELS[preset]}</p>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            status === "live"
                              ? "bg-green-900/40 text-green-400"
                              : "bg-gf-border text-gf-muted"
                          }`}
                        >
                          {status === "live" ? "Supported" : "Coming soon"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gf-muted">{COACH_TYPE_DESCRIPTIONS[preset]}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {COACH_TYPE_HIGHLIGHTS[preset].map((item) => (
                          <span
                            key={item}
                            className="inline-flex rounded-full border border-gf-border px-2.5 py-1 text-xs text-gf-muted"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-gf-muted">
                        {status === "live"
                          ? "This niche is supported by the platform. Specific workspace bundles can still be enabled later."
                          : "This niche is part of the roadmap and will appear as a fuller bundle later."}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Type your password again"
              required
            />

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating account..." : "Create Coach Workspace"}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-gf-muted mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-gf-pink hover:underline">
            Log In
          </a>
        </p>
      </div>
    </div>
  )
}
