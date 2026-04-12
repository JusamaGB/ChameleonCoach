import { NextRequest, NextResponse } from "next/server"
import { withChameleonMemory } from "@/app/api/chameleon-memory/_utils"
import { audit, pollMessages } from "@/lib/chameleon-memory/service"

export async function GET(request: NextRequest) {
  return withChameleonMemory(request, async ({ supabase, agent }) => {
    const { searchParams } = new URL(request.url)
    const requestedAgent = (searchParams.get("agent") ?? agent).toUpperCase()
    const channel = searchParams.get("channel")
    const since = searchParams.get("since")
    const useCursor = searchParams.get("use_cursor") === "true"
    const limit = Number(searchParams.get("limit") ?? "200")

    const result = await pollMessages(supabase, {
      agent: requestedAgent,
      channel,
      since,
      useCursor,
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 200,
    })

    await audit(supabase, {
      op: "msg_poll",
      sector: "messages",
      agent: requestedAgent,
      summary: `Polled ${result.count} messages`,
      meta: {
        channel: channel ?? "all",
        use_cursor: useCursor,
      },
    })

    return NextResponse.json(result)
  })
}
