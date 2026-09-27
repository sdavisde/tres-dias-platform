/**
 * Builds a complete, internally consistent local world for one point in the
 * six-month weekend cycle. Every date is derived from `now`, so the data never
 * goes stale: rerun the seed and the active weekend is still where the phase
 * says it should be.
 *
 * Groups: #43 and #44 are finished (#43 predates fee tracking), #45 is the
 * active group, and in `post-weekend` #46 exists in PLANNING, ready to activate.
 */
import {
  CANDIDATE_PROFILES,
  CAMP,
  CHURCHES,
  CITIES,
  FEMALE_FIRST_NAMES,
  HEAD_ROLES,
  BASIC_ROLES,
  LAST_NAMES,
  MALE_FIRST_NAMES,
  MEETING_LOCATIONS,
  OTHER_COMMUNITIES,
  SHIRT_SIZES,
  SPIRITUAL_DIRECTOR_TEAM,
  STREETS,
  TEAM_FORMS,
  WEEKEND_TEAM,
  type Slot,
  type SlotLevel,
} from './data.ts'
import {
  addDays,
  createRng,
  daysBetween,
  iso,
  localTime,
  raw,
  stableId,
  stamp,
  thursdayOnOrAfter,
  thursdayOnOrBefore,
  type Day,
  type Row,
} from './lib.ts'

export const PHASES = ['pre-weekend', 'weekend', 'post-weekend'] as const
export type Phase = (typeof PHASES)[number]

/** What each phase is for, shown in the confirmation prompt. See README.md. */
export const PHASE_DESCRIPTIONS: Record<Phase, string> = {
  'pre-weekend':
    'The team getting ready: #45 is ~2 months out, 2 of 4 team meetings done, candidates in every status. For testing team fees, team forms, sponsorship and candidate review. You are a men’s Table Leader with an unpaid fee and 3 forms left.',
  weekend:
    'The weekends are happening: the men’s weekend of #45 is underway or just finished, the women’s is next week, and nearly everyone has paid.',
  'post-weekend':
    'Close out and start the next group: both #45 weekends are over but #45 is still ACTIVE, and #46 exists in PLANNING with nothing scheduled. For testing close-out and planning #46’s secuela.',
}

const ACTIVE_GROUP = 45
const FIRST_GROUP = 43
const DAYS_BETWEEN_GROUPS = 26 * 7 // keeps every anchor on a Thursday

const TEAM_FEE = 200
const CANDIDATE_FEE = 200
const ONLINE_SURCHARGE = 10
const STRIPE_GROSS = TEAM_FEE + ONLINE_SURCHARGE
const STRIPE_FEE = Math.round((STRIPE_GROSS * 0.029 + 0.3) * 100) / 100

export const SEAN_ID = 'b0000001-0000-4000-8000-000000000001'
export const NICK_ID = 'b0000002-0000-4000-8000-000000000002'

