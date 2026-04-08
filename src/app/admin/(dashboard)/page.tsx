import { AdminClientsIndex } from "@/components/admin/admin-clients-index"

export const dynamic = 'force-dynamic'

export default function AdminDashboard() {
  return (
    <AdminClientsIndex
      title="Dashboard"
      description="Workspace overview with quick access to client work."
    />
  )
}
