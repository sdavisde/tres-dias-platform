'use server'

import type { Address } from '@/lib/users/validation'
import type { BasicInfo } from '@/components/team-forms/schemas'
import { authorizedAction } from '@/lib/actions/authorized-action'
import { ownsUser, ownsUserOrAdmin } from '@/lib/actions/guards'
import { Permission } from '@/lib/security'
import * as UserService from './user-service'
import * as Session from './session'

type ContactInfo = {
  first_name: string | null
  last_name: string | null
  phone_number: string | null
  email: string
  gender: string | null
}

/**
 * Rewrites a member's contact details. Only the admin people editor calls it,
 * so it requires FULL_ACCESS (the page's own gate) rather than ownership.
 */
export const updateUserContactInfo = authorizedAction<
  [string, ContactInfo],
  null
>(Permission.FULL_ACCESS, async (_user, userId, data) => {
  return await UserService.updateUserContactInfo(userId, data)
})

/** A member edits their own address, or an admin edits anyone's. */
export const updateUserAddress = authorizedAction<[string, Address], null>(
  (user, userId) => ownsUserOrAdmin(user, userId),
  async (_user, userId, address) => {
    return await UserService.updateUserAddress(userId, address)
  }
)

/** A member edits their own basic info, or an admin edits anyone's. */
export const updateUserBasicInfo = authorizedAction<[string, BasicInfo], null>(
  (user, userId) => ownsUserOrAdmin(user, userId),
  async (_user, userId, data) => {
    return await UserService.updateUserBasicInfo(userId, data)
  }
)

/** Only the owner sets their own avatar. */
export const updateUserProfilePhoto = authorizedAction<[string, string], null>(
  (user, userId) => ownsUser(user, userId),
  async (_user, userId, path) => {
    return await UserService.updateUserProfilePhoto(userId, path)
  }
)

/** Only the owner removes their own avatar. */
export const removeUserProfilePhoto = authorizedAction<[string], null>(
  (user, userId) => ownsUser(user, userId),
  async (_user, userId) => {
    return await UserService.removeUserProfilePhoto(userId)
  }
)

/**
 * The session primitive `authorizedAction` itself relies on, so it cannot be
 * wrapped. It only ever returns the caller's own (or impersonated) user.
 */
export const getLoggedInUser = async () => {
  return await Session.getLoggedInUser()
}
