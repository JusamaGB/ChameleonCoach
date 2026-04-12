import { NextRequest, NextResponse } from "next/server"
import { withChameleonMemory } from "@/app/api/chameleon-memory/_utils"
import { audit, buildClockPayload } from "@/lib/chameleon-memory/service"

export async function GET(request: NextRequest) {
  return withChameleonMemory(request, async ({ supabase, agent }) => {
    const payload = buildClockPayload()
    await audit(supabase, {
      op: "clock",
      agent,
      summary: "Read Chameleon team clock",
    })
    return NextResponse.json(payload)
  })
}
