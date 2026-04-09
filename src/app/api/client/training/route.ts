import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getClientTrainingForUser, logPTSessionForClient } from "@/lib/pt"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const training = await getClientTrainingForUser(supabase, user.id)
    return NextResponse.json(training ?? { assignment: null, sessions: [] })
  } catch {
    return NextResponse.json({ error: "Failed to load training" }, { status: 500 })
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

  const body = await request.json()
  if (typeof body.client_session_id !== "string" || body.client_session_id.length === 0) {
    return NextResponse.json({ error: "client_session_id is required" }, { status: 400 })
  }

  try {
    await logPTSessionForClient(supabase, user.id, {
      client_session_id: body.client_session_id,
      completion_status: body.completion_status === "skipped" ? "skipped" : body.completion_status === "partial" ? "partial" : "completed",
      session_rpe: body.session_rpe,
      energy_rating: body.energy_rating,
      client_feedback: body.client_feedback,
      client_note: body.client_note,
      exercises: Array.isArray(body.exercises) ? body.exercises : [],
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save workout log" },
      { status: 500 }
    )
  }
}
