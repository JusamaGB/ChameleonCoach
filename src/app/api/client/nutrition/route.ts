import { NextResponse } from "next/server"
import { createAdmin, createClient } from "@/lib/supabase/server"
import { getClientNutritionContextForUser } from "@/lib/nutrition"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const admin = createAdmin()
    const data = await getClientNutritionContextForUser(admin, user.id)
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load nutrition workspace" },
      { status: 500 }
    )
  }
}
