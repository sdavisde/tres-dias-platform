import type { User } from '@/lib/users/types'
import { isNil } from 'lodash'
import { cookies } from 'next/headers'
import {
  getAuthenticatedUser,
  getUserById,
} from '@/services/identity/user/user-service'
import { err, ok, Results, type Result } from '@/lib/results'
import { Permission, userHasPermission } from '@/lib/security'
import { logger } from '@/lib/logger'
import {
  IMPERSONATION_COOKIE_KEY,
  IMPERSONATION_COOKIE_MAX_AGE_SECONDS,
  signImpersonationCookie,
  verifyImpersonationCookie,
  type ImpersonationCookiePayload,
} from './impersonation-cookie'

let warnedMissingSecret = false

/**
 * The HMAC secret for the impersonation cookie. When it is unset the feature is
 * off: nothing is ever treated as impersonating (FR-2.4). Logged once per process.
 */
function getSecret(): string | null {
  const secret = process.env.IMPERSONATION_COOKIE_SECRET
  if (isNil(secret) || secret.length === 0) {
    if (!warnedMissingSecret) {
      warnedMissingSecret = true
      logger.warn(
        'IMPERSONATION_COOKIE_SECRET is not set; impersonation is disabled'
      )
    }
    return null
  }
  return secret
}

/**
 * Verifies the cookie signature and age only. Does not touch the database and
 * does not check who the real session user is; see `findImpersonatingUser`.
 */
async function readVerifiedPayload(): Promise<ImpersonationCookiePayload | null> {
  const secret = getSecret()
  if (isNil(secret)) return null
  const cookieStore = await cookies()
  return verifyImpersonationCookie(
    cookieStore.get(IMPERSONATION_COOKIE_KEY)?.value,
    secret
  )
}

/**
 * Resolves the impersonated user for this request, or `null`.
 *
 * Runs during Server Component render, so it must never set or delete cookies.
 * A cookie is honoured only when (FR-2.3):
 *   1. its HMAC verifies and it is within the max age,
 *   2. the real session user is the admin recorded in the cookie, and
 *   3. that admin currently holds FULL_ACCESS.
 */
export async function findImpersonatingUser(): Promise<User | null> {
  const payload = await readVerifiedPayload()
  if (isNil(payload)) return null

  const sessionResult = await getAuthenticatedUser()
  if (Results.isErr(sessionResult)) return null
  const sessionUser = sessionResult.data

  if (sessionUser.id !== payload.adminUserId) return null
  if (!userHasPermission(sessionUser, [Permission.FULL_ACCESS])) return null

  const impersonatingUserResult = await getUserById(payload.targetUserId)
  Results.logFailures(impersonatingUserResult)
  return Results.toNullable(impersonatingUserResult)
}

/** True when a validly signed, unexpired impersonation cookie is present (FR-2.5). */
export async function isImpersonatingUser(): Promise<boolean> {
  return !isNil(await readVerifiedPayload())
}

/**
 * Writes the signed cookie for the current (FULL_ACCESS) session user. Callers
 * must have already authorised the request; this only records who did it (FR-2.2).
 */
export async function impersonateUser(
  userId: string
): Promise<Result<string, void>> {
  const secret = getSecret()
  if (isNil(secret)) {
    return err('Impersonation is not configured on this server')
  }

  const sessionResult = await getAuthenticatedUser()
  if (Results.isErr(sessionResult)) {
    return err('Unauthorized: User not authenticated')
  }

  const value = signImpersonationCookie(
    {
      targetUserId: userId,
      adminUserId: sessionResult.data.id,
      iat: Date.now(),
    },
    secret
  )

  const cookieStore = await cookies()
  cookieStore.set(IMPERSONATION_COOKIE_KEY, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: IMPERSONATION_COOKIE_MAX_AGE_SECONDS,
  })
  return ok(undefined)
}

export async function clearImpersonation() {
  const cookieStore = await cookies()
  cookieStore.delete(IMPERSONATION_COOKIE_KEY)
}
