import { NextResponse, type NextRequest } from "next/server"
import { createAdmin, createClient } from "@/lib/supabase/server"
import { addProductRequestComment, getRequestViewerContext, getRequestsBoardData } from "@/lib/requests"

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

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireUser()
  if (result instanceof NextResponse) return result

  const { admin, viewer } = result
  const { id } = await params

  try {
    const board = await getRequestsBoardData(admin, viewer)
    const request = board.requests.find((item) => item.id === id)
    return NextResponse.json({ comments: request?.comments ?? [] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load comments" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireUser()
  if (result instanceof NextResponse) return result

  const { admin, viewer } = result
  const body = await request.json()
  const { id } = await params

  if (typeof body.body !== "string" || body.body.trim().length === 0) {
    return NextResponse.json({ error: "Comment body is required" }, { status: 400 })
  }

  try {
    const comment = await addProductRequestComment(admin, viewer, id, body.body)
    return NextResponse.json({ comment })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add comment" },
      { status: 500 }
    )
  }
}
