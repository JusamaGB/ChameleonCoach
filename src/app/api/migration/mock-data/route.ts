import { NextResponse } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { createMockMigrationWorkbooks } from "@/lib/google/migration"

export async function POST() {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user } = result

  try {
    const workbooks = await createMockMigrationWorkbooks(user.id)
    return NextResponse.json({ workbooks })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate mock migration workbooks.",
      },
      { status: 500 }
    )
  }
}
