'use server'

import type { Result } from '@/lib/results'
import { err, isErr } from '@/lib/results'
import { isNil, isEmpty } from 'lodash'
import { authorizedAction } from '@/lib/actions/authorized-action'
import { ownsGroupMember, ownsUser } from '@/lib/actions/guards'
import * as GroupMemberRepository from '@/services/weekend-group-member/repository'

/**
 * Every form action below is keyed by the caller's own group-member row (or,
 * for the medical profile, their own user id). The guard checks that key
 * against the session, so a member can only ever sign their own forms.
 */

/**
 * Marks the Statement of Belief as completed for a given group member.
 */
export const signStatementOfBelief = authorizedAction<[string], void>(
  (user, groupMemberId) => ownsGroupMember(user, groupMemberId),
  async (_user, groupMemberId: string) => {
    if (isNil(groupMemberId) || isEmpty(groupMemberId)) {
      return err('Group member ID is required')
    }

    return GroupMemberRepository.upsertFormCompletion(
      groupMemberId,
      'statement_of_belief',
      new Date().toISOString()
    )
  }
)

/**
 * Marks the Commitment Form as completed for a given group member.
 */
export const signCommitmentForm = authorizedAction<[string], void>(
  (user, groupMemberId) => ownsGroupMember(user, groupMemberId),
  async (_user, groupMemberId: string) => {
    if (isNil(groupMemberId) || isEmpty(groupMemberId)) {
      return err('Group member ID is required')
    }

    return GroupMemberRepository.upsertFormCompletion(
      groupMemberId,
      'commitment_form',
      new Date().toISOString()
    )
  }
)

/**
 * Submits the Release of Claim form, saving special needs information.
 * Updates special_needs on all active roster rows for the same group.
 */
export const submitReleaseOfClaim = authorizedAction<
  [string, string | null],
  void
>(
  (user, groupMemberId) => ownsGroupMember(user, groupMemberId),
  async (_user, groupMemberId: string, specialNeeds: string | null) => {
    if (isNil(groupMemberId) || isEmpty(groupMemberId)) {
      return err('Group member ID is required')
    }

    // Upsert form completion
    const formResult = await GroupMemberRepository.upsertFormCompletion(
      groupMemberId,
      'release_of_claim',
      new Date().toISOString()
    )
    if (isErr(formResult)) {
      return formResult
    }

    // Update special_needs on all active roster rows for this group member
    const finalSpecialNeeds =
      !isNil(specialNeeds) && !isEmpty(specialNeeds.trim())
        ? specialNeeds.trim()
        : 'None'

    return GroupMemberRepository.updateSpecialNeedsForGroup(
      groupMemberId,
      finalSpecialNeeds
    )
  }
)

/**
 * Marks the Camp Waiver as completed for a given group member.
 */
export const signCampWaiver = authorizedAction<[string], void>(
  (user, groupMemberId) => ownsGroupMember(user, groupMemberId),
  async (_user, groupMemberId: string) => {
    if (isNil(groupMemberId) || isEmpty(groupMemberId)) {
      return err('Group member ID is required')
    }

    return GroupMemberRepository.upsertFormCompletion(
      groupMemberId,
      'camp_waiver',
      new Date().toISOString()
    )
  }
)

/**
 * Marks the Info Sheet as completed for a given group member.
 */
export const completeInfoSheet = authorizedAction<[string], void>(
  (user, groupMemberId) => ownsGroupMember(user, groupMemberId),
  async (_user, groupMemberId: string) => {
    if (isNil(groupMemberId) || isEmpty(groupMemberId)) {
      return err('Group member ID is required')
    }

    return GroupMemberRepository.upsertFormCompletion(
      groupMemberId,
      'info_sheet',
      new Date().toISOString()
    )
  }
)

/**
 * Updates emergency contact and medical information.
 * Writes to user_medical_profiles keyed by userId.
 */
export const updateRosterMedicalInfo = authorizedAction<
  [
    string,
    {
      emergency_contact_name: string
      emergency_contact_phone: string
      medical_conditions?: string
    },
  ],
  void
>(
  (user, userId) => ownsUser(user, userId),
  async (
    _user,
    userId: string,
    medicalInfo: {
      emergency_contact_name: string
      emergency_contact_phone: string
      medical_conditions?: string
    }
  ) => {
    if (isNil(userId) || isEmpty(userId)) {
      return err('User ID is required')
    }

    return GroupMemberRepository.upsertUserMedicalProfile(userId, {
      emergency_contact_name: medicalInfo.emergency_contact_name,
      emergency_contact_phone: medicalInfo.emergency_contact_phone,
      medical_conditions:
        !isNil(medicalInfo.medical_conditions) &&
        !isEmpty(medicalInfo.medical_conditions.trim())
          ? medicalInfo.medical_conditions.trim()
          : null,
    })
  }
)
