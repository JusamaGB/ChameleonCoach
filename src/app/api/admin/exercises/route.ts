import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { syncCoachPTWorkbookForCoach } from "@/lib/pt"

function normalizeExerciseInput(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const category = typeof body.category === "string" ? body.category.trim() : ""
  const description =
    typeof body.description === "string" && body.description.trim().length > 0
      ? body.description.trim()
      : null
  const coaching_notes =
    typeof body.coaching_notes === "string" && body.coaching_notes.trim().length > 0
      ? body.coaching_notes.trim()
      : null
  const media_url =
    typeof body.media_url === "string" && body.media_url.trim().length > 0
      ? body.media_url.trim()
      : null

  return { name, category, description, coaching_notes, media_url }
}

export async function GET() {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result

  const { data: exercises, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("coach_id", user.id)
    .order("name", { ascending: true })

  if (error) {
    return NextResponse.json({ error: "Failed to load exercises" }, { status: 500 })
  }

  return NextResponse.json({ exercises: exercises ?? [] })
}

export async function POST(request: NextRequest) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result

  const body = await request.json()
  const payload = normalizeExerciseInput(body)

  if (!payload.name || !payload.category) {
    return NextResponse.json(
      { error: "name and category are required" },
      { status: 400 }
    )
  }

  const { data: exercise, error } = await supabase
    .from("exercises")
    .insert({
      coach_id: user.id,
      ...payload,
    })
    .select("*")
    .single()

  if (error || !exercise) {
    return NextResponse.json({ error: "Failed to create exercise" }, { status: 500 })
  }

  await syncCoachPTWorkbookForCoach(supabase, user.id)

  return NextResponse.json({ exercise })
}
