import { NextRequest, NextResponse } from "next/server"
import { withChameleonMemory } from "@/app/api/chameleon-memory/_utils"
import { decryptSecret } from "@/lib/marketing-secrets"
import { getCoachMarketingSettings } from "@/lib/chameleon-marketing"

type Params = { params: Promise<{ userId: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const { userId } = await params

  return withChameleonMemory(request, async ({ supabase }) => {
    const { data, error } = await supabase
      .from("admin_settings")
      .select("marketing_openai_api_key_ciphertext")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const settings = await getCoachMarketingSettings(supabase, userId)
    return NextResponse.json({
      settings,
      openai_api_key: data?.marketing_openai_api_key_ciphertext
        ? decryptSecret(data.marketing_openai_api_key_ciphertext)
        : null,
    })
  })
}
