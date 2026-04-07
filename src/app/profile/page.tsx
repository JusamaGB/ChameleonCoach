import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/google/sheets"
import { ClientNav } from "@/components/layout/client-nav"
import { Card } from "@/components/ui/card"
import { LogoutButton } from "@/components/logout-button"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", user.id)
    .single()

  let profile = null

  if (client?.sheet_id && client?.coach_id) {
    try {
      profile = await getProfile(client.sheet_id, client.coach_id)
    } catch {
      // Sheet not accessible
    }
  }

  const fields = profile
    ? [
        { label: "Name", value: profile.name },
        { label: "Email", value: profile.email || user.email },
        { label: "Age", value: profile.age },
        { label: "Gender", value: profile.gender },
        { label: "Height", value: profile.height },
        { label: "Current Weight", value: profile.current_weight },
        { label: "Goal Weight", value: profile.goal_weight },
        { label: "Fitness Goals", value: profile.fitness_goals },
        { label: "Dietary Restrictions", value: profile.dietary_restrictions },
        { label: "Health Conditions", value: profile.health_conditions },
        { label: "Activity Level", value: profile.activity_level },
        { label: "Notes", value: profile.notes },
      ]
    : []

  return (
    <div className="flex min-h-screen">
      <ClientNav />
      <main className="flex-1 p-6 md:p-10 pb-24 md:pb-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Profile</h1>
          <p className="text-gf-muted mb-8">Your details on file</p>

          {profile ? (
            <Card>
              <div className="space-y-4">
                {fields.map(
                  ({ label, value }) =>
                    value && (
                      <div key={label}>
                        <p className="text-xs text-gf-muted font-medium">
                          {label}
                        </p>
                        <p className="text-white mt-0.5">{value}</p>
                      </div>
                    )
                )}
              </div>
            </Card>
          ) : (
            <Card className="text-center py-8">
              <p className="text-gf-muted">Profile data not available yet</p>
            </Card>
          )}

          <LogoutButton />
        </div>
      </main>
    </div>
  )
}
