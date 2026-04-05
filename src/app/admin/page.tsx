import { createAdmin } from "@/lib/supabase/server"
import { Card, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Users, UserPlus, CheckCircle, Clock } from "lucide-react"

export default async function AdminDashboard() {
  const supabase = createAdmin()

  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false })

  const allClients = clients || []
  const active = allClients.filter((c) => c.onboarding_completed)
  const pending = allClients.filter(
    (c) => !c.onboarding_completed && !c.invite_accepted_at
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

      {/* Client list */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Clients</CardTitle>
          <Link
            href="/admin/invite"
            className="flex items-center gap-1.5 text-sm text-gf-pink hover:text-gf-pink-light transition-colors"
          >
            <UserPlus size={16} />
            Invite
          </Link>
        </div>

        {allClients.length === 0 ? (
          <p className="text-sm text-gf-muted py-4">
            No clients yet.{" "}
            <Link href="/admin/invite" className="text-gf-pink hover:underline">
              Send your first invite
            </Link>
          </p>
        ) : (
          <div className="space-y-1">
            {allClients.map((client) => (
              <Link
                key={client.id}
                href={`/admin/clients/${client.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gf-black transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {client.name}
                  </p>
                  <p className="text-xs text-gf-muted">{client.email}</p>
                </div>
                <div>
                  {client.onboarding_completed ? (
                    <Badge variant="success">Active</Badge>
                  ) : client.invite_accepted_at ? (
                    <Badge variant="warning">Onboarding</Badge>
                  ) : (
                    <Badge>Invited</Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
