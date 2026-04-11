import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import {
  executeCoachWorkbookMigration,
  type MigrationExecutionResult,
  type MigrationExecutionStep,
} from "@/lib/google/migration-executor"
import type { MigrationWorkbook } from "@/lib/google/migration"

function encodeEvent(payload: unknown) {
  return `${JSON.stringify(payload)}\n`
}

export async function POST(request: Request) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result

  const { workbook, clientId } = await request.json().catch(() => ({ workbook: null, clientId: "" }))

  if (!workbook || typeof clientId !== "string" || !clientId) {
    return Response.json(
      { error: "workbook and clientId are required." },
      { status: 400 }
    )
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => controller.enqueue(encoder.encode(encodeEvent(payload)))

      try {
        send({ type: "start" })

        const execution = await executeCoachWorkbookMigration({
          supabase,
          coachId: user.id,
          clientId,
          workbook: workbook as MigrationWorkbook,
          onStep: async (step: MigrationExecutionStep) => {
            send({ type: "step", step })
          },
        })

        send({
          type: "complete",
          result: execution satisfies MigrationExecutionResult,
        })
      } catch (error) {
        send({
          type: "error",
          error: error instanceof Error ? error.message : "Migration failed.",
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
