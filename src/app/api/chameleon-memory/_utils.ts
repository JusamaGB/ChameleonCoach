import { NextRequest, NextResponse } from "next/server"
import { assertChameleonApiKey, getRequestAgent, getRequestOwnerUserId } from "@/lib/chameleon-memory/auth"
import { createAdmin } from "@/lib/supabase/server"

export async function withChameleonMemory(
  request: NextRequest,
  handler: (context: { supabase: ReturnType<typeof createAdmin>; agent: string; ownerUserId: string | null }) => Promise<NextResponse>
) {
  try {
    assertChameleonApiKey(request)
    const supabase = createAdmin()
    const agent = getRequestAgent(request)
    const ownerUserId = getRequestOwnerUserId(request)
    return await handler({ supabase, agent, ownerUserId })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    const status = /api key/i.test(message) ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
