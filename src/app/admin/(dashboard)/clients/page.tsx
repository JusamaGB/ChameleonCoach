import { AdminClientsIndex } from "@/components/admin/admin-clients-index"

export const dynamic = "force-dynamic"

export default function AdminClientsPage() {
  return (
    <AdminClientsIndex
      title="Clients"
      description="Choose a client to open their workspace."
    />
  )
}
