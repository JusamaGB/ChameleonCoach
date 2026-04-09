import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { createNutritionRecipe, listNutritionRecipesForCoach } from "@/lib/nutrition"

export async function GET() {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result

  try {
    const recipes = await listNutritionRecipesForCoach(supabase, user.id)
    return NextResponse.json({ recipes })
  } catch {
    return NextResponse.json({ error: "Failed to load recipes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const body = await request.json()

  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "Recipe name is required" }, { status: 400 })
  }

  try {
    const recipe = await createNutritionRecipe(supabase, user.id, body)
    return NextResponse.json({ recipe })
  } catch {
    return NextResponse.json({ error: "Failed to create recipe" }, { status: 500 })
  }
}
