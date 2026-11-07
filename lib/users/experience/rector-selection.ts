import { countBy, isNil, maxBy, toPairs, upperFirst } from 'lodash'
import { CHARole } from '@/lib/weekend/types'
import type { RectorReadyCriteria } from '@/services/master-roster/types'
import type { UserExperience } from './validation'
import {
  calculateRectorReadyStatus,
  countRolloWeekends,
  isDttdRecord,
} from './calculations'

export type RectorCriterion = 'head' | 'teamHead' | 'rollos' | 'dining'

export type RectorGap = {
  missing: RectorCriterion[]
  /** Distinct DTTD weekends with a rollo. */
  rollosGiven: number
  /** 0 when ready. */
  weekendsAway: number
  /** The one role that would finish it, or null when no single role can. */
  finishingRole: string | null
  finishingNote: string | null
  /** Plain words for the whole path, e.g. "Assistant Head, then Head Dining". */
  narrative: string
}

const CRITERION_FLAG: Record<RectorCriterion, keyof RectorReadyCriteria> = {
  head: 'hasServedHeadOrAssistantHead',
  teamHead: 'hasServedTeamHead',
  rollos: 'hasGivenTwoOrMoreTalks',
  dining: 'hasWorkedDining',
}

/** Section roles that grow into a "Head of" role. */
const HEAD_OF_SECTION: Partial<Record<CHARole, CHARole>> = {
  [CHARole.TECH]: CHARole.HEAD_TECH,
  [CHARole.TABLE_LEADER]: CHARole.HEAD_ROLLISTA,
  [CHARole.PRAYER]: CHARole.HEAD_PRAYER,
  [CHARole.CHAPEL]: CHARole.HEAD_CHAPEL,
  [CHARole.MUSIC]: CHARole.HEAD_MUSIC,
  [CHARole.PALANCA]: CHARole.HEAD_PALANCA,
  [CHARole.TABLE]: CHARole.HEAD_TABLE,
  [CHARole.DORM]: CHARole.HEAD_DORM,
  [CHARole.DINING]: CHARole.HEAD_DINING,
  [CHARole.MOBILE]: CHARole.HEAD_MOBILE,
}

/**
 * What stands between a person and rector readiness, one role per weekend
 * (Head Dining covers section head and Dining at once). A rollo is only given
 * as Table Leader, its own job, so each missing rollo is a weekend of its own.
 */
export function calculateRectorGap(records: UserExperience[]): RectorGap {
  const { criteria } = calculateRectorReadyStatus(records)
  const missing = (Object.keys(CRITERION_FLAG) as RectorCriterion[]).filter(
    (c) => !criteria[CRITERION_FLAG[c]]
  )
  const rollosGiven = countRolloWeekends(records)
  const rollosNeeded = missing.includes('rollos')
    ? Math.max(0, 2 - rollosGiven)
    : 0

  const steps: Array<{ role: string; note: string | null }> = []
  if (missing.includes('head')) {
    steps.push({ role: 'Assistant Head', note: 'one slot a weekend' })
  }
  if (missing.includes('teamHead') && missing.includes('dining')) {
    steps.push({ role: 'Head Dining', note: 'covers both' })
  } else if (missing.includes('teamHead')) {
    steps.push(sectionHeadStep(records))
  } else if (missing.includes('dining')) {
    steps.push({ role: 'Dining', note: null })
  }
  const phrases = steps.map((s) => s.role)
  if (rollosNeeded > 0) {
    phrases.push(
      `${rollosNeeded === 1 ? 'a rollo' : 'two rollos'} as Table Leader`
    )
  }

  const weekendsAway = steps.length + rollosNeeded
  const single =
    weekendsAway !== 1
      ? null
      : (steps[0] ?? { role: 'A rollo', note: 'as Table Leader' })
  return {
    missing,
    rollosGiven,
    weekendsAway,
    finishingRole: single?.role ?? null,
    finishingNote: single?.note ?? null,
    narrative: upperFirst(phrases.join(', then ')),
  }
}

function sectionHeadStep(records: UserExperience[]): {
  role: string
  note: string | null
} {
  const counts = countBy(
    records.filter(
      (r) => isDttdRecord(r) && !isNil(HEAD_OF_SECTION[r.cha_role])
    ),
    (r) => r.cha_role
  )
  const best = maxBy(toPairs(counts), ([, n]) => n)
  if (isNil(best)) return { role: 'Any section-head role', note: null }
  const [section, n] = best
  return {
    role: HEAD_OF_SECTION[section as CHARole] as string,
    note: `served ${section} ×${n}`,
  }
}
