import { NextRequest, NextResponse } from "next/server"
import { withChameleonMemory } from "@/app/api/chameleon-memory/_utils"
import { recentMessages } from "@/lib/chameleon-memory/service"

export async function GET(request: NextRequest) {
  return withChameleonMemory(request, async ({ supabase }) => {
    const { searchParams } = new URL(request.url)
    const count = Number(searchParams.get("count") ?? "50")
    const tag = searchParams.get("tag")

    const result = await recentMessages(
      supabase,
      Number.isFinite(count) ? Math.min(Math.max(count, 1), 500) : 50,
      tag
    )

    return NextResponse.json(result)
  })
}
