import { NextRequest, NextResponse } from "next/server"
import { withChameleonMemory } from "@/app/api/chameleon-memory/_utils"
import { audit, sendMessage } from "@/lib/chameleon-memory/service"

export async function POST(request: NextRequest) {
  return withChameleonMemory(request, async ({ supabase, agent }) => {
    const body = await request.json()
    const result = await sendMessage(supabase, {
      sender: body.sender ?? agent,
      tag: body.tag,
      type: body.type,
      recipients: body.recipients,
      priority: body.priority,
      content: body.content ?? "",
      ref_id: body.ref_id,
    })

    await audit(supabase, {
      op: "msg_send",
      sector: "messages",
      key: result.key,
      agent: body.sender ?? agent,
      summary: `${body.sender ?? agent}/${body.tag ?? "GENERAL"} -> ${body.type ?? "broadcast"}`,
      meta: {
        recipients: body.recipients ?? [],
        priority: body.priority ?? "normal",
      },
    })

    return NextResponse.json(result)
  })
}
