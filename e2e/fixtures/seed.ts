import { isNil } from 'lodash'
import type { User } from '@supabase/supabase-js'
import type { Tables } from '@/database.types'
import {
  groupFeesFromColumns,
  isFeeExemptRole,
  type GroupFees,
} from '@/lib/payments/group-fees'
import { Permission } from '@/lib/security'
import { WeekendStatus } from '@/lib/weekend/types'
import { getEffectivePermissions } from '@/services/identity/roles/inheritance'
import { listAllAuthUsers } from './auth-users'
import { adminClient } from './supabase'

/**
 * Seed selectors: the only code in the suite that knows what the seed looks
 * like. Each one finds a row by predicate (never by id or email) and throws
 * `Seed invariant S<n> not met: …` naming what it looked for, so a seed
 * change that drops an invariant fails `setup` in one line. The invariants
 * are listed in docs/specs/20-spec-e2e-testing (Seed Invariants).
 *
 * The seed (`scripts/seed/`, README "E2E fixtures") pins one person per
 * invariant in the `pre-weekend` phase — at the time of writing David Cox
 * (no forms, no payments), David Harris (forms done, fee unpaid), Helen Kelly
 * (no forms, fee unpaid), Luke Thompson / Timothy Martinez (candidates, none
 * and partly paid), Steven Kim (on no roster) and Nick Fierro (Full Access,
 * the billing manager). The selectors do not rely
 * on those names; where several rows qualify they pick deterministically so a
 * run's cast is stable.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ActiveGroup = {
  group: Tables<'weekend_groups'>
  /** The group's ACTIVE weekends. */
  weekends: Tables<'weekends'>[]
  fees: GroupFees
}

export type TeamMemberPick = {
  member: Tables<'weekend_group_members'>
  user: Tables<'users'>
  /** Sign-in email (the confirmed auth user's). */
  email: string
  /** An active (not dropped), non-exempt roster row on an ACTIVE weekend. */
  roster: Tables<'weekend_roster'> & { weekend_id: string; cha_role: string }
  completions: number
  /** Team fee (cash price), dollars. */
  fee: number
  /** Online surcharge, dollars. */
  surcharge: number
  /** Live payments on record for the member, dollars. */
  covered: number
}

export type CandidatePick = {
  candidate: Tables<'candidates'> & { weekend_id: string }
  name: string | null
  email: string | null
  /** Candidate fee (cash price), dollars. */
  fee: number
  /** Online surcharge, dollars. */
  surcharge: number
  /** Live payments on record for the candidate, dollars. */
  covered: number
}

