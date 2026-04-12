import { NextRequest, NextResponse } from "next/server"
import { withChameleonMemory } from "@/app/api/chameleon-memory/_utils"
import { runSingleMarketingCycle } from "../../../../../../scripts/chameleon-marketing-runner.mjs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  return withChameleonMemory(request, async () => {
    try {
      const result = await runSingleMarketingCycle()
      return NextResponse.json(result)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to run marketing cycle" },
        { status: 500 }
      )
    }
  })
}
