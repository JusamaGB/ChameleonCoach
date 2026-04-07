import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { updateMealPlan } from "@/lib/google/sheets"

export async function PUT(
  request: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user } = result

  const { sheetId, mealPlan } = await request.json()

  if (!sheetId || !mealPlan) {
    return NextResponse.json(
      { error: "sheetId and mealPlan are required" },
      { status: 400 }
    )
  }

  try {
    await updateMealPlan(sheetId, mealPlan, user.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update meal plan" },
      { status: 500 }
    )
  }
}
