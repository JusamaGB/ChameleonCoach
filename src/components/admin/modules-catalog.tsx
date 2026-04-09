"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { MODULE_LABELS, type CoachTypePreset, type EnableableModule } from "@/lib/modules"
import { ArrowRight, CheckCircle, Dumbbell, Layers3 } from "lucide-react"

const COACH_TYPE_LABELS: Record<CoachTypePreset, string> = {
  personal_trainer: "Personal trainer",
  nutritionist: "Nutritionist",
  wellness_coach: "Wellness coach",
  sports_performance_coach: "Sports performance coach",
  yoga_pilates_instructor: "Yoga / Pilates instructor",
  gym_studio_owner: "Gym / studio owner",
}

type ProfilePayload = {
  display_name: string
  business_name: string
  brand_title: string
  brand_logo_url: string
  brand_primary_color: string
  brand_accent_color: string
  brand_welcome_text: string
  show_powered_by: boolean
  coach_type_preset: CoachTypePreset | null
  active_modules: EnableableModule[]
  appointment_booking_mode: string
  is_legacy_workspace: boolean
}

const EMPTY_PROFILE: ProfilePayload = {
  display_name: "",
  business_name: "",
  brand_title: "",
  brand_logo_url: "",
  brand_primary_color: "#ff2d8a",
  brand_accent_color: "#f472b6",
  brand_welcome_text: "",
  show_powered_by: true,
  coach_type_preset: null,
  active_modules: [],
  appointment_booking_mode: "coach_only",
  is_legacy_workspace: false,
}

const MODULE_DESCRIPTIONS: Record<EnableableModule, string> = {
  pt_core: "Exercise library and future training/programming capabilities. Enable here at the workspace level, then apply PT work inside each client workspace.",
  nutrition_core: "Meal-plan and nutrition-oriented client work. Enable it once for this workspace, then manage each client's nutrition work from their workspace.",
}

const MODULE_TOOL_LINKS: Partial<Record<EnableableModule, Array<{ href: string; label: string }>>> = {
  pt_core: [
    { href: "/admin/exercises", label: "Exercise library" },
    { href: "/admin/workouts", label: "Workout builder" },
    { href: "/admin/programs", label: "Programs" },
  ],
  nutrition_core: [
    { href: "/admin/recipes", label: "Recipe library" },
    { href: "/admin/nutrition-templates", label: "Meal plan templates" },
    { href: "/admin/nutrition-habits", label: "Nutrition habits" },
  ],
}

