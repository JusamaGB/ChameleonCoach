"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  UtensilsCrossed,
  TrendingUp,
  User,
  LogOut,
} from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/meal-plan", label: "Meal Plan", icon: UtensilsCrossed },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/profile", label: "Profile", icon: User },
]

export function ClientNav() {
  const pathname = usePathname()
  const router = useRouter()

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
          <h1 className="text-2xl font-bold">
            <span className="text-gf-pink">G</span>-Fitness
          </h1>
        </Link>

        <div className="flex flex-col gap-1 flex-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors",
                pathname === href
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
      </nav>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gf-dark border-t border-gf-border z-50">
        <div className="flex justify-around py-2">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 text-xs transition-colors",
                pathname === href ? "text-gf-pink" : "text-gf-muted"
              )}
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
