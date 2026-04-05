import { NextResponse } from "next/server"
import { createClient, createAdmin } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdmin()
  const { data: clients } = await admin
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false })

  return NextResponse.json({ clients: clients || [] })
}
