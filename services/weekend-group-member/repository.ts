import 'server-only'

import { isNil } from 'lodash'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Result } from '@/lib/results'
import { err, ok, isErr } from '@/lib/results'
import { isSupabaseError } from '@/lib/supabase/utils'
import { chooseGroupMemberWeekend } from './resolve-weekend'
import type {
  RawGroupMember,
  RawFormCompletion,
  RawMedicalProfile,
} from './types'

export type { RawGroupMember } from './types'

/**
 * Upserts a weekend_group_members row for a given group and user.
 * Safe to call multiple times — ON CONFLICT DO NOTHING ensures idempotency.
 * Returns the group member ID.
 */
export async function upsertGroupMember(
  groupId: string,
  userId: string
): Promise<Result<string, string>> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('weekend_group_members')
    .upsert(
      { group_id: groupId, user_id: userId },
      { onConflict: 'group_id,user_id', ignoreDuplicates: true }
    )

  if (isSupabaseError(error)) {
    return err(`Failed to upsert group member: ${error.message}`)
  }

  // Fetch the ID (upsert with ignoreDuplicates doesn't return data)
  const { data: member, error: fetchError } = await supabase
    .from('weekend_group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single()

  if (isSupabaseError(fetchError) || isNil(member)) {
    return err('Group member was created but could not be fetched')
  }

  return ok(member.id)
}

/**
 * Fetches all group members for a given group.
 */
export async function findGroupMembersByGroupId(
  groupId: string
): Promise<Result<string, RawGroupMember[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('weekend_group_members')
    .select('*')
    .eq('group_id', groupId)

  if (isSupabaseError(error)) {
    return err(`Failed to fetch group members: ${error.message}`)
  }

  return ok(data ?? [])
}

/**
 * Fetches the group members of several groups in one query.
 */
export async function findGroupMembersByGroupIds(
  groupIds: string[]
): Promise<Result<string, RawGroupMember[]>> {
  if (groupIds.length === 0) return ok([])
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('weekend_group_members')
    .select('*')
    .in('group_id', groupIds)

  if (isSupabaseError(error)) {
    return err(`Failed to fetch group members: ${error.message}`)
  }

  return ok(data ?? [])
}

/**
 * Returns the active group member for a user by joining weekend_group_members
 * through weekend_groups to weekends where status = 'ACTIVE'.
 */
export async function getActiveGroupMemberForUser(
  userId: string
): Promise<Result<string, RawGroupMember | null>> {
  const supabase = await createClient()

  // Find the active weekend group
  const { data: activeWeekends, error: weekendsError } = await supabase
    .from('weekends')
    .select('group_id')
    .eq('status', 'ACTIVE')
    .limit(1)

  if (isSupabaseError(weekendsError)) {
    return err('Failed to fetch active weekends')
  }

  const groupId = activeWeekends?.[0]?.group_id
  if (isNil(groupId)) {
    return ok(null)
  }

  const { data: member, error: memberError } = await supabase
    .from('weekend_group_members')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle()

  if (isSupabaseError(memberError)) {
    return err('Failed to fetch group member')
  }

  return ok(member as RawGroupMember | null)
}

/**
 * Resolution of a group member's payment weekend from their roster placement.
 */
export type GroupMemberWeekendResolution = {
  member: RawGroupMember
  /**
   * Distinct weekends (within the member's group) that the member is actively
   * rostered on. Empty when they are on no roster; two entries for a
   * dual-server.
   */
  rosterWeekendIds: string[]
  /**
   * The weekend the member's payments belong to — see
   * chooseGroupMemberWeekend for the 0/1/2-roster rules. Null when they are
   * on no roster.
   */
  weekendId: string | null
}

/**
 * Resolves a group member's weekend from their active roster rows.
 *
 * weekend_group_members is group-scoped, so something must choose the MENS or
 * WOMENS weekend when attributing a payment. The roster is the source of
 * truth: roster rows are matched via group_member_id, or via user_id for
 * legacy rows created before the group_member_id column, restricted to the
 * member's group and excluding dropped rows. Gender is only consulted as a
 * dual-server tiebreak (see chooseGroupMemberWeekend).
 *
 * Uses admin client to bypass RLS — for use in webhook handlers.
 */
