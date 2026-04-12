export const CHAMELEON_MEMORY_SECTORS = [
  "contacts",
  "leads",
  "campaigns",
  "follow_ups",
  "conversations",
  "content",
  "strategy",
  "analytics",
  "state",
  "memory",
  "messages",
  "inbox",
] as const

export type ChameleonMemorySector = (typeof CHAMELEON_MEMORY_SECTORS)[number]

export const ALERT_TAGS = new Set(["FLAG", "DIRECTIVE", "HUMAN_NEEDED"])

export const CHAMELEON_AGENT_ID = process.env.CHAMELEON_AGENT_ID?.trim() || "MARKETING"
export const CHAMELEON_AGENT_NAME = process.env.CHAMELEON_AGENT_NAME?.trim() || "Chameleon Marketing"
export const CHAMELEON_LAUNCH_DATE = process.env.CHAMELEON_LAUNCH_DATE?.trim() || "2026-04-12"

export function isValidChameleonSector(value: string): value is ChameleonMemorySector {
  return CHAMELEON_MEMORY_SECTORS.includes(value as ChameleonMemorySector)
}
