import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { updateMealPlan } from "@/lib/google/sheets"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const adminEmails = ["kris.deane93@gmail.com"]
  if (!user || !user.email || !adminEmails.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { sheetId, mealPlan } = await request.json()

  if (!sheetId || !mealPlan) {
    return NextResponse.json(
      { error: "sheetId and mealPlan are required" },
      { status: 400 }
    )
  }

  try {
    await updateMealPlan(sheetId, mealPlan)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update meal plan" },
      { status: 500 }
    )
  }
}
