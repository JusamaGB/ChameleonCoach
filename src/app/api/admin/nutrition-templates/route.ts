import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { createNutritionTemplate, listNutritionTemplatesForCoach } from "@/lib/nutrition"

export async function GET() {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result

  try {
    const templates = await listNutritionTemplatesForCoach(supabase, user.id)
    return NextResponse.json({ templates })
  } catch {
    return NextResponse.json({ error: "Failed to load nutrition templates" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const body = await request.json()

  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "Template name is required" }, { status: 400 })
  }

  try {
    const template = await createNutritionTemplate(supabase, user.id, body)
    return NextResponse.json({ template })
  } catch {
    return NextResponse.json({ error: "Failed to create nutrition template" }, { status: 500 })
  }
}
