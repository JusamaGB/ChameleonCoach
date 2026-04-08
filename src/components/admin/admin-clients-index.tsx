import { createClient } from "@/lib/supabase/server"
import { listClientsForCoach } from "@/lib/clients"
import { Card } from "@/components/ui/card"
import { ClientList } from "@/components/admin/client-list"
import { Users, CheckCircle, Clock } from "lucide-react"

interface AdminClientsIndexProps {
  title: string
  description: string
}

export async function AdminClientsIndex({
  title,
  description,
}: AdminClientsIndexProps) {
  const supabase = await createClient()

  let allClients: Record<string, unknown>[] = []
  let dbError: string | null = null

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      dbError = "Coach session not found"
    } else {
      const { data: clients, error } = await listClientsForCoach(supabase, user.id)

      if (error) {
        dbError = error.message
      } else {
        allClients = clients || []
      }
    }
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Failed to load clients"
  }

  const active = allClients.filter((client) => client.onboarding_completed === true)
  const pending = allClients.filter(
    (client) => client.onboarding_completed !== true && !client.invite_accepted_at
  )

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-gf-muted mb-8">{description}</p>

      {dbError && (
        <Card className="mb-8">
          <p className="text-sm text-yellow-400">
            Database notice: {dbError}
          </p>
          <p className="text-xs text-gf-muted mt-1">
            The clients table may need to be created. Check Supabase SQL editor.
          </p>
        </Card>
      )}

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

      <ClientList clients={allClients as any} />
    </div>
  )
}
