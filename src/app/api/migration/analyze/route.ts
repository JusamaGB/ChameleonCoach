import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { analyzeCoachMigrationWorkbook, type MigrationWorkbook } from "@/lib/google/migration"

export async function POST(request: NextRequest) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user } = result

  const { workbooks } = await request.json().catch(() => ({ workbooks: [] }))

  if (!Array.isArray(workbooks) || workbooks.length === 0) {
    return NextResponse.json(
      { error: "Select at least one workbook to analyze." },
      { status: 400 }
    )
  }

  try {
    const analyses = await Promise.all(
      workbooks.map((workbook: MigrationWorkbook) =>
        analyzeCoachMigrationWorkbook(user.id, workbook)
      )
    )

    return NextResponse.json({
      analyses,
      mode: process.env.OPENAI_API_KEY ? "hybrid" : "heuristic",
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to analyze selected workbooks.",
      },
      { status: 500 }
    )
  }
}
