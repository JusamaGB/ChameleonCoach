import { NextResponse, type NextRequest } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import {
  assignPTProgramToClient,
  cancelActivePTAssignmentForClient,
  getClientPTOverviewForCoach,
} from "@/lib/pt"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const { id } = await params

  try {
    const overview = await getClientPTOverviewForCoach(supabase, user.id, id)
    return NextResponse.json(overview ?? { assignment: null, sessions: [], logs: [], assignment_history: [] })
  } catch {
    return NextResponse.json({ error: "Failed to load PT overview" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const { id } = await params

  const body = await request.json()
  if (typeof body.program_id !== "string" || body.program_id.length === 0) {
    return NextResponse.json({ error: "program_id is required" }, { status: 400 })
  }

  try {
    const assignment = await assignPTProgramToClient(supabase, user.id, id, {
      program_id: body.program_id,
      assigned_start_date: body.assigned_start_date,
      assignment_notes: body.assignment_notes,
    })
    return NextResponse.json({ assignment })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to assign program" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result
  const { id } = await params

  try {
    const outcome = await cancelActivePTAssignmentForClient(supabase, user.id, id)
    return NextResponse.json(outcome)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to cancel assignment" },
      { status: 500 }
    )
  }
}