const ROLE_IDS = {
  fullAccess: 'a0000001-0000-4000-8000-000000000001',
  leadersCommittee: 'a0000002-0000-4000-8000-000000000002',
  preWeekendCouple: 'a0000004-0000-4000-8000-000000000004',
  correspondingSecretary: 'a0000005-0000-4000-8000-000000000005',
  president: 'a0000006-0000-4000-8000-000000000006',
  vicePresident: 'a0000007-0000-4000-8000-000000000007',
  treasurer: 'a0000008-0000-4000-8000-000000000008',
  communitySpiritualDirector: 'a0000010-0000-4000-8000-000000000010',
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Gender = 'Male' | 'Female'
type WeekendType = 'MENS' | 'WOMENS'
type Tier = 'veteran' | 'experienced' | 'newer' | 'clergy' | 'graduate'

type Person = {
  id: string
  first: string
  last: string
  email: string
  gender: Gender
  church: string
  phone: string
  /** e.g. `DTTD Mens #40` */
  attended: string
  tier: Tier
  /** The first group this person can serve on. */
  eligibleFrom: number
  createdAt: Day
}

type Weekend = {
  id: string
  type: WeekendType
  start: Day
  end: Day
}

type Group = {
  number: number
  id: string
  status: 'PLANNING' | 'ACTIVE' | 'FINISHED'
  /** Men's weekend start (a Thursday). */
  anchor: Day
  secuela: Day
  hasFees: boolean
  /** Whether team, candidates and events exist yet. */
  populated: boolean
  weekends: Record<WeekendType, Weekend>
}

type Assignment = {
  person: Person
  weekend: Weekend
  role: string
  rollo: string | null
  dropped: boolean
}

export type Tables = {
  people: Person[]
  userRoles: Row[]
  weekendGroups: Row[]
  weekends: Row[]
  events: Row[]
  groupMembers: Row[]
  roster: Row[]
  formCompletions: Row[]
  experience: Row[]
  candidates: Row[]
  sponsorships: Row[]
  candidateInfo: Row[]
  payments: Row[]
}

export type Summary = {
  phase: Phase
  now: Day
  groups: { number: number; status: string; mens: Day; womens: Day }[]
  activeEvents: { title: string; day: Day }[]
  sean: string[]
}

// -----------------------------------------------------------------------------
// Timeline
// -----------------------------------------------------------------------------

function activeAnchor(phase: Phase, now: Day): Day {
  switch (phase) {
    case 'pre-weekend':
      return thursdayOnOrAfter(addDays(now, 60))
    case 'weekend':
      return thursdayOnOrBefore(now)
    case 'post-weekend':
      // Women's weekend (anchor + 7..10) ended at least a day ago.
      return thursdayOnOrBefore(addDays(now, -12))
  }
}

function buildGroups(phase: Phase, now: Day): Group[] {
  const active = activeAnchor(phase, now)
  const numbers = [43, 44, 45, ...(phase === 'post-weekend' ? [46] : [])]

  return numbers.map((number) => {
    const anchor = addDays(
      active,
      (number - ACTIVE_GROUP) * DAYS_BETWEEN_GROUPS
    )
    const weekend = (type: WeekendType, offset: number): Weekend => ({
      id: stableId(`weekend:${number}:${type}`),
      type,
      start: addDays(anchor, offset),
      end: addDays(anchor, offset + 3),
    })

    return {
      number,
      id: stableId(`group:${number}`),
      status:
        number < ACTIVE_GROUP
          ? 'FINISHED'
          : number === ACTIVE_GROUP
            ? 'ACTIVE'
            : 'PLANNING',
      anchor,
      // A Saturday about a month after the previous group's weekends.
      secuela: addDays(anchor, -152),
      hasFees: number > FIRST_GROUP,
      populated: number <= ACTIVE_GROUP,
      weekends: { MENS: weekend('MENS', 0), WOMENS: weekend('WOMENS', 7) },
    }
  })
}

const minDay = (a: Day, b: Day) => (a < b ? a : b)

/** A day in [from, to], clamped so nothing is recorded in the future. */
function dayBetween(
  rng: ReturnType<typeof createRng>,
  from: Day,
  to: Day,
  now: Day
): Day {
  const end = minDay(to, addDays(now, -1))
  const span = Math.max(0, daysBetween(from, end))
  return addDays(from, rng.int(0, span))
}

// -----------------------------------------------------------------------------
// People
// -----------------------------------------------------------------------------

class NameBook {
  private used = new Set<string>()
  private rng = createRng('names')

  take(gender: Gender): { first: string; last: string; email: string } {
    const firsts = gender === 'Male' ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES
    for (;;) {
      const first = this.rng.pick(firsts)
      const last = this.rng.pick(LAST_NAMES)
      const key = `${first} ${last}`
      if (this.used.has(key)) continue
      this.used.add(key)
      return {
        first,
        last,
        email: `${first}.${last}@example.com`.toLowerCase(),
      }
    }
  }

  reserve(first: string, last: string) {
    this.used.add(`${first} ${last}`)
  }
}

const phoneFor = (n: number) =>
  `325-${String(200 + (n % 800)).padStart(3, '0')}-${String(1000 + ((n * 37) % 9000)).padStart(4, '0')}`

const weekendLabel = (gender: Gender, number: number) =>
  `DTTD ${gender === 'Male' ? 'Mens' : 'Womens'} #${number}`

function buildCommunity(names: NameBook, now: Day): Person[] {
  const rng = createRng('community')
  const people: Person[] = []
  const since = addDays(now, -900)

  names.reserve('Sean', 'Davis')
  names.reserve('Nick', 'Fierro')
  people.push(
    {
      id: SEAN_ID,
      first: 'Sean',
      last: 'Davis',
      email: 'sdavisde@gmail.com',
      gender: 'Male',
      church: 'First Baptist Church',
      phone: '555-123-4567',
      attended: weekendLabel('Male', 42),
      tier: 'newer',
      eligibleFrom: FIRST_GROUP,
      createdAt: since,
    },
    {
      id: NICK_ID,
      first: 'Nick',
      last: 'Fierro',
      email: 'nick44fierro@gmail.com',
      gender: 'Male',
      church: 'Grace Community Church',
      phone: '555-234-5678',
      attended: weekendLabel('Male', 36),
      tier: 'veteran',
      eligibleFrom: FIRST_GROUP,
      createdAt: since,
    }
  )

  const add = (gender: Gender, tier: Tier, index: number) => {
    const name = names.take(gender)
    const attendedRange: Record<Tier, [number, number]> = {
      veteran: [28, 35],
      experienced: [36, 39],
      newer: [40, 42],
      clergy: [30, 38],
      graduate: [0, 0],
    }
    const [lo, hi] = attendedRange[tier]
    const n = people.length
    people.push({
      id: stableId(`person:${gender}:${tier}:${index}`),
      ...name,
      gender,
      church: rng.pick(CHURCHES),
      phone: phoneFor(n),
      attended: weekendLabel(gender, rng.int(lo, hi)),
      tier,
      eligibleFrom: FIRST_GROUP,
      createdAt: addDays(since, rng.int(0, 120)),
    })
  }

  for (const gender of ['Male', 'Female'] as const) {
    for (let i = 0; i < 75; i++) {
      add(gender, i < 12 ? 'veteran' : i < 40 ? 'experienced' : 'newer', i)
    }
  }
  for (let i = 0; i < 5; i++) add('Male', 'clergy', i)

  return people
}

const attendedNumber = (person: Person) => Number(person.attended.split('#')[1])

/**
 * Service history from before the seeded groups (weekend_id NULL), shaped by
 * tier so role-eligibility rules in the roster builder have real signal.
 */
function priorExperience(people: Person[]): Row[] {
  const rng = createRng('prior-experience')
  const rows: Row[] = []

  for (const person of people) {
    const start = attendedNumber(person)
    const entries: [number, string, string | null][] = []

    switch (person.tier) {
      case 'veteran':
        entries.push(
          [start + 1, 'Dining', null],
          [start + 2, 'Table Leader', rng.pick(['Ideals', 'Church', 'Study'])],
          [start + 3, rng.pick(HEAD_ROLES), null],
          [start + 4, 'Table Leader', rng.pick(['Piety', 'Action', 'Leaders'])],
          [start + 5, 'Assistant Head', null]
        )
        break
      case 'experienced':
        entries.push([start + 1, rng.pick(BASIC_ROLES), null])
        if (rng.chance(0.6))
          entries.push([start + 2, rng.pick(BASIC_ROLES), null])
        entries.push(
          rng.chance(0.5)
            ? [start + 3, rng.pick(HEAD_ROLES), null]
            : [start + 3, 'Table Leader', rng.pick(['Environments', 'Study'])]
        )
        break
      case 'newer':
        if (start < 42 && rng.chance(0.5)) {
          entries.push([42, rng.pick(BASIC_ROLES), null])
        }
        break
      case 'clergy':
        entries.push(
          [start + 1, 'Spiritual Director Trainee', null],
          [start + 3, 'Spiritual Director', 'Grace']
        )
        break
    }

    entries
      .filter(([number]) => number < FIRST_GROUP)
      .forEach(([number, role, rollo], i) => {
        rows.push(experienceRow(person, `DTTD#${number}`, role, rollo, i))
      })

    if (
      (person.tier === 'veteran' || person.tier === 'experienced') &&
      rng.chance(0.15)
    ) {
      const community = rng.pick(OTHER_COMMUNITIES)
      rows.push(
        experienceRow(
          person,
          `${community}#${rng.int(5, 20)}`,
          rng.pick(BASIC_ROLES),
          null,
          99
        )
      )
    }
  }

  return rows
}

function experienceRow(
  person: Person,
  reference: string,
  role: string,
  rollo: string | null,
  index: number
): Row {
  return {
    id: stableId(`experience:${person.id}:${reference}:${index}`),
    user_id: person.id,
    weekend_id: null,
    cha_role: role,
    weekend_reference: reference,
    rollo,
    created_at: stamp(person.createdAt),
    updated_at: stamp(person.createdAt),
  }
}

// -----------------------------------------------------------------------------
// Teams
// -----------------------------------------------------------------------------

const LEVEL_ORDER: SlotLevel[] = ['lead', 'head', 'rollista', 'basic']

/** Lower is a better fit for the slot. */
const FIT: Record<SlotLevel, Record<Tier, number>> = {
  lead: { veteran: 0, experienced: 1, newer: 3, graduate: 4, clergy: 9 },
  head: { experienced: 0, veteran: 1, newer: 2, graduate: 3, clergy: 9 },
  rollista: { experienced: 0, veteran: 0, newer: 2, graduate: 3, clergy: 9 },
  basic: { graduate: 0, newer: 0, experienced: 1, veteran: 2, clergy: 9 },
}

/** Sean's own path: first-timer roles, then a rollo on the active weekend. */
/**
 * Fixed pre-weekend states on #45 that E2E tests rely on, keyed by the
 * non-dropped roster slot that holds them. Documented in the README under
 * "E2E fixtures" — keep the two in sync.
 */
export const PINNED_PRE_WEEKEND: Partial<
  Record<string, { forms: number; pay: 'none'; scenario: string }>
> = {
  'MENS:Head Dorm': { forms: 0, pay: 'none', scenario: 'blank slate' },
  'MENS:Head Palanca': { forms: 5, pay: 'none', scenario: 'team fee' },
  'WOMENS:Head Table': { forms: 0, pay: 'none', scenario: 'team forms' },
}

/** A plain member who is never placed on a roster (the negative case). */
export const NEVER_ROSTERED_ID = stableId('person:Male:newer:74')

const SEAN_ROLES: Partial<
  Record<number, { role: string; rollo: string | null }>
> = {
  43: { role: 'Dining', rollo: null },
  44: { role: 'Palanca', rollo: null },
  45: { role: 'Table Leader', rollo: 'Study' },
}

function buildTeam(
  group: Group,
  people: Person[],
  pastRectors: Set<string>
): Assignment[] {
  const assignments: Assignment[] = []
  const rng = createRng(`team:${group.number}`)
  const eligible = (gender: Gender) =>
    people.filter(
      (p) =>
        p.gender === gender &&
        p.tier !== 'clergy' &&
        p.eligibleFrom <= group.number &&
        p.id !== NEVER_ROSTERED_ID
    )

  // Clergy serve both weekends of the group.
  const clergy = rng.shuffle(people.filter((p) => p.tier === 'clergy'))
  SPIRITUAL_DIRECTOR_TEAM.forEach((slot, i) => {
    for (const weekend of Object.values(group.weekends)) {
      assignments.push({
        person: clergy[i],
        weekend,
        role: slot.role,
        rollo: slot.rollo,
        dropped: false,
      })
    }
  })

  let sharedChapelTech: Person | null = null

  for (const weekend of Object.values(group.weekends)) {
    const gender: Gender = weekend.type === 'MENS' ? 'Male' : 'Female'
    const pool = rng.shuffle(eligible(gender))
    const used = new Set<string>()
    const slots = [...WEEKEND_TEAM].sort(
      (a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level)
    )
    const filled: { slot: Slot; person: Person }[] = []

    const place = (slot: Slot, person: Person) => {
      used.add(person.id)
      filled.push({ slot, person })
    }

    const sean = SEAN_ROLES[group.number]
    if (weekend.type === 'MENS' && sean !== undefined) {
      const index = slots.findIndex((s) => s.role === sean.role)
      const [slot] = slots.splice(index, 1)
      place(
        { ...slot, rollo: sean.rollo as Slot['rollo'] },
        people.find((p) => p.id === SEAN_ID)!
      )
    }

    // The men's Head Chapel Tech runs chapel tech on both weekends.
    if (weekend.type === 'WOMENS' && sharedChapelTech !== null) {
      const index = slots.findIndex((s) => s.role === 'Head Chapel Tech')
      const [slot] = slots.splice(index, 1)
      place(slot, sharedChapelTech)
    }

    for (const slot of slots) {
      const choices = pool.filter(
        (p) =>
          !used.has(p.id) &&
          p.id !== SEAN_ID &&
          !(slot.role === 'Rector' && pastRectors.has(p.id))
      )
      const best = choices.reduce((a, b) =>
        FIT[slot.level][b.tier] < FIT[slot.level][a.tier] ? b : a
      )
      if (slot.role === 'Rector') pastRectors.add(best.id)
      if (slot.role === 'Head Chapel Tech' && weekend.type === 'MENS') {
        sharedChapelTech = best
      }
      place(slot, best)
    }

    for (const { slot, person } of filled) {
      assignments.push({
        person,
        weekend,
        role: slot.role,
        rollo: slot.rollo,
        dropped: false,
      })
    }

    // Drops: someone originally held a slot and stepped down; the current
    // holder replaced them, so every position is still filled.
    const dropCount = group.number === ACTIVE_GROUP ? 2 : 1
    const droppable = filled.filter(
      ({ slot, person }) =>
        (slot.level === 'basic' || slot.level === 'head') &&
        person.id !== SEAN_ID &&
        person !== sharedChapelTech
    )
    const spare = pool.filter((p) => !used.has(p.id) && p.id !== SEAN_ID)
    for (let i = 0; i < dropCount && i < spare.length; i++) {
      const { slot } = droppable[(i * 11 + 3) % droppable.length]
      assignments.push({
        person: spare[i],
        weekend,
        role: slot.role,
        rollo: null,
        dropped: true,
      })
    }
  }

  return assignments
}

// -----------------------------------------------------------------------------
// World
// -----------------------------------------------------------------------------

export function buildWorld(
  phase: Phase,
  now: Day
): { tables: Tables; summary: Summary } {
  const names = new NameBook()
  const people = buildCommunity(names, now)
  const groups = buildGroups(phase, now)
  const pastRectors = new Set<string>()
  const byId = new Map(people.map((p) => [p.id, p]))

  const tables: Tables = {
    people,
    userRoles: [],
    weekendGroups: [],
    weekends: [],
    events: [],
    groupMembers: [],
    roster: [],
    formCompletions: [],
    experience: priorExperience(people),
    candidates: [],
    sponsorships: [],
    candidateInfo: [],
    payments: [],
  }
  const summary: Summary = {
    phase,
    now,
    groups: groups.map((g) => ({
      number: g.number,
      status: g.status,
      mens: g.weekends.MENS.start,
      womens: g.weekends.WOMENS.start,
    })),
    activeEvents: [],
    sean: [],
  }

  tables.userRoles = boardRoles(people)

  for (const group of groups) {
    tables.weekendGroups.push({
      id: group.id,
      number: group.number,
      team_fee: group.hasFees ? TEAM_FEE : null,
      candidate_fee: group.hasFees ? CANDIDATE_FEE : null,
      online_surcharge: group.hasFees ? ONLINE_SURCHARGE : null,
      created_at: stamp(addDays(group.anchor, -210)),
    })
    for (const weekend of Object.values(group.weekends)) {
      tables.weekends.push({
        id: weekend.id,
        group_id: group.id,
        type: weekend.type,
        title: `DTTD ${weekend.type === 'MENS' ? 'Mens' : 'Womens'} #${group.number}`,
        start_date: iso(weekend.start),
        end_date: iso(weekend.end),
        status: group.status,
        created_at: stamp(addDays(group.anchor, -210)),
      })
    }

    if (!group.populated) continue

    const events = groupEvents(group)
    tables.events.push(...events.rows)
    if (group.number === ACTIVE_GROUP) summary.activeEvents = events.listed

    const team = buildTeam(group, people, pastRectors)
    addTeam(tables, group, team, phase, now, summary)

    const graduates = addCandidates(tables, group, people, names, phase, now)
    for (const graduate of graduates) {
      people.push(graduate)
      byId.set(graduate.id, graduate)
    }
  }

  return { tables, summary }
}

function boardRoles(people: Person[]): Row[] {
  const pick = (gender: Gender, tier: Tier, index: number) =>
    people.filter((p) => p.gender === gender && p.tier === tier)[index].id

  const assignments: [string, string][] = [
    [SEAN_ID, ROLE_IDS.fullAccess],
    [NICK_ID, ROLE_IDS.fullAccess],
    [pick('Male', 'veteran', 2), ROLE_IDS.preWeekendCouple],
    [pick('Female', 'veteran', 2), ROLE_IDS.preWeekendCouple],
    [pick('Male', 'veteran', 3), ROLE_IDS.president],
    [pick('Female', 'veteran', 3), ROLE_IDS.vicePresident],
    [pick('Female', 'experienced', 0), ROLE_IDS.treasurer],
    [pick('Male', 'experienced', 0), ROLE_IDS.correspondingSecretary],
    [pick('Male', 'clergy', 0), ROLE_IDS.communitySpiritualDirector],
    [pick('Male', 'veteran', 4), ROLE_IDS.leadersCommittee],
    [pick('Female', 'veteran', 4), ROLE_IDS.leadersCommittee],
    [pick('Male', 'veteran', 5), ROLE_IDS.leadersCommittee],
  ]

  return assignments.map(([user_id, role_id]) => ({ user_id, role_id }))
}

function groupEvents(group: Group): {
  rows: Row[]
  listed: { title: string; day: Day }[]
} {
  const T = group.anchor
  const rows: Row[] = []
  const listed: { title: string; day: Day }[] = []

  const event = (
    title: string,
    type: string,
    day: Day,
    start: string,
    endDay: Day,
    end: string,
    location: string,
    weekendId: string | null = null
  ) => {
    rows.push({
      title,
      type,
      datetime: localTime(day, start),
      end_datetime: localTime(endDay, end),
      location,
      weekend_group_id: group.id,
      weekend_id: weekendId,
    })
    listed.push({ title, day })
  }

  // Group-level: every offset from the Thursday anchor lands on a Saturday.
  event(
    'Secuela',
    'secuela',
    group.secuela,
    '14:00',
    group.secuela,
    '20:00',
    CAMP
  )
  const meetings: [string, number][] = [
    ['Team Meeting #1', -96],
    ['Team Meeting #2', -68],
    ['Team Meeting #3', -40],
    ['Final Team Meeting', -12],
  ]
  meetings.forEach(([title, offset], i) => {
    const day = addDays(T, offset)
    event(
      title,
      'meeting',
      day,
      '09:00',
      day,
      '12:00',
      MEETING_LOCATIONS[i % 3]
    )
  })
  const workshop = addDays(T, -47)
  event(
    'Palanca Workshop',
    'other',
    workshop,
    '18:30',
    workshop,
    '20:30',
    'Community Chapel'
  )
  const practice = addDays(T, -19)
  event(
    'Serenade Practice',
    'other',
    practice,
    '15:00',
    practice,
    '17:00',
    'Community Chapel'
  )

  for (const weekend of Object.values(group.weekends)) {
    const who = weekend.type === 'MENS' ? 'Men’s' : 'Women’s'
    const S = weekend.start
    event(
      `${who} Sendoff`,
      'sendoff',
      S,
      '17:00',
      S,
      '18:30',
      'First Baptist Church',
      weekend.id
    )
    event(
      `${who} Weekend`,
      'weekend',
      S,
      '19:00',
      weekend.end,
      '16:00',
      CAMP,
      weekend.id
    )
    const serenade = addDays(S, 2)
    event(
      `${who} Serenade`,
      'serenade',
      serenade,
      '20:00',
      serenade,
      '21:30',
      CAMP,
      weekend.id
    )
    event(
      `${who} Closing`,
      'closing',
      weekend.end,
      '14:00',
      weekend.end,
      '16:00',
      CAMP,
      weekend.id
    )
  }

  return { rows, listed }
}

function addTeam(
  tables: Tables,
  group: Group,
  team: Assignment[],
  phase: Phase,
  now: Day,
  summary: Summary
) {
  const rng = createRng(`team-records:${group.number}:${phase}`)
  const isActive = group.number === ACTIVE_GROUP
  const lastWeekendEnd = group.weekends.WOMENS.end
  const members = new Map<
    string,
    { id: string; joined: Day; weekend: Weekend }
  >()

  // One membership per person per group, however many roster rows they have.
  for (const a of team) {
    if (members.has(a.person.id)) continue
    const joined = dayBetween(
      rng,
      addDays(group.secuela, 1),
      addDays(group.secuela, 30),
      now
    )
    const id = stableId(`member:${group.number}:${a.person.id}`)
    members.set(a.person.id, { id, joined, weekend: a.weekend })
    tables.groupMembers.push({
      id,
      group_id: group.id,
      user_id: a.person.id,
      attended_secuela_at:
        rng.chance(0.85) || a.person.id === SEAN_ID
          ? localTime(group.secuela, '14:00')
          : null,
      created_at: stamp(joined),
    })
  }

  team.forEach((a, i) => {
    const member = members.get(a.person.id)!
    tables.roster.push({
      id: stableId(
        `roster:${group.number}:${a.weekend.type}:${a.person.id}:${a.role}:${i}`
      ),
      weekend_id: a.weekend.id,
      user_id: a.person.id,
      group_member_id: member.id,
      cha_role: a.role,
      rollo: a.rollo,
      status: a.dropped ? 'drop' : 'awaiting_payment',
      created_at: stamp(member.joined),
    })
  })

  const dropped = new Set(team.filter((a) => a.dropped).map((a) => a.person.id))
  const clergy = new Set(
    team.filter((a) => a.person.tier === 'clergy').map((a) => a.person.id)
  )
  const firstDropped = team.find((a) => a.dropped)?.person.id

  // Experience: what closing out the group writes (non-dropped rows only).
  if (group.status === 'FINISHED') {
    const seen = new Map<string, Row>()
    for (const a of team) {
      if (a.dropped) continue
      const key = `${a.person.id}::${a.role}`
      const existing = seen.get(key)
      if (existing !== undefined) {
        if (existing.rollo === null && a.rollo !== null)
          existing.rollo = a.rollo
        continue
      }
      const closedOn = minDay(addDays(lastWeekendEnd, 21), addDays(now, -1))
      seen.set(key, {
        id: stableId(`experience:${group.number}:${key}`),
        user_id: a.person.id,
        weekend_id: a.weekend.id,
        cha_role: a.role,
        weekend_reference: `DTTD#${group.number}`,
        rollo: a.rollo,
        created_at: stamp(closedOn),
        updated_at: stamp(closedOn),
      })
    }
    tables.experience.push(...seen.values())
  }

  // How far along the team is on forms and fees.
  const pinnedSlots = new Map(
    team.flatMap((a) => {
      const pinned = PINNED_PRE_WEEKEND[`${a.weekend.type}:${a.role}`]
      return !isActive || a.dropped || pinned === undefined
        ? []
        : [[a.person.id, pinned] as const]
    })
  )

  const readiness = (
    personId: string
  ): { forms: number; pay: 'full' | 'partial' | 'none' } => {
    if (!isActive || phase === 'post-weekend') return { forms: 5, pay: 'full' }
    const pinned = pinnedSlots.get(personId)
    if (phase === 'pre-weekend' && pinned !== undefined) return pinned
    if (personId === SEAN_ID) {
      return phase === 'pre-weekend'
        ? { forms: 2, pay: 'none' }
        : { forms: 5, pay: 'full' }
    }
    if (phase === 'weekend') {
      return rng.chance(0.95)
        ? { forms: 5, pay: 'full' }
        : { forms: 5, pay: 'none' }
    }
    const roll = rng.next()
    const forms = roll < 0.75 ? 5 : roll < 0.9 ? rng.int(1, 4) : 0
    const payRoll = rng.next()
    return {
      forms,
      pay: payRoll < 0.7 ? 'full' : payRoll < 0.75 ? 'partial' : 'none',
    }
  }

  const formsDeadline = addDays(group.anchor, -7)

  for (const [personId, member] of members) {
    const person = team.find((a) => a.person.id === personId)!.person
    const isDropped = dropped.has(personId)
    const state = isDropped
      ? {
          forms: rng.int(0, 5),
          pay: personId === firstDropped && group.hasFees ? 'full' : 'none',
        }
      : readiness(personId)

    TEAM_FORMS.slice(0, state.forms).forEach((form, i) => {
      const on = dayBetween(rng, member.joined, formsDeadline, now)
      tables.formCompletions.push({
        id: stableId(`form:${member.id}:${form}`),
        weekend_group_member_id: member.id,
        form_type: form,
        completed_at: stamp(on, `1${i}:00`),
      })
    })

    if (personId === SEAN_ID && isActive) {
      summary.sean.push(
        `Men's Table Leader (Study rollo) on #${group.number}`,
        `${state.forms}/5 team forms complete`,
        state.pay === 'full'
          ? 'team fee paid'
          : 'team fee unpaid — pay it from the weekend hub'
      )
    }

    if (!group.hasFees || state.pay === 'none') continue

    const paidOn = dayBetween(
      rng,
      addDays(member.joined, 7),
      formsDeadline,
      now
    )
    const base = {
      type: 'fee',
      target_type: 'weekend_group_member',
      target_id: member.id,
      weekend_id: member.weekend.id,
    }

    if (clergy.has(personId)) {
      tables.payments.push(
        payment(
          base,
          `team:${member.id}`,
          'waived',
          TEAM_FEE,
          'DTTD Community',
          paidOn,
          'Spiritual director — covered by the community'
        )
      )
    } else if (state.pay === 'partial') {
      tables.payments.push(
        payment(
          base,
          `team:${member.id}`,
          'cash',
          100,
          `${person.first} ${person.last}`,
          paidOn,
          'Paid half at team meeting'
        )
      )
    } else {
      const method = rng.pick(['stripe', 'stripe', 'cash', 'check'] as const)
      tables.payments.push(
        payment(
          base,
          `team:${member.id}`,
          method,
          TEAM_FEE,
          `${person.first} ${person.last}`,
          paidOn,
          method === 'check' ? `Check #${rng.int(1000, 9999)}` : null
        )
      )
    }
  }
}

function payment(
  base: Row,
  key: string,
  method: 'stripe' | 'cash' | 'check' | 'waived',
  amount: number,
  owner: string,
  on: Day,
  notes: string | null
): Row {
  const stripe = method === 'stripe'
  const gross = stripe ? amount + ONLINE_SURCHARGE : amount
  const fee = stripe ? STRIPE_FEE : null
  return {
    id: stableId(`payment:${key}:${method}:${amount}`),
    ...base,
    payment_intent_id: stripe
      ? `pi_seed_${stableId(key).replaceAll('-', '').slice(0, 20)}`
      : null,
    gross_amount: gross,
    net_amount: stripe ? Math.round((gross - STRIPE_FEE) * 100) / 100 : null,
    stripe_fee: fee,
    payment_method: method,
    payment_owner: owner,
    notes,
    created_at: stamp(on, '10:00'),
  }
}

// -----------------------------------------------------------------------------
// Candidates
// -----------------------------------------------------------------------------

type CandidateStatus =
  | 'sponsored'
  | 'awaiting_forms'
  | 'pending_approval'
  | 'awaiting_payment'
  | 'confirmed'
  | 'rejected'

function candidateMix(
  group: Group,
  type: WeekendType,
  phase: Phase
): [CandidateStatus, number][] {
  if (group.number < ACTIVE_GROUP)
    return [
      ['confirmed', 22],
      ['rejected', 1],
    ]
  if (phase === 'pre-weekend') {
    return type === 'MENS'
      ? [
          ['confirmed', 14],
          ['awaiting_payment', 5],
          ['pending_approval', 4],
          ['awaiting_forms', 4],
          ['sponsored', 5],
          ['rejected', 1],
        ]
      : [
          ['confirmed', 12],
          ['awaiting_payment', 4],
          ['pending_approval', 5],
          ['awaiting_forms', 3],
          ['sponsored', 6],
          ['rejected', 1],
        ]
  }
  return type === 'MENS'
    ? [
        ['confirmed', 34],
        ['rejected', 2],
      ]
    : [
        ['confirmed', 32],
        ['rejected', 2],
      ]
}

const FORMS_DONE: CandidateStatus[] = [
  'pending_approval',
  'awaiting_payment',
  'confirmed',
  'rejected',
]

/** Adds the group's candidates; returns the confirmed ones who have since become members. */
function addCandidates(
  tables: Tables,
  group: Group,
  people: Person[],
  names: NameBook,
  phase: Phase,
  now: Day
): Person[] {
  const rng = createRng(`candidates:${group.number}`)
  const graduates: Person[] = []

  for (const weekend of Object.values(group.weekends)) {
    const gender: Gender = weekend.type === 'MENS' ? 'Male' : 'Female'
    const sponsors = people.filter(
      (p) => p.eligibleFrom <= group.number && p.tier !== 'clergy'
    )
    let index = 0

    for (const [status, count] of candidateMix(group, weekend.type, phase)) {
      for (let k = 0; k < count; k++, index++) {
        const id = stableId(
          `candidate:${group.number}:${weekend.type}:${index}`
        )
        const name = names.take(gender)
        const profile =
          CANDIDATE_PROFILES[(index + group.number) % CANDIDATE_PROFILES.length]

        // Sean sponsors one graduate of #44 and two of #45's men.
        const seanSponsors =
          weekend.type === 'MENS' &&
          ((group.number === 44 && index === 3) ||
            (group.number === ACTIVE_GROUP &&
              (status === 'awaiting_forms' || status === 'sponsored') &&
              k === 0))
        const sponsor = seanSponsors
          ? people.find((p) => p.id === SEAN_ID)!
          : rng.pick(
              rng.chance(0.7)
                ? sponsors.filter((p) => p.gender === gender)
                : sponsors
            )

        // Earlier stages of the pipeline were sponsored more recently.
        const stage = [
          'confirmed',
          'rejected',
          'awaiting_payment',
          'pending_approval',
          'awaiting_forms',
          'sponsored',
        ].indexOf(status)
        const sponsoredOn = dayBetween(
          rng,
          addDays(weekend.start, -150 + stage * 12),
          addDays(weekend.start, -90 + stage * 12),
          now
        )
        const updatedOn = dayBetween(
          rng,
          sponsoredOn,
          addDays(sponsoredOn, 30),
          now
        )
        const payer = rng.chance(0.4) ? 'sponsor' : 'candidate'

        tables.candidates.push({
          id,
          weekend_id: weekend.id,
          status,
          created_at: stamp(sponsoredOn),
          updated_at: stamp(updatedOn),
        })

        tables.sponsorships.push({
          id: stableId(`sponsorship:${id}`),
          candidate_id: id,
          candidate_name: `${name.first} ${name.last}`,
          candidate_email: name.email,
          sponsor_name: `${sponsor.first} ${sponsor.last}`,
          sponsor_email: sponsor.email,
          sponsor_phone: sponsor.phone,
          sponsor_church: sponsor.church,
          sponsor_weekend: sponsor.attended,
          reunion_group: rng.pick([
            'Tuesday men’s breakfast',
            'Thursday night group',
            'Saturday coffee group',
            'None yet',
          ]),
          attends_secuela: rng.chance(0.7) ? 'yes' : 'no',
          contact_frequency: rng.pick(['Weekly', 'Bi-weekly', 'Monthly']),
          church_environment: rng.pick([
            'Attends most Sundays',
            'Newer to church',
            'Serves in children’s ministry',
            'Rarely attends',
          ]),
          home_environment: profile.homeEnvironment,
          social_environment: rng.pick([
            'Close circle of friends',
            'Fairly isolated',
            'Very social, lots of commitments',
          ]),
          work_environment: rng.pick([
            'Demanding job, long hours',
            'Self-employed',
            'Retired',
            'Teacher',
            'Works shifts at the hospital',
          ]),
          god_evidence: profile.godEvidence,
          support_plan: rng.pick([
            'Weekly check-ins',
            'Coffee every other week',
            'Will drive them to sendoff and pick up at closing',
          ]),
          prayer_request: rng.chance(0.5) ? 'Pray for an open heart' : '',
          payment_owner: payer,
          created_at: stamp(sponsoredOn),
          updated_at: stamp(sponsoredOn),
        })

        const city = rng.pick(CITIES)
        const age = rng.int(24, 66)
        const church = rng.pick(CHURCHES)
        if (FORMS_DONE.includes(status)) {
          const birth = addDays(now, -(age * 365 + rng.int(0, 300)))
          tables.candidateInfo.push({
            id: stableId(`candidate-info:${id}`),
            candidate_id: id,
            first_name: name.first,
            last_name: name.last,
            email: name.email,
            phone: phoneFor(3000 + tables.candidateInfo.length),
            date_of_birth: iso(birth),
            age,
            address_line_1: `${rng.int(100, 9999)} ${rng.pick(STREETS)}`,
            city: city.city,
            state: 'TX',
            zip: city.zip,
            church,
            marital_status: profile.maritalStatus,
            spouse_name: ['Married', 'Separated'].includes(
              profile.maritalStatus
            )
              ? `${rng.pick(gender === 'Male' ? FEMALE_FIRST_NAMES : MALE_FIRST_NAMES)} ${name.last}`
              : null,
            has_spouse_attended_weekend: profile.spouseAttended,
            spouse_weekend_location:
              profile.spouseAttended === true
                ? weekendLabel(
                    gender === 'Male' ? 'Female' : 'Male',
                    rng.int(30, 44)
                  )
                : null,
            is_christian: profile.isChristian,
            member_of_clergy: profile.clergy,
            has_friends_attending_weekend: profile.friendsAttending,
            reason_for_attending: profile.reason,
            emergency_contact_name: `${rng.pick(FEMALE_FIRST_NAMES)} ${name.last}`,
            emergency_contact_phone: phoneFor(
              5000 + tables.candidateInfo.length
            ),
            medical_conditions: profile.medical,
            shirt_size: rng.pick(SHIRT_SIZES),
            camp_waiver_signed_at:
              status === 'confirmed' ? stamp(updatedOn) : null,
            created_at: stamp(updatedOn),
          })
        }

        // Candidate fees
        const owner =
          payer === 'sponsor'
            ? `${sponsor.first} ${sponsor.last}`
            : `${name.first} ${name.last}`
        const base = {
          type: 'fee',
          target_type: 'candidate',
          target_id: id,
          weekend_id: weekend.id,
        }
        const paidOn = dayBetween(rng, updatedOn, addDays(updatedOn, 21), now)
        if (status === 'confirmed' && group.number > FIRST_GROUP) {
          const roll = rng.next()
          if (roll < 0.6) {
            tables.payments.push(
              payment(
                base,
                `candidate:${id}`,
                'stripe',
                CANDIDATE_FEE,
                owner,
                paidOn,
                null
              )
            )
          } else if (roll < 0.85) {
            tables.payments.push(
              payment(
                base,
                `candidate:${id}`,
                'cash',
                CANDIDATE_FEE,
                owner,
                paidOn,
                'Cash at team meeting'
              )
            )
          } else {
            tables.payments.push(
              payment(
                base,
                `candidate:${id}:1`,
                'cash',
                100,
                owner,
                paidOn,
                'First installment'
              ),
              payment(
                base,
                `candidate:${id}:2`,
                'check',
                100,
                owner,
                dayBetween(rng, paidOn, addDays(paidOn, 20), now),
                `Second installment — check #${rng.int(1000, 9999)}`
              )
            )
          }
        } else if (status === 'awaiting_payment' && k === 0) {
          tables.payments.push(
            payment(
              base,
              `candidate:${id}`,
              'cash',
              100,
              owner,
              paidOn,
              'Partial — rest due at sendoff'
            )
          )
        }

        // Confirmed candidates of a finished group are community members now.
        if (status === 'confirmed' && group.status === 'FINISHED') {
          graduates.push({
            id: stableId(`graduate:${id}`),
            first: name.first,
            last: name.last,
            email: name.email,
            gender,
            church,
            phone: phoneFor(7000 + graduates.length + group.number * 100),
            attended: weekendLabel(gender, group.number),
            tier: 'graduate',
            eligibleFrom: group.number + 1,
            createdAt: minDay(
              addDays(weekend.end, rng.int(3, 30)),
              addDays(now, -1)
            ),
          })
        }
      }
    }
  }

  return graduates
}
