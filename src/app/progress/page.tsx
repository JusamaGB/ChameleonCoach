import { createClient } from "@/lib/supabase/server"
import { getProgress } from "@/lib/google/sheets"
import { ClientNav } from "@/components/layout/client-nav"
import { ProgressForm } from "@/components/progress/progress-form"
import { ProgressChart, ProgressHistory } from "@/components/progress/progress-chart"
import { redirect } from "next/navigation"

export default async function ProgressPage() {
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

  let progress = []

  if (client?.sheet_id) {
    try {
      progress = await getProgress(client.sheet_id)
    } catch {
      // Sheet not accessible
    }
  }

  return (
    <div className="flex min-h-screen">
      <ClientNav />
      <main className="flex-1 p-6 md:p-10 pb-24 md:pb-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Progress</h1>
          <p className="text-gf-muted mb-8">
            Track your journey and see how far you&apos;ve come
          </p>

          <div className="grid gap-6">
            <ProgressForm />
            <ProgressChart entries={progress} />
            <ProgressHistory entries={progress} />
          </div>
        </div>
      </main>
    </div>
  )
}
