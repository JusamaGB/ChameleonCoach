import { redirect } from "next/navigation"
import { ClientNav } from "@/components/layout/client-nav"
import { RequestsBoard } from "@/components/requests/requests-board"
import { createAdmin, createClient } from "@/lib/supabase/server"
import { getClientPortalContext } from "@/lib/client-portal"
import { getRequestViewerContext, getRequestsBoardData } from "@/lib/requests"

export const dynamic = "force-dynamic"

export default async function RequestsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const admin = createAdmin()
  const viewer = await getRequestViewerContext(admin, user.id, user.email)
  const data = await getRequestsBoardData(admin, viewer)
  const portal = await getClientPortalContext(user.id)

  return (
    <div className="flex min-h-screen">
      <ClientNav branding={portal.branding} activeModules={portal.modules.active_modules} />
      <main className="flex-1 p-6 md:p-10 pb-24 md:pb-10">
        <div className="mx-auto max-w-7xl">
          <RequestsBoard initialData={data} variant="client" />
        </div>
      </main>
    </div>
  )
}
