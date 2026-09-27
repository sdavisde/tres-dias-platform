import 'server-only'

import z from 'zod'
import { isNil } from 'lodash'
import { createClient } from '@/lib/supabase/server'
import type { Result } from '@/lib/results'
import { err, ok } from '@/lib/results'
import type { UserExperience } from '@/lib/users/experience'
import {
  calculateExperienceLevel,
  calculateRectorReadyStatus,
  groupExperienceByCommunity,
  countDistinctWeekends,
  UserExperienceSchema,
} from '@/lib/users/experience'
import type { UserServiceHistory } from '@/services/master-roster/types'

/**
 * A member's service history: every weekend they have served on, with the
 * derived experience level and rector-readiness.
 *
 * @deprecated - move a version of this function to the master roster service and call that instead.
 * I figure we don't need to join on weekends anymore and can just use the weekend reference
 */
export async function getUserServiceHistory(
  userId: string
): Promise<Result<string, UserServiceHistory>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('users_experience')
      .select(
        `
        id,
        user_id,
        weekend_id,
        cha_role,
        weekend_reference,
        rollo,
        created_at,
        updated_at,
        weekends (
          id,
          type,
          start_date,
          title
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (!isNil(error)) {
      return err(`Failed to fetch user experience: ${error.message}`)
    }

    if (isNil(data)) {
      return ok({
        level: 1,
        rectorReady: {
          isReady: false,
          statusLabel: 'In Progress',
          criteria: {
            hasServedHeadOrAssistantHead: false,
            hasServedTeamHead: false,
            hasGivenTwoOrMoreTalks: false,
            hasWorkedDining: false,
            hasServedAsRector: false,
          },
        },
        experience: [],
        totalWeekends: 0,
        totalDTTDWeekends: 0,
        records: [],
      })
    }

    const parseResult = z.array(UserExperienceSchema).safeParse(data)

    if (!parseResult.success) {
      return err(
        `Invalid experience data: ${parseResult.error.issues
          .map((e) => e.message)
          .join(', ')}`
      )
    }

    const records: UserExperience[] = parseResult.data

    const totalWeekends = countDistinctWeekends(records)
    const level = calculateExperienceLevel(totalWeekends)
    const rectorReady = calculateRectorReadyStatus(records)
    const groupedExperience = groupExperienceByCommunity(records)
    const totalDTTDWeekends = groupedExperience.filter(
      (g) => g.community === 'DTTD'
    ).length

    return ok({
      level,
      rectorReady,
      experience: records,
      totalWeekends,
      totalDTTDWeekends,
    })
  } catch (error) {
    return err(
      `Error while fetching user experience: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * The user an experience row belongs to, or null when no such row exists.
 * Used by ownership guards before a member edits or deletes an entry.
 */
export async function getExperienceOwnerId(
  experienceId: string
): Promise<Result<string, string | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users_experience')
    .select('user_id')
    .eq('id', experienceId)
    .maybeSingle()

  if (!isNil(error)) {
    return err(`Failed to look up experience owner: ${error.message}`)
  }

  return ok(data?.user_id ?? null)
}
