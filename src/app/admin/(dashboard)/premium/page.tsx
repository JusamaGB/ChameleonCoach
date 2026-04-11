"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input, TextArea } from "@/components/ui/input"
import { Card, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"
import { DEFAULT_COACH_BRANDING } from "@/lib/branding"

export default function PremiumPage() {
  const [brandTitle, setBrandTitle] = useState(DEFAULT_COACH_BRANDING.brand_title)
  const [brandLogoUrl, setBrandLogoUrl] = useState("")
  const [brandPrimaryColor, setBrandPrimaryColor] = useState(
    DEFAULT_COACH_BRANDING.brand_primary_color
  )
  const [brandAccentColor, setBrandAccentColor] = useState(
    DEFAULT_COACH_BRANDING.brand_accent_color
  )
  const [brandWelcomeText, setBrandWelcomeText] = useState(
    DEFAULT_COACH_BRANDING.brand_welcome_text
  )
  const [showPoweredBy, setShowPoweredBy] = useState(true)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/admin/profile")
      .then((res) => res.json())
      .then((data) => {
        setBrandTitle(data.brand_title ?? DEFAULT_COACH_BRANDING.brand_title)
        setBrandLogoUrl(data.brand_logo_url ?? "")
        setBrandPrimaryColor(
          data.brand_primary_color ?? DEFAULT_COACH_BRANDING.brand_primary_color
        )
        setBrandAccentColor(
          data.brand_accent_color ?? DEFAULT_COACH_BRANDING.brand_accent_color
        )
        setBrandWelcomeText(
          data.brand_welcome_text ?? DEFAULT_COACH_BRANDING.brand_welcome_text
        )
        setShowPoweredBy(data.show_powered_by ?? true)
      })
      .catch(() => {})
  }, [])

  async function saveBranding(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSaved(false)
    setError("")

    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_title: brandTitle,
          brand_logo_url: brandLogoUrl,
          brand_primary_color: brandPrimaryColor,
          brand_accent_color: brandAccentColor,
          brand_welcome_text: brandWelcomeText,
          show_powered_by: showPoweredBy,
        }),
      })

      if (!res.ok) throw new Error()

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError("Failed to save. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">Premium</h1>
      <p className="text-gf-muted mb-8">Premium features, migration tooling, and client branding</p>

      <Card className="mb-8">
        <CardTitle>AI Migration</CardTitle>
        <p className="mt-2 text-sm text-gf-muted">
          The migration assistant now lives as a floating widget across the coach admin area. Use it to inspect legacy Google Sheets, select the Chameleon client they belong to, and review proposed tab mappings before we wire in the actual import step.
        </p>
      </Card>

      <Card>
        <CardTitle>Client Branding</CardTitle>
        <p className="text-sm text-gf-muted mt-2 mb-4">
          Lightweight branding for client-facing, invite, and onboarding surfaces.
        </p>
        <form onSubmit={saveBranding} className="space-y-4">
          <Input
            label="Brand Title"
            value={brandTitle}
            onChange={(e) => setBrandTitle(e.target.value)}
            placeholder="e.g. Eliot Nutrition"
          />
          <Input
            label="Logo URL"
            value={brandLogoUrl}
            onChange={(e) => setBrandLogoUrl(e.target.value)}
            placeholder="https://..."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Primary Color"
              type="color"
              value={brandPrimaryColor}
              onChange={(e) => setBrandPrimaryColor(e.target.value)}
              className="h-12"
            />
            <Input
              label="Accent Color"
              type="color"
              value={brandAccentColor}
              onChange={(e) => setBrandAccentColor(e.target.value)}
              className="h-12"
            />
          </div>
          <TextArea
            label="Welcome Text"
            value={brandWelcomeText}
            onChange={(e) => setBrandWelcomeText(e.target.value)}
            placeholder="Short welcome shown to clients during onboarding and in the client portal."
          />
          <label className="flex items-center gap-3 text-sm text-white">
            <input
              type="checkbox"
              checked={showPoweredBy}
              onChange={(e) => setShowPoweredBy(e.target.checked)}
              className="h-4 w-4 rounded border-gf-border bg-gf-surface"
            />
            Show "Powered by Chameleon Coach"
          </label>
          <div className="rounded-xl border border-gf-border bg-gf-surface p-4">
            <div className="flex items-center gap-3">
              {brandLogoUrl ? (
                <img
                  src={brandLogoUrl}
                  alt={`${brandTitle || "Brand"} logo`}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ backgroundColor: brandPrimaryColor }}
                >
                  {(brandTitle || "C").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold" style={{ color: brandPrimaryColor }}>
                  {brandTitle || DEFAULT_COACH_BRANDING.brand_title}
                </p>
                <p className="text-sm" style={{ color: brandAccentColor }}>
                  {brandWelcomeText || DEFAULT_COACH_BRANDING.brand_welcome_text}
                </p>
              </div>
            </div>
            {showPoweredBy && (
              <p className="mt-4 text-xs text-gf-muted/70">Powered by Chameleon Coach</p>
            )}
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={loading} size="sm">
              {loading ? "Saving..." : "Save Branding"}
            </Button>
            {saved && (
              <span className="text-sm text-green-400 flex items-center gap-1">
                <CheckCircle size={14} /> Saved
              </span>
            )}
          </div>
        </form>
      </Card>
    </div>
  )
}
