import { isNil, max, orderBy, uniq } from 'lodash'
import { CHARole } from '@/lib/weekend/types'
import { parseCommunityWeekendRef } from '@/lib/weekend'
import {
  countDistinctWeekends,
  isDttdRecord,
  TEAM_HEAD_ROLES,
} from '@/lib/users/experience/calculations'
import {
  calculateRectorGap,
  type RectorGap,
} from '@/lib/users/experience/rector-selection'
import type { MasterRosterMember } from '@/services/master-roster/types'
import { memberDisplayName } from './people-csv'

export type RectorSelectionRow = {
  member: MasterRosterMember
  name: string
  church: string | null
  /** "Asst Head #10, Head Chapel #12" — their DTTD lay-leadership service. */
  leadership: string | null
  gap: RectorGap
  weekends: number
  /** Highest DTTD weekend number served, or null. */
  lastServed: number | null
}

export type RectorSelection = {
  ready: RectorSelectionRow[]
  oneAway: RectorSelectionRow[]
  further: RectorSelectionRow[]
  servedCount: number
}

const LEADERSHIP_ROLES = new Set<string>([
  CHARole.RECTOR,
  CHARole.HEAD,
  CHARole.ASSISTANT_HEAD,
  ...TEAM_HEAD_ROLES,
])

const SHORT_ROLE: Partial<Record<string, string>> = {
  [CHARole.ASSISTANT_HEAD]: 'Asst Head',
}

function toRow(member: MasterRosterMember): RectorSelectionRow {
  const dttd = member.experience.filter(isDttdRecord)
  const numbered = dttd.map((r) => ({
    role: r.cha_role,
    number: parseCommunityWeekendRef(r.weekend_reference)?.number ?? 0,
  }))
  const leadership = uniq(
    orderBy(
      numbered.filter((r) => LEADERSHIP_ROLES.has(r.role)),
      'number'
    ).map((r) => `${SHORT_ROLE[r.role] ?? r.role} #${r.number}`)
  ).join(', ')

  return {
    member,
    name: memberDisplayName(member),
    church: member.communityInformation.churchAffiliation,
    leadership: leadership === '' ? null : leadership,
    gap: calculateRectorGap(member.experience),
    weekends: countDistinctWeekends(member.experience),
    lastServed: max(numbered.map((r) => r.number)) ?? null,
  }
}

/**
 * The Rector Selection view for one weekend's gender: lay members grouped by
 * how many weekends stand between them and rector readiness. People who have
 * rectored, or are Rector on a weekend not yet finished, are counted but not
 * listed.
 */
export function buildRectorSelection(
  members: MasterRosterMember[],
  gender: 'male' | 'female',
  currentRectorIds: Set<string>
): RectorSelection {
  const eligible = members.filter(
    (m) => m.gender === gender && !m.communityInformation.isClergy
  )
  const served = eligible.filter(
    (m) =>
      m.rectorReady.criteria.hasServedAsRector || currentRectorIds.has(m.id)
  )
  const rows = orderBy(
    eligible.filter((m) => !served.includes(m)).map(toRow),
    [(r) => r.gap.missing.length, (r) => r.weekends],
    ['asc', 'desc']
  )
  return {
    ready: rows.filter((r) => r.gap.weekendsAway === 0),
    oneAway: rows.filter((r) => r.gap.weekendsAway === 1),
    further: rows.filter((r) => r.gap.weekendsAway >= 2),
    servedCount: served.length,
  }
}

export function rowMatchesSearch(
  row: RectorSelectionRow,
  search: string
): boolean {
  const query = search.trim().toLowerCase()
  if (query === '') return true
  return (
    row.name.toLowerCase().includes(query) ||
    (!isNil(row.church) && row.church.toLowerCase().includes(query))
  )
}
