import { isNil } from 'lodash'
import { parseCommunityWeekendRef } from '@/lib/weekend'
import type { CommunityWeekendRef } from '@/lib/weekend'
import { COMMUNITY_NAME } from '@/lib/weekend/constants'
import { CHARole } from '@/lib/weekend/types'
import { TEAM_HEAD_ROLES } from '@/lib/users/experience/calculations'

/**
 * Lay leadership only: the Head Spiritual Director is clergy, so their
 * service isn't called out the same way on the timeline.
 */
const LAY_LEADERSHIP_ROLES = new Set<string>([
  CHARole.RECTOR,
  CHARole.HEAD,
  CHARole.ASSISTANT_HEAD,
  ...TEAM_HEAD_ROLES.filter((role) => role !== CHARole.HEAD_SPIRITUAL_DIRECTOR),
])

type ServiceRecord = {
  weekend_reference: string
  cha_role: string
  rollo: string | null
}

export type TimelineEntry<T extends ServiceRecord = ServiceRecord> = {
  record: T
  /** "DTTD #11", or the stored text when it doesn't parse. */
  weekendLabel: string
  /** Lay leadership roles get a filled dot on the timeline. */
  isLayLeadership: boolean
}

/** Reads a stored `DTTD#11` back as "DTTD #11". */
export function formatWeekendRef(ref: CommunityWeekendRef): string {
  return `${ref.community} #${ref.number}`
}

/**
 * Orders a person's service newest first. Numbers only compare within a
 * community, so ours leads, then each other community alphabetically, then
 * anything whose reference doesn't parse.
 */
export function orderServiceHistory<T extends ServiceRecord>(
  experience: T[]
): TimelineEntry<T>[] {
  const rank = (ref: CommunityWeekendRef | null) =>
    isNil(ref) ? 2 : ref.community === COMMUNITY_NAME ? 0 : 1

  return experience
    .map((record) => ({
      record,
      ref: parseCommunityWeekendRef(record.weekend_reference),
    }))
    .sort((a, b) => {
      const byRank = rank(a.ref) - rank(b.ref)
      if (byRank !== 0) return byRank
      if (isNil(a.ref) || isNil(b.ref)) return 0
      const byCommunity = a.ref.community.localeCompare(b.ref.community)
      return byCommunity !== 0 ? byCommunity : b.ref.number - a.ref.number
    })
    .map(({ record, ref }) => ({
      record,
      weekendLabel: isNil(ref)
        ? record.weekend_reference
        : formatWeekendRef(ref),
      isLayLeadership: LAY_LEADERSHIP_ROLES.has(record.cha_role),
    }))
}

export function countRollosGiven(experience: ServiceRecord[]): number {
  return experience.filter((r) => !isNil(r.rollo)).length
}
