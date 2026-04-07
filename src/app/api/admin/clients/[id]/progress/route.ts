import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { addProgressEntry } from "@/lib/google/sheets"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result

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
    await addProgressEntry(client.sheet_id, { date, weight, measurements, notes }, user.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to add progress entry" },
      { status: 500 }
    )
  }
}
