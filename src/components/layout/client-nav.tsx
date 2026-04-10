"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  UtensilsCrossed,
  TrendingUp,
  User,
  Calendar,
  LogOut,
  Dumbbell,
  Lightbulb,
  ClipboardCheck,
  HeartHandshake,
} from "lucide-react"
import { DEFAULT_COACH_BRANDING, type CoachBranding } from "@/lib/branding"
import { canAccessFeature } from "@/lib/modules"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/requests", label: "Requests", icon: Lightbulb },
  { href: "/training", label: "Training", icon: Dumbbell, feature: "client_portal_training" as const },
  { href: "/meal-plan", label: "Meal Plan", icon: UtensilsCrossed, feature: "client_portal_meal_plan" as const },
  { href: "/nutrition", label: "Nutrition", icon: ClipboardCheck, feature: "client_portal_meal_plan" as const },
  { href: "/wellness", label: "Wellness", icon: HeartHandshake, feature: "client_portal_wellness" as const },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/appointments", label: "Appointments", icon: Calendar },
  { href: "/profile", label: "Profile", icon: User },
]

export function ClientNav({
  branding: initialBranding,
  activeModules: initialActiveModules,
}: {
  branding?: CoachBranding
  activeModules?: string[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [branding, setBranding] = useState<CoachBranding>(initialBranding ?? DEFAULT_COACH_BRANDING)
  const [activeModules, setActiveModules] = useState<string[]>(initialActiveModules ?? ["shared_core"])

  useEffect(() => {
    if (initialBranding && initialActiveModules) {
      return
    }

    fetch("/api/client/portal")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) {
          setBranding(DEFAULT_COACH_BRANDING)
          setActiveModules(["shared_core"])
          return
        }

        setBranding(data)
        setActiveModules(Array.isArray(data.active_modules) ? data.active_modules : ["shared_core"])
      })
      .catch(() => {
        setBranding(DEFAULT_COACH_BRANDING)
        setActiveModules(["shared_core"])
      })
  }, [initialActiveModules, initialBranding])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-64 min-h-screen bg-gf-dark border-r border-gf-border p-6">
        <Link href="/dashboard" className="mb-10">
          <div className="flex items-center gap-3">
            {branding.brand_logo_url ? (
              <img
                src={branding.brand_logo_url}
                alt={`${branding.brand_title} logo`}
                className="h-10 w-10 rounded-xl object-cover"
              />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: branding.brand_primary_color }}
              >
                {branding.brand_title.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold" style={{ color: branding.brand_primary_color }}>
                {branding.brand_title}
              </h1>
              <p className="text-xs text-gf-muted">Your coaching portal</p>
            </div>
          </div>
        </Link>

        <div className="flex flex-col gap-1 flex-1">
          {navItems
            .filter((item) => !item.feature || canAccessFeature(item.feature, activeModules))
            .map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors",
                pathname === href
                  ? "font-medium"
                  : "text-gf-muted hover:text-white hover:bg-gf-surface"
              )}
              style={
                pathname === href
                  ? {
                      color: branding.brand_primary_color,
                      backgroundColor: `${branding.brand_primary_color}18`,
                    }
                  : undefined
              }
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gf-muted hover:text-white hover:bg-gf-surface transition-colors"
        >
          <LogOut size={18} />
          Log out
        </button>

      </nav>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gf-dark border-t border-gf-border z-50">
        <div className="flex justify-around py-2">
          {navItems
            .filter((item) => !item.feature || canAccessFeature(item.feature, activeModules))
            .map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 text-xs transition-colors",
                pathname === href ? "" : "text-gf-muted"
              )}
              style={pathname === href ? { color: branding.brand_primary_color } : undefined}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