export async function getGroupMemberWeekendResolution(
  groupMemberId: string
): Promise<Result<string, GroupMemberWeekendResolution>> {
  const supabase = createAdminClient()

  const { data: member, error: memberError } = await supabase
    .from('weekend_group_members')
    .select('*')
    .eq('id', groupMemberId)
    .maybeSingle()

  if (isSupabaseError(memberError) || isNil(member)) {
    return err('Weekend group member not found')
  }

  const { data: groupWeekends, error: weekendsError } = await supabase
    .from('weekends')
    .select('id, type')
    .eq('group_id', member.group_id)

  if (isSupabaseError(weekendsError)) {
    return err('Failed to fetch weekends for group member')
  }

  const weekendIds = (groupWeekends ?? []).map((w) => w.id)
  if (weekendIds.length === 0) {
    return ok({
      member: member as RawGroupMember,
      rosterWeekendIds: [],
      weekendId: null,
    })
  }

  const { data: rosterRows, error: rosterError } = await supabase
    .from('weekend_roster')
    .select('weekend_id')
    .in('weekend_id', weekendIds)
    .or(`group_member_id.eq.${member.id},user_id.eq.${member.user_id}`)
    .or('status.is.null,status.neq.drop')

  if (isSupabaseError(rosterError)) {
    return err('Failed to fetch roster rows for group member')
  }

  const rosterWeekendIds = [
    ...new Set(
      (rosterRows ?? [])
        .map((row) => row.weekend_id)
        .filter((id): id is string => !isNil(id))
    ),
  ]

  // Gender is only needed for the dual-server tiebreak — skip the lookup in
  // the common single-roster case.
  let gender: string | null = null
  if (rosterWeekendIds.length > 1) {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('gender')
      .eq('id', member.user_id)
      .maybeSingle()

    if (isSupabaseError(userError)) {
      return err('Failed to fetch user for group member')
    }
    gender = user?.gender ?? null
  }

  return ok({
    member: member as RawGroupMember,
    rosterWeekendIds,
    weekendId: chooseGroupMemberWeekend(
      rosterWeekendIds,
      groupWeekends ?? [],
      gender
    ),
  })
}

/**
 * Finds a weekend_group_member by its ID.
 * Also resolves the weekend the member's payments belong to, from their
 * active roster rows — see getGroupMemberWeekendResolution.
 * Uses admin client to bypass RLS — for use in webhook handlers.
 */
export async function getGroupMemberById(
  groupMemberId: string
): Promise<Result<string, RawGroupMember & { weekendId: string | null }>> {
  const resolutionResult = await getGroupMemberWeekendResolution(groupMemberId)
  if (isErr(resolutionResult)) {
    return resolutionResult
  }

  const { member, weekendId } = resolutionResult.data
  return ok({ ...member, weekendId })
}

/**
 * Finds the weekend_group_member for a given weekend_roster ID.
 * Joins through weekend_roster → weekends → weekend_group_members.
 */
export async function getGroupMemberByRosterId(
  rosterId: string
): Promise<Result<string, RawGroupMember>> {
  const supabase = await createClient()

  // Step 1: get the roster record's weekend_id and user_id
  const { data: roster, error: rosterError } = await supabase
    .from('weekend_roster')
    .select('weekend_id, user_id')
    .eq('id', rosterId)
    .single()

  if (isSupabaseError(rosterError) || isNil(roster)) {
    return err('Roster record not found')
  }

  if (isNil(roster.weekend_id) || isNil(roster.user_id)) {
    return err('Roster record is missing weekend_id or user_id')
  }

  // Step 2: get the weekend's group_id
  const { data: weekend, error: weekendError } = await supabase
    .from('weekends')
    .select('group_id')
    .eq('id', roster.weekend_id)
    .single()

  if (isSupabaseError(weekendError) || isNil(weekend?.group_id)) {
    return err('Weekend or group_id not found')
  }

  // Step 3: get the group member
  const { data: member, error: memberError } = await supabase
    .from('weekend_group_members')
    .select('*')
    .eq('group_id', weekend.group_id)
    .eq('user_id', roster.user_id)
    .single()

  if (isSupabaseError(memberError) || isNil(member)) {
    return err('Weekend group member not found')
  }

  return ok(member as RawGroupMember)
}

