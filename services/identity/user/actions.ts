'use server'

import type { Address } from '@/lib/users/validation'
import type { BasicInfo } from '@/components/team-forms/schemas'
import * as UserService from './user-service'
import { findImpersonatingUser } from '@/services/identity/impersonation/impersonation-service'

export const updateUserContactInfo = async (
  userId: string,
  data: {
    first_name: string | null
    last_name: string | null
    phone_number: string | null
    email: string
    gender: string | null
  }
) => {
  return await UserService.updateUserContactInfo(userId, data)
}

export const updateUserAddress = async (userId: string, address: Address) => {
  return await UserService.updateUserAddress(userId, address)
}

export const updateUserBasicInfo = async (userId: string, data: BasicInfo) => {
  return await UserService.updateUserBasicInfo(userId, data)
}

export const updateUserProfilePhoto = async (userId: string, path: string) => {
  return await UserService.updateUserProfilePhoto(userId, path)
}

export const removeUserProfilePhoto = async (userId: string) => {
  return await UserService.removeUserProfilePhoto(userId)
}

/** This is required to run `authorizedAction`, so it cannot be wrapped in it. */
export const getLoggedInUser = async () => {
  const impersonatingUser = await findImpersonatingUser()
  return await UserService.getLoggedInUser(impersonatingUser)
}
