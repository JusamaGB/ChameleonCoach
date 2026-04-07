import { AdminNav } from "@/components/layout/admin-nav"

export const dynamic = 'force-dynamic'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 p-6 md:p-10 pt-20 md:pt-6">{children}</main>
    </div>
  )
}
