import { NextRequest, NextResponse } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { createAdmin } from "@/lib/supabase/server"
import { encryptSecret, maskSecretLast4 } from "@/lib/marketing-secrets"
import { getCoachMarketingSettings, updateCoachMarketingSettings } from "@/lib/chameleon-marketing"

async function validateOpenAiApiKey(apiKey: string) {
  const trimmed = apiKey.trim()
  if (!trimmed) {
    throw new Error("OpenAI API key is required")
  }

  if (!trimmed.startsWith("sk-")) {
    throw new Error("OpenAI API key format looks invalid")
  }

  const response = await fetch("https://api.openai.com/v1/models", {
    headers: {
      authorization: `Bearer ${trimmed}`,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("OpenAI API key validation failed")
  }
}

export async function GET() {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result

  const admin = createAdmin()
  const settings = await getCoachMarketingSettings(admin, result.user.id)
  return NextResponse.json(settings)
}

export async function PATCH(request: NextRequest) {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result

  const admin = createAdmin()
  const body = await request.json().catch(() => ({}))

  try {
    const openAiApiKey = typeof body.openai_api_key === "string" ? body.openai_api_key.trim() : ""
    const removeOpenAiApiKey = body.remove_openai_api_key === true

    if (openAiApiKey) {
      await validateOpenAiApiKey(openAiApiKey)
      const { error } = await admin.from("admin_settings").upsert(
        {
          user_id: result.user.id,
          marketing_openai_api_key_ciphertext: encryptSecret(openAiApiKey),
          marketing_openai_api_key_last4: maskSecretLast4(openAiApiKey),
          marketing_openai_api_key_set_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )

      if (error) {
        throw new Error(error.message)
      }
    } else if (removeOpenAiApiKey) {
      const { error } = await admin
        .from("admin_settings")
        .upsert(
          {
            user_id: result.user.id,
            marketing_openai_api_key_ciphertext: null,
            marketing_openai_api_key_last4: null,
            marketing_openai_api_key_set_at: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )

      if (error) {
        throw new Error(error.message)
      }
    }

    const settings = await updateCoachMarketingSettings(admin, result.user.id, {
      autoscan_enabled: typeof body.autoscan_enabled === "boolean" ? body.autoscan_enabled : undefined,
      max_output_tokens: body.max_output_tokens,
      reddit_subreddits: Array.isArray(body.reddit_subreddits) ? body.reddit_subreddits : undefined,
      reddit_search_terms: Array.isArray(body.reddit_search_terms) ? body.reddit_search_terms : undefined,
    })

    return NextResponse.json({ ok: true, settings })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save marketing settings" },
      { status: 400 }
    )
  }
}
