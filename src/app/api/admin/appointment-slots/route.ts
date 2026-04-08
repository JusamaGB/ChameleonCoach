import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"

export async function GET() {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result

  const { data: slots } = await supabase
    .from("appointment_slots")
    .select("*")
    .eq("coach_id", user.id)
    .is("appointment_id", null)
    .order("starts_at", { ascending: true })

  return NextResponse.json({ slots: slots ?? [] })
}

export async function POST(request: NextRequest) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result

  const { starts_at } = await request.json()

  if (!starts_at) {
    return NextResponse.json({ error: "starts_at is required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("appointment_slots")
    .insert({
      coach_id: user.id,
      starts_at,
    })
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: "Failed to create slot" }, { status: 500 })
  }

  return NextResponse.json({ slot: data })
}
