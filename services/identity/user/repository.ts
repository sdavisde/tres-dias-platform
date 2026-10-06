import 'server-only'

import { isNil } from 'lodash'
import { createClient } from '@/lib/supabase/server'
import { err, fromSupabase, ok } from '@/lib/results'
import type { Address } from '@/lib/users/validation'
import type { BasicInfo } from '@/components/team-forms/schemas'
import {
  formatCommunityWeekendRef,
  toCommunityWeekendRef,
} from '@/lib/weekend/weekend-reference'

export const GetUserInfoQuery = `
  id,
  first_name,
  last_name,
  gender,
  email,
  phone_number,
  address,
  church_affiliation,
  weekend_attended,
  essentials_training_date,
  special_gifts_and_skills,
  is_clergy,
  profile_photo_path,
  profile_photo_updated_at
`

export const JoinUserRolesOnUserId = `
  user_roles:user_roles (
    roles (
      id,
      label,
      description,
      permissions,
      type,
      based_on_role_id
    )
  )
`

export const JoinWeekendRosterOnUserId = `
  weekend_group_members!user_id(
    id,
    group_id,
    weekend_groups!group_id(
      number,
      weekends!group_id(
        id,
        type,
        status,
        weekend_roster(
          id,
          user_id,
          cha_role,
          rollo,
          additional_cha_role,
          status,
          weekend_id
        )
      )
    )
  )
`

const GetAllUserInfoQuery = `
  ${GetUserInfoQuery},
  ${JoinUserRolesOnUserId},
  ${JoinWeekendRosterOnUserId}
`

export const getUser = async (userId: string) => {
  const supabase = await createClient()
  const response = await supabase
    .from('users')
    .select(GetAllUserInfoQuery)
    .eq('id', userId)
    .single()
  return fromSupabase(response)
}

export const getAllUsers = async () => {
  const supabase = await createClient()
  const response = await supabase.from('users').select(GetAllUserInfoQuery)
  return fromSupabase(response)
}

export const updateUserRoles = async (userId: string, roleIds: string[]) => {
  const supabase = await createClient()
  const response = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
  if (!isNil(fromSupabase(response).error)) {
    return err('Failed to delete user roles')
  }

  const insertResponse = await supabase
    .from('user_roles')
    .insert(roleIds.map((roleId) => ({ user_id: userId, role_id: roleId })))
    .select()
  return fromSupabase(insertResponse)
}

export const updateProfilePhoto = async (userId: string, path: string) => {
  const supabase = await createClient()
  const response = await supabase
    .from('users')
    .update({
      profile_photo_path: path,
      profile_photo_updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
  return fromSupabase(response)
}

export const clearProfilePhoto = async (userId: string) => {
  const supabase = await createClient()
  const response = await supabase
    .from('users')
    .update({
      profile_photo_path: null,
      profile_photo_updated_at: null,
    })
    .eq('id', userId)
  return fromSupabase(response)
}

export const updateUserAddress = async (userId: string, address: Address) => {
  const supabase = await createClient()
  const response = await supabase
    .from('users')
    .update({ address: address })
    .eq('id', userId)
  return fromSupabase(response)
}

export const deleteUser = async (userId: string) => {
  const supabase = await createClient()

  // Delete related records first (foreign key constraints)
  // 1. User Roles
  const deleteRolesResponse = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)

  if (!isNil(fromSupabase(deleteRolesResponse).error)) {
    return err('Failed to delete user roles')
  }

  // 2. Weekend Roster
  const deleteRosterResponse = await supabase
    .from('weekend_roster')
    .delete()
    .eq('user_id', userId)

  if (!isNil(fromSupabase(deleteRosterResponse).error)) {
    return err('Failed to delete weekend roster')
  }

  // 3. The User
  const deleteUserResponse = await supabase
    .from('users')
    .delete()
    .eq('id', userId)
  return fromSupabase(deleteUserResponse)
}

export const removeUserRole = async (userId: string) => {
  const supabase = await createClient()
  const response = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
  return fromSupabase(response)
}

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
  const supabase = await createClient()
  const response = await supabase
    .from('users')
    .update({
      first_name: data.first_name,
      last_name: data.last_name,
      phone_number: data.phone_number,
      email: data.email,
      gender: data.gender,
    })
    .eq('id', userId)
  return fromSupabase(response)
}

export const updateUserBasicInfo = async (userId: string, data: BasicInfo) => {
  const supabase = await createClient()

  // The admin editor allows clearing the weekend; store null rather than `#NaN`.
  const weekendAttendedStr =
    data.weekend_attended.community === ''
      ? null
      : formatCommunityWeekendRef(
          toCommunityWeekendRef({
            community: data.weekend_attended.community,
            number: parseInt(data.weekend_attended.weekend_number),
          })
        )

  const response = await supabase
    .from('users')
    .update({
      church_affiliation: data.church_affiliation,
      weekend_attended: weekendAttendedStr,
      essentials_training_date: !isNil(data.essentials_training_date)
        ? data.essentials_training_date.toISOString()
        : null,
      special_gifts_and_skills: data.special_gifts_and_skills ?? null,
      is_clergy: data.is_clergy,
    })
    .eq('id', userId)

  return fromSupabase(response)
}
