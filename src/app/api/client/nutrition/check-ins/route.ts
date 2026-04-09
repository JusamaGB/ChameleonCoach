import { NextResponse, type NextRequest } from "next/server"
import { createAdmin, createClient } from "@/lib/supabase/server"
import { createClientNutritionCheckInForUser } from "@/lib/nutrition"

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
    const checkIn = await createClientNutritionCheckInForUser(admin, user.id, {
      submitted_at: body.submitted_at || null,
      week_label: body.week_label,
      adherence_score: body.adherence_score,
      energy_score: body.energy_score,
      hunger_score: body.hunger_score,
      digestion_score: body.digestion_score,
      sleep_score: body.sleep_score,
      wins: body.wins,
      struggles: body.struggles,
    })
    return NextResponse.json({ ok: true, check_in: checkIn })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save nutrition check-in" },
      { status: 400 }
    )
  }
}
