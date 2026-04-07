import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { updateProfile } from "@/lib/google/sheets"

export async function PUT(
  request: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user } = result

  const { sheetId, profile } = await request.json()

  if (!sheetId || !profile) {
    return NextResponse.json(
      { error: "sheetId and profile are required" },
      { status: 400 }
    )
  }

  try {
    await updateProfile(sheetId, profile, user.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update profile" },
      { status: 500 }
    )
  }
}
