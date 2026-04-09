"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Calendar,
  Layers3,
  Menu,
  X,
  Gem,
} from "lucide-react"
import { PLATFORM_NAME } from "@/lib/platform"
import { canAccessFeature } from "@/lib/modules"

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/appointments", label: "Appointments", icon: Calendar },
  { href: "/admin/exercises", label: "Exercises", icon: Layers3, feature: "exercises" as const },
  { href: "/admin/workouts", label: "Workouts", icon: Layers3, feature: "workouts" as const },
  { href: "/admin/programs", label: "Programs", icon: Layers3, feature: "programs" as const },
  { href: "/admin/modules", label: "Modules", icon: Layers3 },
  { href: "/admin/premium", label: "Premium", icon: Gem },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export function AdminNav({
  activeModules = ["shared_core"],
}: {
  activeModules?: string[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  function isActiveNavItem(href: string) {
    if (href === "/admin") {
      return pathname === href
    }

    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const navContent = (
    <>
      <div className="flex items-center justify-between mb-2">
        <Link href="/admin" onClick={() => setOpen(false)}>
          <h1 className="text-2xl font-bold">{PLATFORM_NAME}</h1>
        </Link>
        <button
          onClick={() => setOpen(false)}
          className="md:hidden p-1 text-gf-muted hover:text-white"
        >
          <X size={20} />
        </button>
      </div>
      <p className="text-xs text-gf-muted mb-10">Admin Panel</p>

      <div className="flex flex-col gap-1 flex-1">
        {navItems
          .filter((item) => !item.feature || canAccessFeature(item.feature, activeModules))
          .map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors",
              isActiveNavItem(href)
                ? "bg-gf-pink/10 text-gf-pink font-medium"
                : "text-gf-muted hover:text-white hover:bg-gf-surface"
            )}
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
    </>
  )

  return (
    <>
      {/* Mobile header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-gf-dark border-b border-gf-border px-4 h-14">
        <span className="font-bold text-lg">{PLATFORM_NAME}</span>
        <button
          onClick={() => setOpen(true)}
          className="p-1 text-gf-muted hover:text-white"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <nav
        className={cn(
          "md:hidden fixed top-0 left-0 z-50 h-full w-64 bg-gf-dark border-r border-gf-border p-6 flex flex-col transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </nav>

      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-64 min-h-screen bg-gf-dark border-r border-gf-border p-6">
        {navContent}
      </nav>
    </>
  )
}
