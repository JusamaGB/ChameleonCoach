import { NextRequest, NextResponse } from "next/server"
import { assertChameleonApiKey, getRequestAgent } from "@/lib/chameleon-memory/auth"
import { createAdmin } from "@/lib/supabase/server"

export async function withChameleonMemory(
  request: NextRequest,
  handler: (context: { supabase: ReturnType<typeof createAdmin>; agent: string }) => Promise<NextResponse>
) {
  try {
    assertChameleonApiKey(request)
    const supabase = createAdmin()
    const agent = getRequestAgent(request)
    return await handler({ supabase, agent })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    const status = /api key/i.test(message) ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
