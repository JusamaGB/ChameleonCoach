export function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let token = ""
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}

export function generateInviteCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function normalizePhone(value: string): string {
  const trimmed = value.trim()
  const hasPlus = trimmed.startsWith("+")
  const digits = trimmed.replace(/[^\d]/g, "")
  return `${hasPlus ? "+" : ""}${digits}`
}

export function normalizeInviteCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
}

export function normalizeInviteContactValue(
  type: "email" | "phone",
  value: string
): string {
  return type === "phone" ? normalizePhone(value) : normalizeEmail(value)
}

export function buildPendingInviteEmail(token: string): string {
  return `invite-${token}@pending.chameleon.local`
}

export function isPendingInviteEmail(value: string): boolean {
  return normalizeEmail(value).endsWith("@pending.chameleon.local")
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ")
}
