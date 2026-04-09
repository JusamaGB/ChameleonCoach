import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { syncCoachPTWorkbookForCoach } from "@/lib/pt"

function normalizeExerciseInput(body: Record<string, unknown>) {
  const updates: Record<string, string | null> = {}

  if (body.name !== undefined) {
    updates.name = typeof body.name === "string" ? body.name.trim() : ""
  }

  if (body.category !== undefined) {
    updates.category = typeof body.category === "string" ? body.category.trim() : ""
  }

  if (body.description !== undefined) {
    updates.description =
      typeof body.description === "string" && body.description.trim().length > 0
        ? body.description.trim()
        : null
  }

  if (body.coaching_notes !== undefined) {
    updates.coaching_notes =
      typeof body.coaching_notes === "string" && body.coaching_notes.trim().length > 0
        ? body.coaching_notes.trim()
        : null
  }

  if (body.media_url !== undefined) {
    updates.media_url =
      typeof body.media_url === "string" && body.media_url.trim().length > 0
        ? body.media_url.trim()
        : null
  }

  return updates
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const { id } = await params

  const body = await request.json()
  const updates = normalizeExerciseInput(body)

  if (updates.name !== undefined && !updates.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  if (updates.category !== undefined && !updates.category) {
    return NextResponse.json({ error: "category is required" }, { status: 400 })
  }

  const { data: exercise, error } = await supabase
    .from("exercises")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("coach_id", user.id)
    .select("*")
    .single()

  if (error || !exercise) {
    return NextResponse.json({ error: "Failed to update exercise" }, { status: 400 })
  }

  await syncCoachPTWorkbookForCoach(supabase, user.id)

  return NextResponse.json({ exercise })
}
