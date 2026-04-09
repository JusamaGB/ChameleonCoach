import { NextResponse, type NextRequest } from "next/server"
import { createAdmin, createClient } from "@/lib/supabase/server"
import {
  getRequestViewerContext,
  getRequestsBoardData,
  updateProductRequest,
} from "@/lib/requests"

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
    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }
    return NextResponse.json({ request })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load request" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireUser()
  if (result instanceof NextResponse) return result

  const { admin, viewer } = result
  const body = await request.json()
  const { id } = await params

  try {
    const updated = await updateProductRequest(admin, viewer, id, body)
    return NextResponse.json({ request: updated })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update request" },
      { status: 500 }
    )
  }
}
