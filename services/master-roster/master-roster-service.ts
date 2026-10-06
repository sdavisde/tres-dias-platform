import 'server-only'

import { isNil } from 'lodash'
import type { Result } from '@/lib/results'
import { isErr, ok, unwrapOr, safeParse, isOk } from '@/lib/results'
import * as MasterRosterRepository from './repository'
import * as EventsRepository from '@/services/events/repository'
import { addressSchema } from '@/lib/users/validation'
import { UserExperienceSchema } from '@/lib/users/experience'
import {
  calculateExperienceLevel,
  calculateRectorReadyStatus,
  countDistinctWeekends,
} from '@/lib/users/experience/calculations'
import type { Tables } from '@/database.types'
import type {
  MasterRoster,
  MasterRosterMember,
  ExperienceDistribution,
  CommunityDataForRosterBuilder,
} from './types'
import { countBy } from 'lodash'

export async function getMasterRoster(): Promise<Result<string, MasterRoster>> {
  const result = await MasterRosterRepository.getMasterRoster()
  if (isErr(result)) {
    return result
  }

  const roster = result.data
  const members: Array<MasterRosterMember> = roster.map((member) => {
    const memberAddress =
      unwrapOr(addressSchema.safeParse(member.address), null) ?? null
    const experience = normalizeUserExperience(member.users_experience)
    const distinctWeekends = countDistinctWeekends(experience)
    const level = calculateExperienceLevel(distinctWeekends)
    const rectorReady = calculateRectorReadyStatus(experience)

    return {
      id: member.id,
      firstName: member.first_name,
      lastName: member.last_name,
      gender: member.gender,
      email: member.email,
      phoneNumber: member.phone_number,
      address: memberAddress,
      communityInformation: {
        churchAffiliation: member.church_affiliation,
        weekendAttended: member.weekend_attended,
        essentialsTrainingDate: member.essentials_training_date,
        specialGiftsAndSkills: member.special_gifts_and_skills,
        isClergy: member.is_clergy,
      },
      permissions: getPermissionsFromUserRoles(member.user_roles),
      roles: member.user_roles?.map((role) => role.roles) ?? [],
      experience,
      level,
      rectorReady,
      profilePhoto: {
        path: member.profile_photo_path,
        updatedAt: member.profile_photo_updated_at,
      },
    }
  })

  return ok({
    members,
  })
}

function normalizeUserExperience(
  userExperience: Array<Tables<'users_experience'>>
) {
  const experienceResults = userExperience.map((experience_record) =>
    safeParse(experience_record, UserExperienceSchema)
  )
  const results = experienceResults.filter(isOk)
  return results.map((result) => result.data)
}

function getPermissionsFromUserRoles(
  user_roles_records: Array<{ roles: Tables<'roles'> }>
): Array<string> {
  return user_roles_records.flatMap((user_role) => user_role.roles.permissions)
}

/**
 * Calculates the experience level distribution for active members of a weekend roster.
 * Excludes dropped members (status === 'drop').
 */
export async function getWeekendRosterExperienceDistribution(
  weekendId: string
): Promise<Result<string, ExperienceDistribution>> {
  const result =
    await MasterRosterRepository.getWeekendRosterWithExperience(weekendId)
  if (isErr(result)) {
    return result
  }

  // Filter to active members only (exclude dropped)
  const activeMembers = result.data.filter((member) => member.status !== 'drop')

  // Calculate experience level for each active member
  const levels = activeMembers.map((member) => {
    const experienceRecords = member.users?.users_experience ?? []
    const distinctWeekends = countDistinctWeekends(experienceRecords)
    return calculateExperienceLevel(distinctWeekends)
  })

  const levelCounts = countBy(levels)
  const total = activeMembers.length

  // Calculate percentage (handle division by zero)
  const toPercentage = (count: number): number =>
    total === 0 ? 0 : Math.round((count / total) * 100)

  return ok({
    level1: {
      count: levelCounts['1'] ?? 0,
      percentage: toPercentage(levelCounts['1'] ?? 0),
    },
    level2: {
      count: levelCounts['2'] ?? 0,
      percentage: toPercentage(levelCounts['2'] ?? 0),
    },
    level3: {
      count: levelCounts['3'] ?? 0,
      percentage: toPercentage(levelCounts['3'] ?? 0),
    },
    total,
  })
}

/**
 * Fetches all community data needed by the roster builder for a given weekend:
 * users with experience, secuela attendance, roster assignments, and draft assignments.
 * Runs queries in parallel for performance.
 */
export async function getCommunityDataForRosterBuilder(
  weekendId: string
): Promise<Result<string, CommunityDataForRosterBuilder>> {
  // Get the weekend's group_id for secuela lookup
  const groupIdResult =
    await MasterRosterRepository.findWeekendGroupId(weekendId)
  if (isErr(groupIdResult)) {
    return groupIdResult
  }

  // Run parallel queries
  const groupId = groupIdResult.data

  const [
    masterRosterResult,
    rosterResult,
    draftResult,
    secuelaResult,
    secuelaDateResult,
  ] = await Promise.all([
    MasterRosterRepository.getMasterRoster(),
    MasterRosterRepository.findRosterAssignments(weekendId),
    MasterRosterRepository.findDraftAssignments(weekendId),
    !isNil(groupId)
      ? MasterRosterRepository.findSecuelaAttendees(groupId)
      : Promise.resolve(ok(new Map<string, string>())),
    !isNil(groupId)
      ? EventsRepository.findSecuelaEventByGroupId(groupId)
      : Promise.resolve(ok(null)),
  ])

  if (isErr(masterRosterResult)) return masterRosterResult
  if (isErr(rosterResult)) return rosterResult
  if (isErr(draftResult)) return draftResult
  if (isErr(secuelaResult)) return secuelaResult
  if (isErr(secuelaDateResult)) return secuelaDateResult

  return ok({
    users: masterRosterResult.data,
    rosterAssignments: rosterResult.data,
    draftAssignments: draftResult.data,
    secuelaAttendees: secuelaResult.data,
    secuelaEvent:
      secuelaDateResult.data?.datetime != null
        ? {
            startDate: secuelaDateResult.data.datetime,
            endDate: secuelaDateResult.data.end_datetime ?? null,
          }
        : null,
  })
}