export function ModulesCatalog() {
  const [profile, setProfile] = useState<ProfilePayload>(EMPTY_PROFILE)
  const [loading, setLoading] = useState(true)
  const [loadedProfile, setLoadedProfile] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/admin/profile")
      .then((res) => res.json())
      .then((data) => {
        setProfile({
          display_name: data.display_name ?? "",
          business_name: data.business_name ?? "",
          brand_title: data.brand_title ?? "",
          brand_logo_url: data.brand_logo_url ?? "",
          brand_primary_color: data.brand_primary_color ?? EMPTY_PROFILE.brand_primary_color,
          brand_accent_color: data.brand_accent_color ?? EMPTY_PROFILE.brand_accent_color,
          brand_welcome_text: data.brand_welcome_text ?? "",
          show_powered_by: data.show_powered_by ?? true,
          coach_type_preset: data.coach_type_preset ?? null,
          active_modules: Array.isArray(data.active_modules) ? data.active_modules : [],
          appointment_booking_mode: data.appointment_booking_mode ?? "coach_only",
          is_legacy_workspace: Boolean(data.is_legacy_workspace),
        })
        setLoadedProfile(true)
      })
      .catch(() => {
        setError("Failed to load module settings.")
      })
      .finally(() => setLoading(false))
  }, [])

  function toggleModule(module: EnableableModule) {
    setProfile((current) => ({
      ...current,
      active_modules: current.active_modules.includes(module)
        ? current.active_modules.filter((entry) => entry !== module)
        : [...current.active_modules, module],
    }))
  }

  async function saveModules() {
    setSaving(true)
    setSaved(false)
    setError("")

    try {
      const response = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: profile.display_name,
          business_name: profile.business_name,
          brand_title: profile.brand_title,
          brand_logo_url: profile.brand_logo_url,
          brand_primary_color: profile.brand_primary_color,
          brand_accent_color: profile.brand_accent_color,
          brand_welcome_text: profile.brand_welcome_text,
          show_powered_by: profile.show_powered_by,
          coach_type_preset: profile.coach_type_preset,
          active_modules: profile.active_modules,
          appointment_booking_mode: profile.appointment_booking_mode,
        }),
      })

      if (!response.ok) {
        throw new Error()
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError("Failed to save module settings.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Modules</h1>
          <p className="mt-2 text-gf-muted">
            Enable module bundles at the workspace level here, then use them from inside each client's workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="pink">Workspace-level</Badge>
          <Badge variant="default">Client use happens in context</Badge>
        </div>
      </div>

      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>How modules work</CardTitle>
            <p className="mt-2 text-sm text-gf-muted">
              Coach type is a starting preset. Active modules are the entitlement layer for this workspace.
            </p>
          </div>
          <div className="rounded-xl border border-gf-border bg-gf-black px-4 py-3 text-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-gf-muted">Coach type preset</p>
            <p className="mt-1 font-medium text-white">
              {profile.coach_type_preset ? COACH_TYPE_LABELS[profile.coach_type_preset] : "Legacy workspace"}
            </p>
          </div>
        </div>
        {profile.is_legacy_workspace ? (
          <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
            <p className="text-sm text-yellow-200">Legacy workspace detected.</p>
            <p className="mt-1 text-xs text-gf-muted">
              PT Core stays available by default so existing exercise-library access is preserved while the IA is corrected.
            </p>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {(["pt_core", "nutrition_core"] as EnableableModule[]).map((module) => {
          const enabled = profile.active_modules.includes(module)

          return (
            <Card key={module} className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle>{MODULE_LABELS[module]}</CardTitle>
                    <Badge variant={enabled ? "success" : "default"}>
                      {enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-gf-muted">{MODULE_DESCRIPTIONS[module]}</p>
                </div>
                <div className="rounded-xl border border-gf-border bg-gf-black p-3 text-gf-pink">
                  {module === "pt_core" ? <Dumbbell size={18} /> : <Layers3 size={18} />}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-gf-border bg-gf-black p-4 text-sm text-gf-muted">
                <p className="font-medium text-white">Usage model</p>
                <p className="mt-1">
                  Enable the bundle here, then open a client to work on their specific profile, plan, progress, or other client-scoped surfaces.
                </p>
              </div>

              <div className="mt-4 space-y-3">
                <p className="text-xs text-gf-muted">
                  {enabled || profile.is_legacy_workspace
                    ? module === "pt_core"
                      ? "PT tools live inside the module layer instead of the main sidebar. Client-specific PT delivery still happens from each client workspace."
                      : "Nutrition tools live inside the module layer instead of the main sidebar. Client-specific nutrition delivery still happens from each client workspace."
                    : "These module sections are ready here. Enable the bundle first, then use them at the workspace level before delivering the work inside each client workspace."}
                </p>
                <div className="flex flex-wrap gap-3">
                  {(MODULE_TOOL_LINKS[module] ?? []).map((tool) => (
                    <Link
                      key={tool.href}
                      href={tool.href}
                      className="inline-flex items-center gap-1.5 text-sm text-gf-pink hover:text-gf-pink-light transition-colors"
                    >
                      {tool.label}
                      <ArrowRight size={14} />
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => toggleModule(module)}
                  className={`inline-flex rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    enabled
                      ? "border-gf-pink/40 bg-gf-pink/10 text-gf-pink hover:bg-gf-pink/15"
                      : "border-gf-border bg-gf-surface text-white hover:border-gf-pink/40"
                  }`}
                >
                  {enabled ? "Disable bundle" : "Enable bundle"}
                </button>
              </div>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardTitle>Coming soon bundles</CardTitle>
        <p className="mt-2 text-sm text-gf-muted">
          Wellness, sports performance, yoga / Pilates, and studio-specific bundles will expand here without changing the client-first workspace model.
        </p>
      </Card>

      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Save module entitlements</CardTitle>
            <p className="mt-2 text-sm text-gf-muted">
              This page controls workspace-level availability only. Client-specific work still happens after selecting a client.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {loading ? <span className="text-sm text-gf-muted">Loading module settings...</span> : null}
            {error ? <span className="text-sm text-red-400">{error}</span> : null}
            {saved ? (
              <span className="flex items-center gap-1 text-sm text-green-400">
                <CheckCircle size={14} /> Saved
              </span>
            ) : null}
            <Button onClick={saveModules} disabled={saving || loading || !loadedProfile}>
              {saving ? "Saving..." : "Save Modules"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
