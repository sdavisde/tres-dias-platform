import 'server-only'
import { unstable_rethrow } from 'next/navigation'
import { logger } from '@/lib/logger'
import type { Result } from '@/lib/results'
import { err, isErr } from '@/lib/results'
import { getLoggedInUser } from '@/services/identity/user/session'
import type { Permission } from '@/lib/security'
import { userHasPermission } from '@/lib/security'
import type { User } from '@/lib/users/types'

/**
 * What a server action requires of its caller, checked against the session:
 *
 * - a `Permission`, or a list of them: the caller must hold any one of them
 *   (`FULL_ACCESS` always passes);
 * - `'authenticated'`: any signed-in member;
 * - a predicate over the session user and the action's own arguments, for
 *   ownership checks (see `lib/actions/guards.ts`).
 */
export type ActionGuard<A extends unknown[]> =
  | Permission
  | Permission[]
  | 'authenticated'
  | ((user: User, ...args: A) => boolean | Promise<boolean>)

type GuardedAction<A extends unknown[], R> = (
  user: User,
  ...args: A
) => Promise<Result<string, R>>

/**
 * Wraps a server action so that it only runs for a signed-in caller who
 * satisfies `guard`. Every `'use server'` export is a public HTTP endpoint,
 * so the check happens here, on the server, against the session — never
 * against anything the caller passed in.
 *
 * The wrapped function keeps the action's own positional arguments; the
 * action itself additionally receives the session user first, so it can act
 * on the caller's identity (e.g. attribution) without trusting the client.
 *
 * @param guard - What the caller must satisfy; see {@link ActionGuard}.
 * @param action - The action to run once the caller is authorized.
 */
export const authorizedAction = <A extends unknown[], R>(
  guard: ActionGuard<A>,
  action: GuardedAction<A, R>
) => {
  return async (...args: A): Promise<Result<string, R>> => {
    try {
      const userResult = await getLoggedInUser()

      if (isErr(userResult)) {
        return err('Unauthorized: User not authenticated')
      }

      const user = userResult.data

      const allowed = await satisfiesGuard(guard, user, args)
      if (!allowed) {
        return err(describeDenial(guard))
      }

      return await action(user, ...args)
    } catch (error) {
      // Let Next's own control flow (dynamic usage, redirect, notFound)
      // through instead of reporting it as a failure.
      unstable_rethrow(error)
      // `err` is the key pino (and so Sentry) reads the exception from.
      logger.error({ err: error }, 'Unexpected error in authorized action')
      return err('Internal Server Error')
    }
  }
}

async function satisfiesGuard<A extends unknown[]>(
  guard: ActionGuard<A>,
  user: User,
  args: A
): Promise<boolean> {
  if (guard === 'authenticated') return true
  if (typeof guard === 'function') return await guard(user, ...args)
  return userHasPermission(user, Array.isArray(guard) ? guard : [guard])
}

function describeDenial<A extends unknown[]>(guard: ActionGuard<A>): string {
  if (typeof guard === 'function') return 'Forbidden: Not allowed'
  if (guard === 'authenticated') return 'Forbidden'
  const required = Array.isArray(guard) ? guard.join(' or ') : guard
  return `Forbidden: Missing permission ${required}`
}
