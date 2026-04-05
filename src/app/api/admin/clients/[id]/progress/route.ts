import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { addProgressEntry } from "@/lib/google/sheets"

const adminEmails = ["kris.deane93@gmail.com"]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email || !adminEmails.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const { data: client } = await supabase
    .from("clients")
    .select("sheet_id")
    .eq("id", id)
    .single()

  if (!client?.sheet_id) {
    return NextResponse.json(
      { error: "Client has no linked spreadsheet" },
      { status: 400 }
    )
  }

  const { date, weight, measurements, notes } = await request.json()

  try {
    await addProgressEntry(client.sheet_id, { date, weight, measurements, notes })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to add progress entry" },
      { status: 500 }
    )
  }
}
