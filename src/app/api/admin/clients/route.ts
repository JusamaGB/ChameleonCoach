import { NextResponse } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { listClientsForCoach } from "@/lib/clients"

export async function GET() {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user, supabase } = result

  const { data: clients, error } = await listClientsForCoach(supabase, user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ clients: clients || [] })
}
