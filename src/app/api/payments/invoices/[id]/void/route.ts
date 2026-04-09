import { NextResponse } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { voidCoachInvoice } from "@/lib/coach-payments"
import { createAdmin } from "@/lib/supabase/server"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user } = result
  const admin = createAdmin()
  const { id } = await params

  try {
    await voidCoachInvoice(admin, user.id, id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to void invoice" },
      { status: 400 }
    )
  }
}