/**
 * The group members of several users in one group, in one query — what
 * `getGroupMemberByRosterId` resolves row by row once the roster's weekend
 * has been mapped to its group.
 */
export async function findGroupMembersByGroupAndUsers(
  groupId: string,
  userIds: string[]
): Promise<Result<string, RawGroupMember[]>> {
  if (userIds.length === 0) return ok([])
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('weekend_group_members')
    .select('*')
    .eq('group_id', groupId)
    .in('user_id', userIds)

  if (isSupabaseError(error)) {
    return err(`Failed to fetch group members: ${error.message}`)
  }

  return ok((data ?? []) as RawGroupMember[])
}

/**
 * Upserts a form completion record for a group member.
 */
export async function upsertFormCompletion(
  groupMemberId: string,
  formType: string,
  completedAt: string
): Promise<Result<string, void>> {
  const supabase = await createClient()

  const { error } = await supabase.from('team_form_completions').upsert(
    {
      weekend_group_member_id: groupMemberId,
      form_type: formType,
      completed_at: completedAt,
    },
    { onConflict: 'weekend_group_member_id,form_type' }
  )

  if (isSupabaseError(error)) {
    return err(`Failed to upsert form completion: ${error.message}`)
  }

  return ok(undefined)
}

/**
 * Returns all form completions for a group member.
 */
export async function getFormCompletions(
  groupMemberId: string
): Promise<Result<string, RawFormCompletion[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('team_form_completions')
    .select('*')
    .eq('weekend_group_member_id', groupMemberId)

  if (isSupabaseError(error)) {
    return err(`Failed to fetch form completions: ${error.message}`)
  }

  return ok((data ?? []) as RawFormCompletion[])
}

/**
 * The form completions of several group members in one query.
 */
export async function getFormCompletionsForMembers(
  groupMemberIds: string[]
): Promise<Result<string, RawFormCompletion[]>> {
  if (groupMemberIds.length === 0) return ok([])
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('team_form_completions')
    .select('*')
    .in('weekend_group_member_id', groupMemberIds)

  if (isSupabaseError(error)) {
    return err(`Failed to fetch form completions: ${error.message}`)
  }

  return ok((data ?? []) as RawFormCompletion[])
}

/**
 * Updates special_needs on all weekend_roster rows for the same group and user.
 * Uses admin client to bypass RLS for the multi-row update.
 */
export async function updateSpecialNeedsForGroup(
  groupMemberId: string,
  specialNeeds: string
): Promise<Result<string, void>> {
  const supabase = createAdminClient()

  // Get the group member to find group_id and user_id
  const { data: member, error: memberError } = await supabase
    .from('weekend_group_members')
    .select('group_id, user_id')
    .eq('id', groupMemberId)
    .single()

  if (!isNil(memberError) || isNil(member)) {
    return err('Group member not found')
  }

  // Get all weekend IDs for this group
  const { data: weekends, error: weekendsError } = await supabase
    .from('weekends')
    .select('id')
    .eq('group_id', member.group_id)

  if (!isNil(weekendsError) || isNil(weekends) || weekends.length === 0) {
    return err('No weekends found for group')
  }

  const weekendIds = weekends.map((w) => w.id)

  // Update special_needs on all roster rows for this user in this group
  const { error: updateError } = await supabase
    .from('weekend_roster')
    .update({ special_needs: specialNeeds })
    .eq('user_id', member.user_id)
    .in('weekend_id', weekendIds)

  if (!isNil(updateError)) {
    return err(`Failed to update special_needs: ${updateError.message}`)
  }

  return ok(undefined)
}

