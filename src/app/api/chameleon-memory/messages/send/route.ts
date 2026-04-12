import { NextRequest, NextResponse } from "next/server"
import { withChameleonMemory } from "@/app/api/chameleon-memory/_utils"
import { audit, sendMessage } from "@/lib/chameleon-memory/service"

export async function POST(request: NextRequest) {
  return withChameleonMemory(request, async ({ supabase, agent, ownerUserId }) => {
    const body = await request.json()
    const effectiveOwnerUserId = body.owner_user_id ?? ownerUserId
    const result = await sendMessage(supabase, {
      owner_user_id: effectiveOwnerUserId,
      sender: body.sender ?? agent,
      tag: body.tag,
      type: body.type,
      recipients: body.recipients,
      priority: body.priority,
      content: body.content ?? "",
      ref_id: body.ref_id,
    })

    await audit(supabase, {
      owner_user_id: effectiveOwnerUserId,
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
