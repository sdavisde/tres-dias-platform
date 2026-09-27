import 'server-only'

import type { Result } from '@/lib/results'
import type { User } from '@/lib/users/types'
import { findImpersonatingUser } from '@/services/identity/impersonation/impersonation-service'
import * as UserService from './user-service'

/**
 * The signed-in user for this request, as the app sees them: the impersonated
 * user (with `originalUser` set to the real admin) when a valid impersonation
 * cookie is present, otherwise the session user.
 *
 * Lives outside `actions.ts` so `authorizedAction` can read the session without
 * importing the very action module it wraps.
 */
export async function getLoggedInUser(): Promise<Result<string, User>> {
  const impersonatingUser = await findImpersonatingUser()
  return await UserService.getLoggedInUser(impersonatingUser)
}
