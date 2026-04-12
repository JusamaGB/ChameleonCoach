import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"

function getSecretKey() {
  const raw = process.env.MARKETING_SECRET_ENCRYPTION_KEY?.trim()
  if (!raw) {
    throw new Error("MARKETING_SECRET_ENCRYPTION_KEY is not configured")
  }

  return createHash("sha256").update(raw).digest()
}

export function maskSecretLast4(value: string) {
  return value.trim().slice(-4)
}

export function encryptSecret(value: string) {
  const plainText = value.trim()
  if (!plainText) {
    throw new Error("Secret cannot be empty")
  }

  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, getSecretKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return Buffer.concat([iv, authTag, encrypted]).toString("base64")
}

export function decryptSecret(ciphertext: string) {
  const payload = Buffer.from(ciphertext, "base64")
  if (payload.length < 29) {
    throw new Error("Encrypted secret payload is invalid")
  }

  const iv = payload.subarray(0, 12)
  const authTag = payload.subarray(12, 28)
  const encrypted = payload.subarray(28)
  const decipher = createDecipheriv(ALGORITHM, getSecretKey(), iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
}
