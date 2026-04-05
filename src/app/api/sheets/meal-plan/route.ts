import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getMealPlan } from "@/lib/google/sheets"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: client } = await supabase
    .from("clients")
    .select("sheet_id")
    .eq("user_id", user.id)
    .single()

  if (!client?.sheet_id) {
    return NextResponse.json({ mealPlan: [] })
  }

  try {
    const mealPlan = await getMealPlan(client.sheet_id)
    return NextResponse.json({ mealPlan })
  } catch {
    return NextResponse.json({ mealPlan: [] })
  }
}
