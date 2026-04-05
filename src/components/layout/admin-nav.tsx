"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { LayoutDashboard, UserPlus, Settings, LogOut } from "lucide-react"

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/invite", label: "Invite Client", icon: UserPlus },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <nav className="flex flex-col w-64 min-h-screen bg-gf-dark border-r border-gf-border p-6">
      <Link href="/admin" className="mb-2">
        <h1 className="text-2xl font-bold">
          <span className="text-gf-pink">G</span>-Fitness
        </h1>
      </Link>
      <p className="text-xs text-gf-muted mb-10">Admin Panel</p>

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
  )
}
