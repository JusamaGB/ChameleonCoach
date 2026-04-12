import { NextRequest, NextResponse } from "next/server"
import { withChameleonMemory } from "@/app/api/chameleon-memory/_utils"
import { audit, listSectors } from "@/lib/chameleon-memory/service"

export async function GET(request: NextRequest) {
  return withChameleonMemory(request, async ({ supabase, agent }) => {
    const result = await listSectors(supabase)
    await audit(supabase, {
      op: "list_sectors",
      agent,
      summary: `Listed sectors (${result.active.length} active)`,
    })
    return NextResponse.json(result)
  })
}
