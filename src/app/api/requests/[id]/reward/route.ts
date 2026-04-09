import { NextResponse, type NextRequest } from "next/server"
import { createAdmin, createClient } from "@/lib/supabase/server"
import { getRequestViewerContext, grantContributorReward } from "@/lib/requests"

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdmin()
  const viewer = await getRequestViewerContext(admin, user.id, user.email)
  return { admin, viewer }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireUser()
  if (result instanceof NextResponse) return result

  const { admin, viewer } = result
  const body = await request.json()
  const { id } = await params

  if (typeof body.user_id !== "string" || body.user_id.length === 0) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 })
  }
  if (typeof body.reward_type !== "string" || body.reward_type.length === 0) {
    return NextResponse.json({ error: "reward_type is required" }, { status: 400 })
  }
  if (typeof body.title !== "string" || body.title.trim().length === 0) {
    return NextResponse.json({ error: "Reward title is required" }, { status: 400 })
  }

  try {
    const reward = await grantContributorReward(admin, viewer, id, {
      user_id: body.user_id,
      reward_type: body.reward_type,
      title: body.title,
      description: body.description,
      reward_value: body.reward_value,
      expires_at: body.expires_at,
    })
    return NextResponse.json({ reward })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to grant reward" },
      { status: 500 }
    )
  }
}
