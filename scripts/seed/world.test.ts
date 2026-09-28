import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { addDays, parseDay } from './lib.ts'
import { buildWorld, PHASES, SEAN_ID } from './world.ts'

// Every day of a full week, so each weekday-to-Thursday snap is covered.
const DATES = Array.from({ length: 7 }, (_, i) =>
  addDays(parseDay('2026-09-27'), i)
)

const activeGroup = (summary: ReturnType<typeof buildWorld>['summary']) =>
  summary.groups.find((g) => g.number === 45)!

const count = (events: { title: string; day: Date }[], now: Date) => {
  const meetings = events.filter((e) => /Meeting/.test(e.title))
  return {
    past: meetings.filter((e) => e.day < now).length,
    upcoming: meetings.filter((e) => e.day >= now).length,
  }
}

describe('seed timeline', () => {
  it.each(DATES)(
    'pre-weekend on %s: 2 meetings done, 2 ahead, ~2 months out',
    (now) => {
      const { summary } = buildWorld('pre-weekend', now)
      const days =
        (activeGroup(summary).mens.getTime() - now.getTime()) / 86_400_000

      expect(days).toBeGreaterThanOrEqual(60)
      expect(days).toBeLessThan(67)
      expect(count(summary.activeEvents, now)).toEqual({ past: 2, upcoming: 2 })
    }
  )

  it.each(DATES)('weekend on %s: men’s started, women’s still ahead', (now) => {
    const { summary } = buildWorld('weekend', now)
    const group = activeGroup(summary)

    expect(group.mens.getTime()).toBeLessThanOrEqual(now.getTime())
    expect(group.womens.getTime()).toBeGreaterThan(now.getTime())
  })

  it.each(DATES)(
    'post-weekend on %s: both ended, #45 still active, #46 planning',
    (now) => {
      const { summary } = buildWorld('post-weekend', now)

      expect(addDays(activeGroup(summary).womens, 3).getTime()).toBeLessThan(
        now.getTime()
      )
      expect(summary.groups.map((g) => [g.number, g.status])).toEqual([
        [43, 'FINISHED'],
        [44, 'FINISHED'],
        [45, 'ACTIVE'],
        [46, 'PLANNING'],
      ])
    }
  )

  it.each(PHASES)('%s: nothing is recorded in the future', (phase) => {
    const now = DATES[0]
    const { tables } = buildWorld(phase, now)
    const future = (rows: Record<string, unknown>[], column = 'created_at') =>
      rows.filter((row) => {
        const sql = (row[column] as { raw: string }).raw
        return sql.slice(2, 12) > now.toISOString().slice(0, 10)
      })

    expect(future(tables.payments)).toEqual([])
    expect(future(tables.formCompletions, 'completed_at')).toEqual([])
    expect(future(tables.candidates)).toEqual([])
  })

  it('pre-weekend leaves Sean with an unpaid fee and forms to do', () => {
    const { tables } = buildWorld('pre-weekend', DATES[0])
    const membership = tables.groupMembers.find(
      (m) => m.user_id === SEAN_ID && m.group_id === tables.weekendGroups[2].id
    )!

    expect(
      tables.payments.filter((p) => p.target_id === membership.id)
    ).toEqual([])
    expect(
      tables.formCompletions.filter(
        (f) => f.weekend_group_member_id === membership.id
      )
    ).toHaveLength(2)
  })

  it('is deterministic apart from dates', () => {
    const a = buildWorld('pre-weekend', DATES[0]).tables
    const b = buildWorld('pre-weekend', DATES[3]).tables

    expect(a.roster.map((r) => [r.id, r.cha_role])).toEqual(
      b.roster.map((r) => [r.id, r.cha_role])
    )
  })
})

describe('E2E fixtures (pre-weekend)', () => {
  const { tables } = buildWorld('pre-weekend', DATES[0])
  const readme = readFileSync(join(__dirname, 'README.md'), 'utf8')
  const activeGroup = tables.weekendGroups.find((g) => g.number === 45)!
  const activeWeekends = new Set(
    tables.weekends
      .filter((w) => w.group_id === activeGroup.id)
      .map((w) => w.id)
  )
  const person = (email: string) =>
    tables.people.find((p) => p.email === email)!
  const membership = (email: string) =>
    tables.groupMembers.find(
      (m) => m.user_id === person(email).id && m.group_id === activeGroup.id
    )!
  const formsOf = (email: string) =>
    tables.formCompletions.filter(
      (f) => f.weekend_group_member_id === membership(email).id
    ).length
  const paymentsOf = (id: unknown) =>
    tables.payments.filter((p) => p.target_id === id)
  const candidate = (email: string) =>
    tables.candidates.find(
      (c) =>
        c.id ===
        tables.sponsorships.find((s) => s.candidate_email === email)!
          .candidate_id
    )!

  const FIXTURES = {
    blankSlate: 'david.cox@example.com',
    teamFee: 'david.harris@example.com',
    teamForms: 'helen.kelly@example.com',
    candidateUnpaid: 'luke.thompson@example.com',
    candidatePartial: 'timothy.martinez@example.com',
    neverRostered: 'steven.kim@example.com',
    billingManager: 'nick44fierro@gmail.com',
  }

  it('the README names these people', () => {
    for (const email of Object.values(FIXTURES)) expect(readme).toContain(email)
  })

  it('has exactly one active group, with every fee set', () => {
    const active = tables.weekends.filter((w) => w.status === 'ACTIVE')
    expect(new Set(active.map((w) => w.group_id))).toEqual(
      new Set([activeGroup.id])
    )
    expect(activeGroup.team_fee).not.toBeNull()
    expect(activeGroup.candidate_fee).not.toBeNull()
    expect(activeGroup.online_surcharge).not.toBeNull()
  })

  it.each([
    ['blankSlate', 0],
    ['teamFee', 5],
    ['teamForms', 0],
  ] as const)(
    '%s is unpaid with %i forms in a non-exempt role',
    (key, forms) => {
      const email = FIXTURES[key]
      const rows = tables.roster.filter(
        (r) =>
          r.user_id === person(email).id &&
          activeWeekends.has(r.weekend_id as string)
      )
      expect(rows.length).toBeGreaterThan(0)
      for (const r of rows) {
        expect(r.status).not.toBe('drop')
        expect(r.cha_role).not.toMatch(/Spiritual Director/)
      }
      expect(formsOf(email)).toBe(forms)
      expect(paymentsOf(membership(email).id)).toEqual([])
    }
  )

  it('has awaiting-payment candidates with no payment and a partial one', () => {
    const unpaid = candidate(FIXTURES.candidateUnpaid)
    const partial = candidate(FIXTURES.candidatePartial)
    expect([unpaid.status, partial.status]).toEqual([
      'awaiting_payment',
      'awaiting_payment',
    ])
    expect(paymentsOf(unpaid.id)).toEqual([])
    expect(paymentsOf(partial.id).map((p) => p.gross_amount)).toEqual([100])
  })

  it('has a billing manager holding the same Full Access role as Sean', () => {
    const roleOf = (id: unknown) =>
      tables.userRoles.filter((r) => r.user_id === id).map((r) => r.role_id)
    const fullAccess = roleOf(SEAN_ID)
    expect(fullAccess).toHaveLength(1)
    expect(roleOf(person(FIXTURES.billingManager).id)).toEqual(fullAccess)
  })

  it('has a member on no roster and with no roles', () => {
    const id = person(FIXTURES.neverRostered).id
    expect(tables.roster.filter((r) => r.user_id === id)).toEqual([])
    expect(tables.userRoles.filter((r) => r.user_id === id)).toEqual([])
  })
})
