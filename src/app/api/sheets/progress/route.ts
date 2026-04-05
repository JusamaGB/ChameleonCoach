import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getProgress, addProgressEntry } from "@/lib/google/sheets"

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
    .select("sheet_id")
    .eq("user_id", user.id)
    .single()

  if (!client?.sheet_id) {
    return NextResponse.json({ progress: [] })
  }

  try {
    const progress = await getProgress(client.sheet_id)
    return NextResponse.json({ progress })
  } catch {
    return NextResponse.json({ progress: [] })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: client } = await supabase
    .from("clients")
    .select("sheet_id")
    .eq("user_id", user.id)
    .single()

  if (!client?.sheet_id) {
    return NextResponse.json({ error: "No sheet found" }, { status: 400 })
  }

  const entry = await request.json()

  try {
    await addProgressEntry(client.sheet_id, entry)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "Failed to save progress" },
      { status: 500 }
    )
  }
}
