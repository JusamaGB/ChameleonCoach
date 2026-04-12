import { NextRequest, NextResponse } from "next/server"
import { createAdmin } from "@/lib/supabase/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import {
  createMarketingLead,
  createMarketingTask,
  getMarketingSnapshot,
  updateDraftWorkflow,
  updateMarketingLead,
} from "@/lib/chameleon-marketing"

export const dynamic = "force-dynamic"

export async function GET() {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result

  const admin = createAdmin()
  const snapshot = await getMarketingSnapshot(admin)
  return NextResponse.json(snapshot)
}

export async function POST(request: NextRequest) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result

  const { user } = result
  const admin = createAdmin()
  const body = await request.json()

  try {
    switch (body.action) {
      case "create_lead": {
        const key = await createMarketingLead(admin, user.id, body.payload)
        return NextResponse.json({ ok: true, key })
      }
      case "update_lead": {
        const updated = await updateMarketingLead(admin, user.id, body.lead_key, body.patch ?? {})
        return NextResponse.json({ ok: true, updated })
      }
      case "create_task": {
        const key = await createMarketingTask(admin, user.id, body.payload)
        return NextResponse.json({ ok: true, key })
      }
      case "draft_action": {
        const updated = await updateDraftWorkflow(admin, user.id, body.payload)
        return NextResponse.json({ ok: true, updated })
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
