import { NextRequest, NextResponse } from "next/server"
import { withChameleonMemory } from "@/app/api/chameleon-memory/_utils"
import { advanceCursor, audit } from "@/lib/chameleon-memory/service"

export async function POST(request: NextRequest) {
  return withChameleonMemory(request, async ({ supabase, ownerUserId }) => {
    const body = await request.json()
    const result = await advanceCursor(supabase, {
      agent: body.agent ?? "MARKETING",
      cursorTs: body.cursor_ts ?? body.cursorTs ?? null,
    })

    await audit(supabase, {
      owner_user_id: ownerUserId,
      op: "msg_cursor_advance",
      sector: "messages",
      agent: result.agent,
      summary: `Advanced cursor for ${result.agent}`,
      meta: { cursor_ts: result.cursor_ts },
    })

    return NextResponse.json(result)
  })
}
