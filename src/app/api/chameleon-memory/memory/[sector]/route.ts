import { NextRequest, NextResponse } from "next/server"
import { withChameleonMemory } from "@/app/api/chameleon-memory/_utils"
import { assertSector, audit, listEntries } from "@/lib/chameleon-memory/service"

type Params = { params: Promise<{ sector: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const { sector } = await params

  return withChameleonMemory(request, async ({ supabase, agent, ownerUserId }) => {
    assertSector(sector)
    const result = await listEntries(supabase, sector, ownerUserId)
    await audit(supabase, {
      owner_user_id: ownerUserId,
      op: "list",
      sector,
      agent,
      summary: `Listed ${result.count} keys in ${sector}`,
    })
    return NextResponse.json(result)
  })
}
