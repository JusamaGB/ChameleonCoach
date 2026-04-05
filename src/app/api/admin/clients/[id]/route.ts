import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

const adminEmails = ["kris.deane93@gmail.com"]

async function verifyAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email || !adminEmails.includes(user.email.toLowerCase())) {
    return { user: null, supabase }
  }
  return { user, supabase }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase } = await verifyAdmin()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }

  return NextResponse.json({ client })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase } = await verifyAdmin()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  // Only allow updating specific fields
  const allowedFields = ["name", "email", "sheet_id", "onboarding_completed"]
  const updates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }
  updates.updated_at = new Date().toISOString()

  const { data: client, error } = await supabase
    .from("clients")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ client })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase } = await verifyAdmin()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
