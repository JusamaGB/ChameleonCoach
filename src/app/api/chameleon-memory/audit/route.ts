import { NextRequest, NextResponse } from "next/server"
import { withChameleonMemory } from "@/app/api/chameleon-memory/_utils"
import { listAudit } from "@/lib/chameleon-memory/service"

export async function GET(request: NextRequest) {
  return withChameleonMemory(request, async ({ supabase, ownerUserId }) => {
    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get("limit") ?? "200")
    const sector = searchParams.get("sector")
    const op = searchParams.get("op")
    const agent = searchParams.get("agent")
    const since = searchParams.get("since")

    const result = await listAudit(supabase, {
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 1000) : 200,
      ownerUserId,
      sector,
      op,
      agent,
      since,
    })

    return NextResponse.json(result)
  })
}
