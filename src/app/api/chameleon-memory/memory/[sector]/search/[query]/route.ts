import { NextRequest, NextResponse } from "next/server"
import { withChameleonMemory } from "@/app/api/chameleon-memory/_utils"
import { assertSector, audit, searchEntries } from "@/lib/chameleon-memory/service"

type Params = { params: Promise<{ sector: string; query: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const { sector, query } = await params

  return withChameleonMemory(request, async ({ supabase, agent }) => {
    assertSector(sector)
    const decodedQuery = decodeURIComponent(query)
    const result = await searchEntries(supabase, sector, decodedQuery)
    await audit(supabase, {
      op: "search",
      sector,
      agent,
      summary: `Searched ${sector} for '${decodedQuery}'`,
    })
    return NextResponse.json(result)
  })
}
