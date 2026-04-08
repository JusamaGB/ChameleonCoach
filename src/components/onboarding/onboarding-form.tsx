"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input, TextArea, Select } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { OnboardingData } from "@/types"
import type { CoachBranding } from "@/lib/branding"

const activityOptions = [
  { value: "sedentary", label: "Sedentary (little or no exercise)" },
  { value: "lightly_active", label: "Lightly active (1-3 days/week)" },
  { value: "moderately_active", label: "Moderately active (3-5 days/week)" },
  { value: "very_active", label: "Very active (6-7 days/week)" },
]

const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
]

const steps = [
  { title: "About You", fields: ["name", "age", "gender"] },
  { title: "Your Body", fields: ["height", "current_weight", "goal_weight"] },
  {
    title: "Your Goals",
    fields: ["fitness_goals", "activity_level"],
  },
  {
    title: "Health & Diet",
    fields: ["dietary_restrictions", "health_conditions", "notes"],
  },
]

interface Props {
  token: string
  email: string
  branding: CoachBranding
}

export function OnboardingForm({ token, email, branding }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [data, setData] = useState<OnboardingData>({
    name: "",
    age: 0,
    gender: "",
    height: "",
    current_weight: "",
    goal_weight: "",
    fitness_goals: "",
    dietary_restrictions: "",
    health_conditions: "",
    activity_level: "moderately_active",
    notes: "",
  })

  function update(field: keyof OnboardingData, value: string | number) {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
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
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, onboarding: data }),
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || "Something went wrong")
      }

      router.push("/login?onboarded=true")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const isLastStep = step === steps.length

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress bar */}
      <div className="flex gap-2 mb-8">
        {[...steps, { title: "Account" }].map((s, i) => (
          <div key={i} className="flex-1 flex flex-col gap-1.5">
            <div
              className={`h-1 rounded-full transition-colors ${
                i <= step ? "bg-gf-pink" : "bg-gf-border"
              }`}
              style={i <= step ? { backgroundColor: branding.brand_primary_color } : undefined}
            />
            <span className="text-[10px] text-gf-muted">{s.title}</span>
          </div>
        ))}
      </div>

      <Card>
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-6">About You</h2>
            <Input
              label="Full Name"
              value={data.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Your full name"
            />
            <Input
              label="Age"
              type="number"
              value={data.age || ""}
              onChange={(e) => update("age", parseInt(e.target.value) || 0)}
              placeholder="Your age"
            />
            <Select
              label="Gender"
              options={genderOptions}
              value={data.gender}
              onChange={(e) => update("gender", e.target.value)}
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-6">Your Body</h2>
            <Input
              label="Height"
              value={data.height}
              onChange={(e) => update("height", e.target.value)}
              placeholder={"e.g. 5'10\" or 178cm"}
            />
            <Input
              label="Current Weight"
              value={data.current_weight}
              onChange={(e) => update("current_weight", e.target.value)}
              placeholder="e.g. 80kg or 176lbs"
            />
            <Input
              label="Goal Weight"
              value={data.goal_weight}
              onChange={(e) => update("goal_weight", e.target.value)}
              placeholder="e.g. 75kg or 165lbs"
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-6">Your Goals</h2>
            <TextArea
              label="Fitness Goals"
              value={data.fitness_goals}
              onChange={(e) => update("fitness_goals", e.target.value)}
              placeholder="What do you want to achieve? e.g. lose weight, build muscle, improve energy..."
            />
            <Select
              label="Activity Level"
              options={activityOptions}
              value={data.activity_level}
              onChange={(e) =>
                update("activity_level", e.target.value)
              }
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-6">Health & Diet</h2>
            <TextArea
              label="Dietary Restrictions"
              value={data.dietary_restrictions}
              onChange={(e) => update("dietary_restrictions", e.target.value)}
              placeholder="Any allergies, intolerances, or dietary preferences? e.g. vegetarian, gluten-free, nut allergy..."
            />
            <TextArea
              label="Health Conditions"
              value={data.health_conditions}
              onChange={(e) => update("health_conditions", e.target.value)}
              placeholder="Any conditions or injuries we should know about?"
            />
            <TextArea
              label="Anything else?"
              value={data.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Anything else you'd like your coach to know?"
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-6">Create Your Account</h2>
            <Input label="Email" value={email} disabled />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Type your password again"
            />
          </div>
        )}

        {error && (
          <p className="text-red-400 text-sm mt-4">{error}</p>
        )}

        <div className="flex justify-between mt-8">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          ) : (
            <div />
          )}

          {isLastStep ? (
            <Button onClick={handleSubmit} disabled={loading} style={{ backgroundColor: branding.brand_primary_color }}>
              {loading ? "Setting up..." : "Finish Onboarding"}
            </Button>
          ) : (
            <Button onClick={() => setStep(step + 1)} style={{ backgroundColor: branding.brand_primary_color }}>
              Continue
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
