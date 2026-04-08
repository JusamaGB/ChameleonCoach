import { NextResponse } from "next/server"
import { createClient, createAdmin } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdmin()
  const { data: client } = await admin
    .from("clients")
    .select("coach_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!client?.coach_id) {
    return NextResponse.json({ mode: "coach_only", slots: [] })
  }

  const { data: settings } = await admin
    .from("admin_settings")
    .select("appointment_booking_mode")
    .eq("user_id", client.coach_id)
    .maybeSingle()

  const mode = settings?.appointment_booking_mode ?? "coach_only"

  if (mode !== "client_request_visible_slots") {
    return NextResponse.json({ mode, slots: [] })
  }

  const now = new Date().toISOString()
  const { data: slots } = await admin
    .from("appointment_slots")
    .select("id, starts_at")
    .eq("coach_id", client.coach_id)
    .is("appointment_id", null)
    .gte("starts_at", now)
    .order("starts_at", { ascending: true })

  return NextResponse.json({ mode, slots: slots ?? [] })
}
