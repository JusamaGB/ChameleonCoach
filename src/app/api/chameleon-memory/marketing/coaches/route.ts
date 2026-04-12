import { NextRequest, NextResponse } from "next/server"
import { withChameleonMemory } from "@/app/api/chameleon-memory/_utils"

export async function GET(request: NextRequest) {
  return withChameleonMemory(request, async ({ supabase }) => {
    const { data, error } = await supabase
      .from("admin_settings")
      .select("user_id, marketing_autoscan_enabled")
      .not("user_id", "is", null)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      coaches: (data ?? []).map((row) => ({
        user_id: row.user_id,
        autoscan_enabled: row.marketing_autoscan_enabled ?? true,
      })),
    })
  })
}
