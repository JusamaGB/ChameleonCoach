import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check admin by email
  const adminEmails = ["kris.deane93@gmail.com"]
  if (!user.email || !adminEmails.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false })

  return NextResponse.json({ clients: clients || [] })
}
