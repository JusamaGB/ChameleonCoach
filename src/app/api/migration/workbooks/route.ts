import { NextResponse } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { listCoachMigrationWorkbooks } from "@/lib/google/migration"

export async function GET() {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user } = result

  try {
    const workbooks = await listCoachMigrationWorkbooks(user.id)
    return NextResponse.json({ workbooks })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load Google Sheets workbooks.",
      },
      { status: 500 }
    )
  }
}
