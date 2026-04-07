import { NextResponse, type NextRequest } from "next/server"
import { createAdmin } from "@/lib/supabase/server"

// One-time endpoint to backfill app_metadata.role for existing coach accounts
// Protected by a secret token — call once then remove this file
export async function POST(request: NextRequest) {
  const { secret } = await request.json()

  if (secret !== process.env.ADMIN_FIX_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const supabase = createAdmin()

  // Find all users with role = 'coach' or 'admin' in user_roles
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("role", ["coach", "admin"])

  if (error || !roles?.length) {
    return NextResponse.json({ error: "No coach roles found", detail: error?.message }, { status: 400 })
  }

  const results = []
  for (const row of roles) {
    // Rename admin → coach in user_roles if needed
    if (row.role === "admin") {
      await supabase
        .from("user_roles")
        .update({ role: "coach" })
        .eq("user_id", row.user_id)
    }

    // Stamp app_metadata
    const { error: updateError } = await supabase.auth.admin.updateUserById(row.user_id, {
      app_metadata: { role: "coach" },
    })

    results.push({ user_id: row.user_id, ok: !updateError, error: updateError?.message })
  }

  return NextResponse.json({ fixed: results })
}