/**
 * Fetches the user's medical profile.
 */
export async function getUserMedicalProfile(
  userId: string
): Promise<Result<string, RawMedicalProfile | null>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_medical_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (isSupabaseError(error)) {
    return err(`Failed to fetch medical profile: ${error.message}`)
  }

  return ok(data as RawMedicalProfile | null)
}

/**
 * The medical profiles of several users in one query, on the session client
 * so row-level security still applies: a viewer without FULL_ACCESS gets
 * only their own row, exactly as the per-user lookup returns null for
 * everyone else's.
 */
export async function getUserMedicalProfiles(
  userIds: string[]
): Promise<Result<string, RawMedicalProfile[]>> {
  if (userIds.length === 0) return ok([])
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_medical_profiles')
    .select('*')
    .in('user_id', userIds)

  if (isSupabaseError(error)) {
    return err(`Failed to fetch medical profiles: ${error.message}`)
  }

  return ok((data ?? []) as RawMedicalProfile[])
}

/**
 * The active weekend group: the one secuela sign-ins are recorded against.
 */
export async function findActiveGroup(): Promise<
  Result<string, { groupId: string; groupNumber: number | null }>
> {
  const supabase = await createClient()

  const { data: activeWeekend, error } = await supabase
    .from('weekends')
    .select('group_id, weekend_groups(number)')
    .eq('status', 'ACTIVE')
    .limit(1)
    .maybeSingle()

  if (isSupabaseError(error) || isNil(activeWeekend?.group_id)) {
    return err('No active weekend found')
  }

  const groupNumber =
    (activeWeekend.weekend_groups as { number: number | null } | null)
      ?.number ?? null

  return ok({ groupId: activeWeekend.group_id, groupNumber })
}

/**
 * When the group member last signed in through the secuela link (null if never).
 */
export async function findSecuelaSignIn(
  groupMemberId: string
): Promise<Result<string, string | null>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('weekend_group_members')
    .select('attended_secuela_at')
    .eq('id', groupMemberId)
    .single()

  if (isSupabaseError(error)) {
    return err(`Failed to fetch secuela sign-in: ${error.message}`)
  }

  return ok(data?.attended_secuela_at ?? null)
}

/**
 * When the user signed in through the secuela link for a group (null if never,
 * including when they have no membership row in that group).
 */
export async function findSecuelaSignInForUser(
  groupId: string,
  userId: string
): Promise<Result<string, string | null>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('weekend_group_members')
    .select('attended_secuela_at')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle()

  if (isSupabaseError(error)) {
    return err(`Failed to fetch secuela sign-in: ${error.message}`)
  }

  return ok(data?.attended_secuela_at ?? null)
}

/**
 * Records the group member's secuela sign-in time.
 */
export async function setSecuelaSignIn(
  groupMemberId: string,
  signedInAt: string
): Promise<Result<string, null>> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('weekend_group_members')
    .update({ attended_secuela_at: signedInAt })
    .eq('id', groupMemberId)

  if (isSupabaseError(error)) {
    return err('Failed to mark secuela attendance')
  }

  return ok(null)
}

/**
 * Upserts the user's medical profile.
 */
export async function upsertUserMedicalProfile(
  userId: string,
  data: {
    emergency_contact_name: string
    emergency_contact_phone: string
    medical_conditions?: string | null
  }
): Promise<Result<string, void>> {
  const supabase = await createClient()

  const { error } = await supabase.from('user_medical_profiles').upsert(
    {
      user_id: userId,
      emergency_contact_name: data.emergency_contact_name,
      emergency_contact_phone: data.emergency_contact_phone,
      medical_conditions: data.medical_conditions ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (isSupabaseError(error)) {
    return err(`Failed to upsert medical profile: ${error.message}`)
  }

  return ok(undefined)
}
