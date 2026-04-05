import { createClient } from "@/lib/supabase/server"
import { Card } from "@/components/ui/card"
import { ClientList } from "@/components/admin/client-list"
import { Users, CheckCircle, Clock } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false })

  const allClients = clients || []
  const active = allClients.filter(
    (c: { onboarding_completed: boolean }) => c.onboarding_completed
  )
  const pending = allClients.filter(
    (c: { onboarding_completed: boolean; invite_accepted_at: string | null }) =>
      !c.onboarding_completed && !c.invite_accepted_at
  )

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-gf-muted mb-8">Manage your clients</p>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <div className="flex items-center gap-3">
            <Users size={20} className="text-gf-pink" />
            <div>
              <p className="text-2xl font-bold">{allClients.length}</p>
              <p className="text-xs text-gf-muted">Total Clients</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <CheckCircle size={20} className="text-green-400" />
            <div>
              <p className="text-2xl font-bold">{active.length}</p>
              <p className="text-xs text-gf-muted">Active</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <Clock size={20} className="text-yellow-400" />
            <div>
              <p className="text-2xl font-bold">{pending.length}</p>
              <p className="text-xs text-gf-muted">Pending Invite</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Client list with search/filter */}
      <ClientList clients={allClients} />
    </div>
  )
}
