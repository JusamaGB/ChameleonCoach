import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import {
  createClientNutritionLogEntry,
  listClientNutritionLogEntriesForCoach,
} from "@/lib/nutrition"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const { id } = await params

  try {
    const logs = await listClientNutritionLogEntriesForCoach(supabase, user.id, id)
    return NextResponse.json({ logs })
  } catch {
    return NextResponse.json({ error: "Failed to load nutrition logs" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const { id } = await params
  const body = await request.json()

  if (typeof body.entry_title !== "string" || body.entry_title.trim().length === 0) {
    return NextResponse.json({ error: "Entry title is required" }, { status: 400 })
  }

  try {
    const log = await createClientNutritionLogEntry(supabase, user.id, id, body)
    return NextResponse.json({ log })
  } catch {
    return NextResponse.json({ error: "Failed to create nutrition log" }, { status: 500 })
  }
}
