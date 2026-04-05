"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const onboarded = searchParams.get("onboarded")
  const redirect = searchParams.get("redirect") || "/dashboard"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Check if admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
      router.push("/admin")
    } else {
      router.push(redirect)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-2">
          <span className="text-gf-pink">G</span>-Fitness
        </h1>
        <p className="text-gf-muted text-center text-sm mb-8">
          Log in to your account
        </p>

        {onboarded && (
          <div className="bg-green-900/20 border border-green-800 rounded-lg p-3 mb-6">
            <p className="text-sm text-green-400 text-center">
              Account created! Log in to get started.
            </p>
          </div>
        )}

        <Card>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
            />

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Logging in..." : "Log In"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
