import { NextResponse, type NextRequest } from "next/server"
import { createAdmin, createClient } from "@/lib/supabase/server"
import { createClientNutritionLogEntryForUser } from "@/lib/nutrition"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const admin = createAdmin()
    const body = await request.json()
    if (typeof body.entry_title !== "string" || body.entry_title.trim().length === 0) {
      return NextResponse.json({ error: "Entry title is required" }, { status: 400 })
    }
    const log = await createClientNutritionLogEntryForUser(admin, user.id, {
      logged_at: body.logged_at || null,
      meal_slot: body.meal_slot,
      entry_title: body.entry_title,
      notes: body.notes,
      adherence_flag: body.adherence_flag,
      hunger_score: body.hunger_score,
    })
    return NextResponse.json({ ok: true, log })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save nutrition log" },
      { status: 400 }
    )
  }
}
