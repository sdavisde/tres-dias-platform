'use server'

import { Permission, userHasPermission } from '@/lib/security'
import * as ImperstonationService from './impersonation-service'
import { Results } from '@/lib/results'
import { getLoggedInUser } from '@/services/identity/user/session'
import { authorizedAction } from '@/lib/actions/authorized-action'
import { isNil } from 'lodash'

type ImpersonateUserRequest = {
  userId: string
}
/**
 * Requires FULL_ACCESS - writes the signed impersonation cookie and kicks off the
 * impersonation flow. Impersonation = view the site as another user. The cookie
 * records the real admin's id and is re-verified on every read
 * (services/identity/impersonation/impersonation-service.ts).
 */
export const impersonateUser = async ({ userId }: ImpersonateUserRequest) => {
  // 1. Authenticate and get user
  const userResult = await getLoggedInUser()

  if (Results.isErr(userResult)) {
    return Results.err('Unauthorized: User not authenticated')
  }

  const user = userResult.data

  // 2. test if user has permission to impersonate (FULL_ACCESS)
  // or, if they are already impersonating, check if original user has full_access
  if (
    userHasPermission(user, [Permission.FULL_ACCESS]) ||
    (!isNil(user.originalUser) &&
      userHasPermission(user.originalUser, [Permission.FULL_ACCESS]))
  ) {
    return await ImperstonationService.impersonateUser(userId)
  }

  return Results.err(
    `Forbidden: Cannot impersonate users unless you have FULL_ACCESS permission`
  )
}

/**
 * Ends impersonation. Any signed-in caller may do this: while impersonating a
 * non-admin the session user has no FULL_ACCESS, so requiring it here would
 * lock the admin into the impersonated view (FR-2.6 / FR-4.9).
 */
export const clearImpersonation = authorizedAction<[], void>(
  'authenticated',
  async () => {
    await ImperstonationService.clearImpersonation()
    return Results.ok(undefined)
  }
)
