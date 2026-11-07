import { format } from 'date-fns'
import { groupBy, isNil, orderBy, uniq } from 'lodash'
import { CHARole } from '@/lib/weekend/types'
import type {
  ExperienceLevel,
  RectorReadyStatus,
  RectorReadyCriteria,
  RectorReadyStatusLabel,
  GroupedExperience,
  UserExperienceRecord,
} from '@/services/master-roster/types'
import type { UserExperience } from './validation'
import { parseCommunityWeekendRef } from '@/lib/weekend/weekend-reference'

const DTTD_COMMUNITY = 'DTTD'

const HEAD_AND_ASSISTANT_HEAD_ROLES: CHARole[] = [
  CHARole.HEAD,
  CHARole.ASSISTANT_HEAD,
]

/** Lay team heads only: the Head Spiritual Director is clergy (spec 13, Q5). */
export const TEAM_HEAD_ROLES: CHARole[] = [
  CHARole.HEAD_TECH,
  CHARole.HEAD_ROLLISTA,
  CHARole.HEAD_PRAYER,
  CHARole.HEAD_CHAPEL,
  CHARole.HEAD_CHAPEL_TECH,
  CHARole.HEAD_MUSIC,
  CHARole.HEAD_PALANCA,
  CHARole.HEAD_TABLE,
  CHARole.HEAD_DORM,
  CHARole.HEAD_DINING,
  CHARole.HEAD_MOBILE,
]

const DINING_ROLES: string[] = [CHARole.DINING, CHARole.HEAD_DINING]

export function calculateExperienceLevel(
  distinctWeekendCount: number
): ExperienceLevel {
  if (distinctWeekendCount <= 1) {
    return 1
  }
  if (distinctWeekendCount <= 3) {
    return 2
  }
  return 3
}

/** Only service on our own weekends counts toward rector readiness. */
export function isDttdRecord(record: UserExperienceRecord): boolean {
  return (
    parseCommunityWeekendRef(record.weekend_reference)?.community ===
    DTTD_COMMUNITY
  )
}

/**
 * One key per weekend. The stored `DTTD#11` ref is shared by the men's and
 * women's weekends of a group, so it wins over the gendered weekend_id.
 */
function weekendKey(record: UserExperienceRecord): string {
  const ref = parseCommunityWeekendRef(record.weekend_reference)
  return isNil(ref)
    ? (record.weekend_id ?? record.weekend_reference)
    : `${ref.community}#${ref.number}`
}

/** Distinct DTTD weekends on which the person gave a rollo. */
export function countRolloWeekends(records: UserExperience[]): number {
  return countDistinctWeekends(
    records.filter((r) => isDttdRecord(r) && !isNil(r.rollo))
  )
}

export function calculateRectorReadyStatus(
  records: UserExperience[]
): RectorReadyStatus {
  const dttd = records.filter(isDttdRecord)

  const criteria: RectorReadyCriteria = {
    hasServedHeadOrAssistantHead: dttd.some((r) =>
      HEAD_AND_ASSISTANT_HEAD_ROLES.includes(r.cha_role)
    ),
    hasServedTeamHead: dttd.some((r) => TEAM_HEAD_ROLES.includes(r.cha_role)),
    hasGivenTwoOrMoreTalks: countRolloWeekends(dttd) >= 2,
    hasWorkedDining: dttd.some((r) => DINING_ROLES.includes(r.cha_role)),
    hasServedAsRector: dttd.some((r) => r.cha_role === CHARole.RECTOR),
  }
  const { hasServedAsRector } = criteria

  const isReady =
    criteria.hasServedHeadOrAssistantHead &&
    criteria.hasServedTeamHead &&
    criteria.hasGivenTwoOrMoreTalks &&
    criteria.hasWorkedDining

  const statusLabel: RectorReadyStatusLabel = hasServedAsRector
    ? 'Has Served'
    : isReady
      ? 'Qualified'
      : 'In Progress'

  return { isReady, statusLabel, criteria }
}

export function formatExperienceDate(date: Date): string {
  return format(date, 'MMM yyyy')
}

export function groupExperienceByCommunity(
  records: UserExperience[]
): GroupedExperience[] {
  // Sort by date descending
  const sortedRecords = orderBy(records, ['created_at'], ['desc'])

  // Group by community name
  const grouped = groupBy(sortedRecords, (r) => {
    // Unparseable references group under their raw value rather than vanishing.
    return (
      parseCommunityWeekendRef(r.weekend_reference)?.community ??
      r.weekend_reference
    )
  })

  // Transform to output format
  const result = Object.entries(grouped).map(([community, entries]) => {
    return {
      community,
      records: entries,
    }
  })

  // Ensure DTTD comes first
  const dttd = result.find((g) => g.community === 'DTTD')
  const others = result.filter((g) => g.community !== 'DTTD')

  return !isNil(dttd) ? [dttd, ...others] : others
}

/**
 * Counts the number of weekends served by the user
 */
export function countDistinctWeekends(records: UserExperienceRecord[]): number {
  return uniq(records.map(weekendKey)).length
}
