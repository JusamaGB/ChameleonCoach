import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { updateNutritionRecipe } from "@/lib/nutrition"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const { id } = await params
  const body = await request.json()

  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "Recipe name is required" }, { status: 400 })
  }

  try {
    const recipe = await updateNutritionRecipe(supabase, user.id, id, body)
    return NextResponse.json({ recipe })
  } catch {
    return NextResponse.json({ error: "Failed to update recipe" }, { status: 500 })
  }
}
