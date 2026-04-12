import { createHash, timingSafeEqual } from "crypto"
import { NextRequest } from "next/server"

const CHAMELEON_FALLBACK_AGENT = "UNKNOWN"

function digest(value: string) {
  return createHash("sha256").update(value).digest()
}

export function getRequestAgent(request: NextRequest) {
  return (
    request.headers.get("x-agent") ||
    request.headers.get("x-chameleon-agent") ||
    CHAMELEON_FALLBACK_AGENT
  ).trim()
}

export function assertChameleonApiKey(request: NextRequest) {
  const expected = process.env.CHAMELEON_MCP_API_KEY
  if (!expected) {
    throw new Error("CHAMELEON_MCP_API_KEY is not configured")
  }

  const provided =
    request.headers.get("x-chameleon-api-key") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    ""

  if (!provided) {
    throw new Error("Missing chameleon memory API key")
  }

  const expectedDigest = digest(expected)
  const providedDigest = digest(provided)

  if (!timingSafeEqual(expectedDigest, providedDigest)) {
    throw new Error("Invalid chameleon memory API key")
  }
}
