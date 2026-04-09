import { NextResponse } from "next/server"
import { createAdmin, createClient } from "@/lib/supabase/server"
import { getRequestViewerContext, toggleProductRequestVote } from "@/lib/requests"

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

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireUser()
  if (result instanceof NextResponse) return result

  const { admin, viewer } = result
  const { id } = await params

  try {
    await toggleProductRequestVote(admin, viewer, id, true)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to vote" },
      { status: 500 }
    )
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireUser()
  if (result instanceof NextResponse) return result

  const { admin, viewer } = result
  const { id } = await params

  try {
    await toggleProductRequestVote(admin, viewer, id, false)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove vote" },
      { status: 500 }
    )
  }
}
