import 'server-only'

import { isNil } from 'lodash'
import type { User } from '@/lib/users/types'
import {
  Permission,
  userHasPermission,
  canImpersonate as canImpersonateUser,
} from '@/lib/security'
import { isErr } from '@/lib/results'
import { getExperienceOwnerId } from '@/services/user-experience/user-experience-service'

/**
 * Ownership predicates for `authorizedAction`. Each takes the session user
 * first and the action's own arguments after, matching the predicate form of
 * `ActionGuard`, so an action that edits "a user" can require that user to be
 * the caller (or an admin) without trusting the id the client sent.
 */

/** The caller is acting on their own user record. */
export function ownsUser(user: User, userId: string): boolean {
  return user.id === userId
}

/** The caller is acting on their own user record, or holds `FULL_ACCESS`. */
export function ownsUserOrAdmin(user: User, userId: string): boolean {
  return (
    ownsUser(user, userId) || userHasPermission(user, [Permission.FULL_ACCESS])
  )
}

/** The group member row belongs to the caller's own team placement. */
export function ownsGroupMember(user: User, groupMemberId: string): boolean {
  const own = user.teamMemberInfo?.groupMemberId
  return !isNil(own) && own === groupMemberId
}

/**
 * The experience row belongs to the caller, or the caller holds `FULL_ACCESS`.
 * Looks the row up, so an unknown id is denied rather than assumed.
 */
export async function ownsExperienceOrAdmin(
  user: User,
  experienceId: string
): Promise<boolean> {
  if (userHasPermission(user, [Permission.FULL_ACCESS])) return true

  const ownerResult = await getExperienceOwnerId(experienceId)
  if (isErr(ownerResult) || isNil(ownerResult.data)) return false

  return ownsUser(user, ownerResult.data)
}

/**
 * The caller may impersonate: `FULL_ACCESS` on the session user, or on the
 * real admin behind an impersonation (`originalUser`), so an admin can switch
 * users while already impersonating someone.
 */
export function canImpersonate(user: User): boolean {
  return canImpersonateUser(user)
}
