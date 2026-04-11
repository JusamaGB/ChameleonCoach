import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { resolveCoachMigrationWorkbook } from "@/lib/google/migration"

export async function POST(request: NextRequest) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user } = result

  const { source } = await request.json().catch(() => ({ source: "" }))

  if (!source || typeof source !== "string") {
    return NextResponse.json(
      { error: "Paste a Google Sheets URL or spreadsheet ID." },
      { status: 400 }
    )
  }

  try {
    const workbook = await resolveCoachMigrationWorkbook(user.id, source)
    return NextResponse.json({ workbook })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load that Google Sheet.",
      },
      { status: 500 }
    )
  }
}
