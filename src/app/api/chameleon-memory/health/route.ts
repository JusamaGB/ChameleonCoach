import { NextRequest, NextResponse } from "next/server"
import { withChameleonMemory } from "@/app/api/chameleon-memory/_utils"

export async function GET(request: NextRequest) {
  return withChameleonMemory(request, async ({ supabase }) => {
    const { error } = await supabase
      .from("chameleon_memory_entries")
      .select("sector", { head: true, count: "exact" })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }

    return NextResponse.json({
      status: "ok",
      db: "supabase-postgres",
      service: "chameleon-memory",
      version: "1.0.0",
    })
  })
}
