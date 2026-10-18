import { createHmac, timingSafeEqual } from 'node:crypto'
import { isNil } from 'lodash'

/**
 * Signed, non-expiring unsubscribe tokens: `<base64url(email)>.<signature>`.
 *
 * The token goes in every community email's unsubscribe link and
 * List-Unsubscribe header, so whoever holds the email can opt that address out
 * without signing in, and nobody can opt out an address they never received
 * mail at. It never expires: an unsubscribe link in a year-old email must still
 * work.
 *
 * Deliberately free of `server-only` so the E2E fixtures can mint tokens with
 * the same code the app verifies them with.
 */

const PURPOSE = 'community-email-unsubscribe:v1:'

function secret(): string {
  const value =
    process.env.EMAIL_UNSUBSCRIBE_SECRET ?? process.env.SUPABASE_SECRET_KEY
  if (isNil(value) || value.length === 0) {
    throw new Error(
      'EMAIL_UNSUBSCRIBE_SECRET (or SUPABASE_SECRET_KEY) must be set to sign unsubscribe links'
    )
  }
  return value
}

function sign(email: string): string {
  return createHmac('sha256', secret())
    .update(PURPOSE + email)
    .digest('base64url')
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function createUnsubscribeToken(email: string): string {
  const normalized = normalizeEmail(email)
  return `${Buffer.from(normalized).toString('base64url')}.${sign(normalized)}`
}

/** The address a token was minted for, or null if it is malformed or forged. */
export function verifyUnsubscribeToken(
  token: string | null | undefined
): string | null {
  if (isNil(token)) return null
  const [encoded, signature, ...rest] = token.split('.')
  if (isNil(encoded) || isNil(signature) || rest.length > 0) return null

  const email = normalizeEmail(Buffer.from(encoded, 'base64url').toString())
  if (email.length === 0 || !email.includes('@')) return null

  const expected = Buffer.from(sign(email))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length) return null
  return timingSafeEqual(expected, actual) ? email : null
}