export type UserPick = {
  user: Tables<'users'>
  /** Sign-in email (the confirmed auth user's). */
  email: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function invariant(n: number, lookedFor: string): Error {
  return new Error(`Seed invariant S${n} not met: ${lookedFor}`)
}

function unwrap<T>(
  response: { data: T | null; error: { message: string } | null },
  what: string
): T {
  if (!isNil(response.error)) {
    throw new Error(`Seed query failed (${what}): ${response.error.message}`)
  }
  if (isNil(response.data)) {
    throw new Error(`Seed query failed (${what}): no data`)
  }
  return response.data
}

const byEmail = (a: { email: string }, b: { email: string }) =>
  a.email.localeCompare(b.email)

/** Auth users whose email is confirmed, keyed by id. */
async function confirmedAuthUsers(): Promise<Map<string, User>> {
  const users = await listAllAuthUsers()
  return new Map(
    users
      .filter((u) => !isNil(u.email_confirmed_at) && !isNil(u.email))
      .map((u) => [u.id, u])
  )
}

const TARGET_CHUNK = 100

/** What the candidate fee page accepts as `payment_owner`. */
const VALID_PAYMENT_OWNERS = new Set(['candidate', 'sponsor'])

/**
 * Live (non-voided) money on record per target id, in dollars. Mirrors
 * `sumLivePaymentsForTargets` in services/payment/repository.ts, which can't
 * be imported here (it sits behind `server-only`). Chunked to keep the
 * PostgREST URL short.
 */
async function livePaymentsByTarget(
  targetIds: string[]
): Promise<Map<string, number>> {
  const totals = new Map<string, number>()
  for (let i = 0; i < targetIds.length; i += TARGET_CHUNK) {
    const chunk = targetIds.slice(i, i + TARGET_CHUNK)
    const rows = unwrap(
      await adminClient()
        .from('payment_transaction')
        .select('target_id, gross_amount')
        .in('target_id', chunk)
        .is('voided_at', null),
      'live payments'
    )
    for (const row of rows) {
      if (isNil(row.target_id)) continue
      totals.set(
        row.target_id,
        (totals.get(row.target_id) ?? 0) + Number(row.gross_amount)
      )
    }
  }
  return totals
}

// ---------------------------------------------------------------------------
// S1
// ---------------------------------------------------------------------------

/** S1: the one weekend group with an ACTIVE weekend, all three fees set. */
export async function activeGroup(): Promise<ActiveGroup> {
  const lookedFor =
    'exactly one weekend group with an ACTIVE weekend and team_fee, candidate_fee, online_surcharge set'
  const weekends = unwrap(
    await adminClient()
      .from('weekends')
      .select('*, weekend_groups(*)')
      .eq('status', WeekendStatus.ACTIVE),
    'active weekends'
  )

  const groups = new Map<string, Tables<'weekend_groups'>>()
  for (const w of weekends) {
    if (!isNil(w.weekend_groups))
      groups.set(w.weekend_groups.id, w.weekend_groups)
  }
  if (groups.size !== 1) {
    throw invariant(1, `${lookedFor} (found ${groups.size} groups)`)
  }
  const [group] = [...groups.values()]
  const fees = groupFeesFromColumns(group)
  if (isNil(fees)) {
    throw invariant(1, `${lookedFor} (group #${group.number} has a null fee)`)
  }

  return {
    group,
    weekends: weekends
      .filter((w) => w.group_id === group.id)
      .map(({ weekend_groups: _group, ...weekend }) => weekend),
    fees,
  }
}

// ---------------------------------------------------------------------------
// S2, S3: team members who owe the team fee and have paid nothing
// ---------------------------------------------------------------------------

/**
 * Members of the active group who owe the team fee and have no live payment,
 * in a stable order (by email). "Owes" and "covered" follow
 * `getCheckoutQuote` in services/payment/payment-service.ts: roster rows are
 * the member's rows on the group's weekends, dropped rows don't count, the
 * member owes unless every active row is fee-exempt (`isFeeExemptRole`), and
 * payments count whether they target the group member or (legacy) one of the
 * member's roster rows.
 */
async function unpaidTeamMembers(): Promise<TeamMemberPick[]> {
  const { group, fees } = await activeGroup()
  const admin = adminClient()

  const groupWeekends = unwrap(
    await admin.from('weekends').select('id, status').eq('group_id', group.id),
    'group weekends'
  )
  const activeWeekendIds = new Set(
    groupWeekends
      .filter((w) => w.status === WeekendStatus.ACTIVE)
      .map((w) => w.id)
  )

  const [members, roster, auth] = await Promise.all([
    admin
      .from('weekend_group_members')
      .select('*, users(*), team_form_completions(id)')
      .eq('group_id', group.id),
    admin
      .from('weekend_roster')
      .select('*')
      .in(
        'weekend_id',
        groupWeekends.map((w) => w.id)
      ),
    confirmedAuthUsers(),
  ])
  const memberRows = unwrap(members, 'group members')
  const rosterRows = unwrap(roster, 'group roster')

  const rosterByUser = new Map<string, Tables<'weekend_roster'>[]>()
  for (const row of rosterRows) {
    if (isNil(row.user_id)) continue
    rosterByUser.set(row.user_id, [
      ...(rosterByUser.get(row.user_id) ?? []),
      row,
    ])
  }

  const covered = await livePaymentsByTarget([
    ...memberRows.map((m) => m.id),
    ...rosterRows.map((r) => r.id),
  ])

  const picks: TeamMemberPick[] = []
  for (const row of memberRows) {
    const { users: user, team_form_completions: completions, ...member } = row
    const authUser = auth.get(member.user_id)
    if (isNil(user) || isNil(authUser?.email)) continue

    const rows = rosterByUser.get(member.user_id) ?? []
    const active = rows.filter((r) => r.status !== 'drop')
    const owes =
      active.length > 0 && !active.every((r) => isFeeExemptRole(r.cha_role))
    if (!owes) continue

    const paid = [member.id, ...rows.map((r) => r.id)].reduce(
      (sum, id) => sum + (covered.get(id) ?? 0),
      0
    )
    if (paid > 0) continue

    const seat = active.find(
      (r) =>
        !isFeeExemptRole(r.cha_role) &&
        !isNil(r.weekend_id) &&
        activeWeekendIds.has(r.weekend_id)
    )
    if (isNil(seat) || isNil(seat.weekend_id) || isNil(seat.cha_role)) continue

    picks.push({
      member,
      user,
      email: authUser.email,
      roster: { ...seat, weekend_id: seat.weekend_id, cha_role: seat.cha_role },
      completions: completions.length,
      fee: fees.teamFee,
      surcharge: fees.onlineSurcharge,
      covered: paid,
    })
  }
  return picks.sort(byEmail)
}

/**
 * S2: a roster member of the active group in a non-exempt role with zero
 * team form completions and zero live payments.
 */
export async function pickTeamFormsMember(): Promise<TeamMemberPick> {
  const pick = (await unpaidTeamMembers()).find((m) => m.completions === 0)
  if (isNil(pick)) {
    throw invariant(
      2,
      'a non-exempt, non-dropped roster member of the active group with no team_form_completions and no live payment_transaction rows'
    )
  }
  return pick
}

/**
 * S3: a roster member of the active group in a non-exempt role with zero
 * live payments, other than the given users. Prefers members who have
 * finished their forms (the seed's team-fee scenario), so the fee page is
 * reached the way a real member reaches it.
 */
export async function pickUnpaidTeamMember({
  excludingUserIds,
}: {
  excludingUserIds: string[]
}): Promise<TeamMemberPick> {
  const excluded = new Set(excludingUserIds)
  const [pick] = (await unpaidTeamMembers())
    .filter((m) => !excluded.has(m.member.user_id))
    // Stable sort: most completions first, email order within.
    .sort((a, b) => b.completions - a.completions)
  if (isNil(pick)) {
    throw invariant(
      3,
      `a non-exempt, non-dropped roster member of the active group with no live payment_transaction rows, other than ${excludingUserIds.length} already-picked user(s)`
    )
  }
  return pick
}

// ---------------------------------------------------------------------------
// S4
// ---------------------------------------------------------------------------

/**
 * S4: a candidate on an ACTIVE weekend with status `awaiting_payment` and
 * either no live payments (`partial: false`) or live payments above zero and
 * below the candidate fee (`partial: true`). Payments target the candidate id,
 * as in `getCheckoutQuote`.
 */
export async function pickAwaitingCandidate({
  partial,
}: {
  partial: boolean
}): Promise<CandidatePick> {
  const { weekends, fees } = await activeGroup()
  const rows = unwrap(
    await adminClient()
      .from('candidates')
      .select(
        '*, candidate_sponsorship_info(candidate_name, candidate_email, payment_owner)'
      )
      .eq('status', 'awaiting_payment')
      .in(
        'weekend_id',
        weekends.map((w) => w.id)
      )
      .order('id'),
    'awaiting candidates'
  )
  const covered = await livePaymentsByTarget(rows.map((c) => c.id))

  for (const row of rows) {
    const { candidate_sponsorship_info: sponsorship, ...candidate } = row
    if (isNil(candidate.weekend_id)) continue
    const paid = covered.get(candidate.id) ?? 0
    const matches = partial ? paid > 0 && paid < fees.candidateFee : paid === 0
    if (!matches) continue
    const [info] = sponsorship
    // The public fee page accepts only these two payers; older seeds stored the
    // sponsor's email here, which the page rejects with INVALID_PAYMENT_OWNER.
    if (!VALID_PAYMENT_OWNERS.has(info?.payment_owner ?? '')) continue
    return {
      candidate: { ...candidate, weekend_id: candidate.weekend_id },
      name: info?.candidate_name ?? null,
      email: info?.candidate_email ?? null,
      fee: fees.candidateFee,
      surcharge: fees.onlineSurcharge,
      covered: paid,
    }
  }
  throw invariant(
    4,
    partial
      ? `an awaiting_payment candidate on an ACTIVE weekend whose sponsorship payment_owner is 'candidate' or 'sponsor', with live payments above $0 and below the $${fees.candidateFee} fee`
      : "an awaiting_payment candidate on an ACTIVE weekend whose sponsorship payment_owner is 'candidate' or 'sponsor', with no live payment_transaction rows"
  )
}

// ---------------------------------------------------------------------------
// S5, S6
// ---------------------------------------------------------------------------

/** Confirmed auth users that have a public.users row, in email order. */
async function seededUsers(): Promise<UserPick[]> {
  const [auth, users] = await Promise.all([
    confirmedAuthUsers(),
    adminClient().from('users').select('*'),
  ])
  const picks: UserPick[] = []
  for (const user of unwrap(users, 'users')) {
    const email = auth.get(user.id)?.email
    if (!isNil(email)) picks.push({ user, email })
  }
  return picks.sort(byEmail)
}

/**
 * S5: a confirmed auth user with a public.users row and a first name (the
 * login spec asserts it). Prefers someone not in `avoidUserIds` so the login
 * specs don't share a person with other scenarios.
 */
export async function pickSeededUser({
  avoidUserIds = [],
}: { avoidUserIds?: string[] } = {}): Promise<UserPick> {
  const avoid = new Set(avoidUserIds)
  const candidates = (await seededUsers()).filter(
    (p) => !isNil(p.user.first_name) && p.user.first_name !== ''
  )
  const pick = candidates.find((p) => !avoid.has(p.user.id)) ?? candidates.at(0)
  if (isNil(pick)) {
    throw invariant(
      5,
      'a confirmed auth user with a matching public.users row and a first name'
    )
  }
  return pick
}

/**
 * S6: a confirmed seeded user with no weekend_roster row (any status) on any
 * ACTIVE weekend. Prefers someone with no user_roles, so no permission can
 * open a page the negative case expects to be refused.
 */
export async function pickNonRosterUser(): Promise<UserPick> {
  const admin = adminClient()
  const [roster, roles, users] = await Promise.all([
    admin
      .from('weekend_roster')
      .select('user_id, weekends!inner(status)')
      .eq('weekends.status', WeekendStatus.ACTIVE),
    admin.from('user_roles').select('user_id'),
    seededUsers(),
  ])
  const rostered = new Set(
    unwrap(roster, 'active roster').map((r) => r.user_id)
  )
  const withRoles = new Set(unwrap(roles, 'user roles').map((r) => r.user_id))

  const offRoster = users.filter((p) => !rostered.has(p.user.id))
  const pick =
    offRoster.find((p) => !withRoles.has(p.user.id)) ?? offRoster.at(0)
  if (isNil(pick)) {
    throw invariant(
      6,
      'a confirmed seeded user with no weekend_roster row on any ACTIVE weekend'
    )
  }
  return pick
}

// ---------------------------------------------------------------------------
// S7
// ---------------------------------------------------------------------------

/**
 * S7: a confirmed seeded user who can open Admin → Billing and the admin
 * dashboard: their roles (through `user_roles`, following
 * `roles.based_on_role_id` the way the app does) grant FULL_ACCESS, or both
 * MANAGE_BILLING and READ_ADMIN_PORTAL. Full Access holders come first, then
 * email order; someone not in `avoidUserIds` is preferred so the billing spec
 * doesn't share a person with other scenarios.
 */
export async function pickBillingManager({
  avoidUserIds = [],
}: { avoidUserIds?: string[] } = {}): Promise<UserPick> {
  const admin = adminClient()
  const [roles, userRoles, users] = await Promise.all([
    admin.from('roles').select('id, permissions, based_on_role_id'),
    admin.from('user_roles').select('user_id, role_id'),
    seededUsers(),
  ])
  const roleRows = unwrap(roles, 'roles')

  const permissionsByUser = new Map<string, Set<Permission>>()
  for (const { user_id, role_id } of unwrap(userRoles, 'user roles')) {
    const granted = permissionsByUser.get(user_id) ?? new Set<Permission>()
    for (const permission of getEffectivePermissions(role_id, roleRows)) {
      granted.add(permission)
    }
    permissionsByUser.set(user_id, granted)
  }

  const fullAccess = (p: UserPick) =>
    permissionsByUser.get(p.user.id)?.has(Permission.FULL_ACCESS) === true
  const billingOnly = (p: UserPick) => {
    const granted = permissionsByUser.get(p.user.id)
    return (
      granted?.has(Permission.MANAGE_BILLING) === true &&
      granted.has(Permission.READ_ADMIN_PORTAL)
    )
  }
  const eligible = [
    ...users.filter(fullAccess),
    ...users.filter((p) => !fullAccess(p) && billingOnly(p)),
  ]

  const avoid = new Set(avoidUserIds)
  const pick = eligible.find((p) => !avoid.has(p.user.id)) ?? eligible.at(0)
  if (isNil(pick)) {
    throw invariant(
      7,
      'a confirmed seeded user whose roles grant FULL_ACCESS, or MANAGE_BILLING together with READ_ADMIN_PORTAL'
    )
  }
  return pick
}

/** S5: the password every seeded auth user shares. */
export function seedPassword(): string {
  return process.env.E2E_SEED_PASSWORD ?? 'password'
}
