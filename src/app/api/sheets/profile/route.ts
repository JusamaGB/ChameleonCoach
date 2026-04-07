import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/google/sheets"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: client } = await supabase
    .from("clients")
    .select("sheet_id, coach_id")
    .eq("user_id", user.id)
    .single()

  if (!client?.sheet_id || !client?.coach_id) {
    return NextResponse.json({ profile: null })
  }

  try {
    const profile = await getProfile(client.sheet_id, client.coach_id)
    return NextResponse.json({ profile })
  } catch {
    return NextResponse.json({ profile: null })
  }
}
