import { redirect } from "next/navigation"
import { RequestsBoard } from "@/components/requests/requests-board"
import { createAdmin, createClient } from "@/lib/supabase/server"
import { getRequestViewerContext, getRequestsBoardData } from "@/lib/requests"

export const dynamic = "force-dynamic"

export default async function AdminRequestsPage() {
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

  return <RequestsBoard initialData={data} variant="coach" />
}
