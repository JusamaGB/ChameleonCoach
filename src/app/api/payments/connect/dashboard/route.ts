import { NextResponse } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { createCoachDashboardLoginLink } from "@/lib/coach-payments"
import { createAdmin } from "@/lib/supabase/server"

export async function POST() {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user } = result
  const admin = createAdmin()

  try {
    const url = await createCoachDashboardLoginLink(admin, user.id)
    return NextResponse.json({ url })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to open Stripe dashboard" },
      { status: 400 }
    )
  }
}
