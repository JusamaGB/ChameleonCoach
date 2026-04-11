import { NextResponse } from "next/server"
import { createAdmin, createClient } from "@/lib/supabase/server"
import { getClientWellnessContextForUser, WellnessAccessError } from "@/lib/wellness"

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
    const data = await getClientWellnessContextForUser(admin, user.id)
    return NextResponse.json(data)
  } catch (error) {
    const status = error instanceof WellnessAccessError ? error.status : 500
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load wellness workspace" },
      { status }
    )
  }
}
