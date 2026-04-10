import { NextResponse, type NextRequest } from "next/server"
import { createAdmin, createClient } from "@/lib/supabase/server"
import { createClientWellnessCheckInForUser } from "@/lib/wellness"

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
    const checkIn = await createClientWellnessCheckInForUser(admin, user.id, {
      submitted_at: body.submitted_at || null,
      week_label: body.week_label,
      energy_score: body.energy_score,
      stress_score: body.stress_score,
      sleep_score: body.sleep_score,
      confidence_score: body.confidence_score,
      wins: body.wins,
      blockers: body.blockers,
      focus_for_next_week: body.focus_for_next_week,
    })
    return NextResponse.json({ ok: true, check_in: checkIn })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save wellness check-in" },
      { status: 400 }
    )
  }
}
