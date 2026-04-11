import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { executeCoachWorkbookMigration, type MigrationExecutionResult } from "@/lib/google/migration-executor"
import type { MigrationWorkbook } from "@/lib/google/migration"

export async function POST(request: NextRequest) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result

  const { workbook, clientId } = await request.json().catch(() => ({ workbook: null, clientId: "" }))

  if (!workbook || typeof clientId !== "string" || !clientId) {
    return NextResponse.json(
      { error: "workbook and clientId are required." },
      { status: 400 }
    )
  }

  try {
    const execution = await executeCoachWorkbookMigration({
      supabase,
      coachId: user.id,
      clientId,
      workbook: workbook as MigrationWorkbook,
    })

    return NextResponse.json(execution satisfies MigrationExecutionResult)
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Migration failed.",
      },
      { status: 500 }
    )
  }
}
