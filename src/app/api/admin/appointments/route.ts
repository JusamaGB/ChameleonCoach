import { NextResponse } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"

export async function GET() {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result

  const { data: appointments } = await supabase
    .from("appointments")
    .select(`
      *,
      clients (
        id,
        name,
        email
      )
    `)
    .eq("coach_id", user.id)
    .order("created_at", { ascending: false })

  return NextResponse.json({ appointments: appointments ?? [] })
}
