import { createHmac, timingSafeEqual } from 'node:crypto'
import { isNil } from 'lodash'

/**
 * Signed impersonation cookie (Epic 0 / Unit 2, FR-2.2, FR-2.3).
 *
 * Value = base64url(JSON payload) + '.' + base64url(HMAC-SHA256(body, secret)).
 * The payload records who is being impersonated, which real admin started it and
 * when, so the reader can refuse a value that was not produced by this server or
 * that is being replayed by someone other than that admin.
 *
 * Pure functions: the secret is a parameter so they can be unit tested without env.
 */

export const IMPERSONATION_COOKIE_KEY = 'DTTD_IMPERSONATING_USER'

/** 24 hours (owner decision, spec Open Questions). */
export const IMPERSONATION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24

export type ImpersonationCookiePayload = {
  /** The user being impersonated. */
  targetUserId: string
  /** The real session user (must hold FULL_ACCESS) who started impersonating. */
  adminUserId: string
  /** Issued-at, epoch milliseconds. */
  iat: number
}

function hmac(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url')
}

export function signImpersonationCookie(
  payload: ImpersonationCookiePayload,
  secret: string
): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString(
    'base64url'
  )
  return `${body}.${hmac(body, secret)}`
}

function isPayload(value: unknown): value is ImpersonationCookiePayload {
  if (typeof value !== 'object' || isNil(value)) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.targetUserId === 'string' &&
    v.targetUserId.length > 0 &&
    typeof v.adminUserId === 'string' &&
    v.adminUserId.length > 0 &&
    typeof v.iat === 'number' &&
    Number.isFinite(v.iat)
  )
}

/**
 * Returns the payload when the signature matches and the cookie is within its max
 * age; `null` for anything else (missing, malformed, tampered, wrong secret, stale).
 */
export function verifyImpersonationCookie(
  value: string | undefined | null,
  secret: string,
  now: number = Date.now(),
  maxAgeSeconds: number = IMPERSONATION_COOKIE_MAX_AGE_SECONDS
): ImpersonationCookiePayload | null {
  if (isNil(value) || value.length === 0) return null

  const dot = value.lastIndexOf('.')
  if (dot <= 0 || dot === value.length - 1) return null

  const body = value.slice(0, dot)
  const providedSig = value.slice(dot + 1)
  const expectedSig = hmac(body, secret)

  const provided = Buffer.from(providedSig, 'utf8')
  const expected = Buffer.from(expectedSig, 'utf8')
  if (provided.length !== expected.length) return null
  if (!timingSafeEqual(provided, expected)) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (!isPayload(parsed)) return null

  const ageMs = now - parsed.iat
  if (ageMs < 0 || ageMs > maxAgeSeconds * 1000) return null

  return parsed
}
