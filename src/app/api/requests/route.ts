import { NextResponse, type NextRequest } from "next/server"
import { createAdmin, createClient } from "@/lib/supabase/server"
import {
  createProductRequest,
  getRequestViewerContext,
  getRequestsBoardData,
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
  return { user, admin, viewer }
}

export async function GET(request: NextRequest) {
  const result = await requireUser()
  if (result instanceof NextResponse) return result

  const { admin, viewer } = result
  const { searchParams } = new URL(request.url)

  try {
    const data = await getRequestsBoardData(admin, viewer, {
      q: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      module_area: searchParams.get("module_area") ?? undefined,
      urgency: searchParams.get("urgency") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      mine: searchParams.get("mine") === "1",
    })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load requests" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const result = await requireUser()
  if (result instanceof NextResponse) return result

  const { admin, viewer } = result
  const body = await request.json()

  if (typeof body.title !== "string" || body.title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }
  if (typeof body.problem_statement !== "string" || body.problem_statement.trim().length === 0) {
    return NextResponse.json({ error: "Problem statement is required" }, { status: 400 })
  }
  if (typeof body.module_area !== "string" || body.module_area.trim().length === 0) {
    return NextResponse.json({ error: "Module area is required" }, { status: 400 })
  }

  try {
    const productRequest = await createProductRequest(admin, viewer, {
      title: body.title,
      summary: body.summary,
      problem_statement: body.problem_statement,
      desired_outcome: body.desired_outcome,
      module_area: body.module_area,
      feature_area: body.feature_area,
      urgency: body.urgency ?? "important",
      niche: body.niche ?? "general",
      request_type: body.request_type ?? "workflow_improvement",
    })

    return NextResponse.json({ request: productRequest })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create request" },
      { status: 500 }
    )
  }
}
