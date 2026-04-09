import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import {
  createClientNutritionCheckIn,
  listClientNutritionCheckInsForCoach,
} from "@/lib/nutrition"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const { id } = await params

  try {
    const checkIns = await listClientNutritionCheckInsForCoach(supabase, user.id, id)
    return NextResponse.json({ checkIns })
  } catch {
    return NextResponse.json({ error: "Failed to load nutrition check-ins" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const { id } = await params
  const body = await request.json()

  try {
    const checkIn = await createClientNutritionCheckIn(supabase, user.id, id, body)
    return NextResponse.json({ checkIn })
  } catch {
    return NextResponse.json({ error: "Failed to create nutrition check-in" }, { status: 500 })
  }
}
