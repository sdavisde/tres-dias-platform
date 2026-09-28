import fs from 'node:fs'
import path from 'node:path'
import { adminClient } from './supabase'

/**
 * The cast of one run, chosen by the selectors in ./seed.ts during the
 * `setup` project and shared with every spec through e2e/.auth/personas.json.
 */

/** A seeded person who can sign in. */
export type PersonaUser = {
  userId: string
  email: string
  firstName: string | null
  lastName: string | null
}

/** A roster member of the active group who owes the team fee. */
export type TeamPersona = PersonaUser & {
  groupMemberId: string
  rosterId: string
  rosterWeekendId: string
  chaRole: string
  /** Team fee in dollars (cash price). */
  fee: number
  /** Online card surcharge in dollars. */
  surcharge: number
  /** Live payments already on record, in dollars. */
  covered: number
}

/** A candidate awaiting payment on an active weekend. Candidates aren't users. */
export type CandidatePersona = {
  candidateId: string
  weekendId: string
  name: string | null
  email: string | null
  /** Candidate fee in dollars (cash price). */
  fee: number
  /** Online card surcharge in dollars. */
  surcharge: number
  /** Live payments already on record, in dollars. */
  covered: number
}

export type Personas = {
  /** S2: no team forms, no payments. */
  teamForms: TeamPersona
  /** S3: fee unpaid; never the teamForms persona. */
  teamFee: TeamPersona
  /** S5: any confirmed seeded user. */
  seededUser: PersonaUser
  /** S6: on no roster of an active weekend. */
  nonRosterUser: PersonaUser
  /** S7: can open Admin → Billing and the admin dashboard. */
  billingManager: PersonaUser
  /** S4 */
  candidates: {
    full: CandidatePersona
    partial: CandidatePersona
  }
  /** S1 */
  group: {
    id: string
    number: number
    teamFee: number
    candidateFee: number
    onlineSurcharge: number
    weekendIds: string[]
  }
}

export const PERSONAS_PATH = 'e2e/.auth/personas.json'

export type SignedInPersona = 'teamForms' | 'teamFee' | 'billingManager'

/** Saved browser session for a persona signed in by the setup project. */
export function storageStatePath(name: SignedInPersona): string {
  return `e2e/.auth/${name}.json`
}

export function writePersonas(personas: Personas): void {
  fs.mkdirSync(path.dirname(PERSONAS_PATH), { recursive: true })
  fs.writeFileSync(PERSONAS_PATH, `${JSON.stringify(personas, null, 2)}\n`)
}

export function readPersonas(): Personas {
  if (!fs.existsSync(PERSONAS_PATH)) {
    throw new Error(
      `${PERSONAS_PATH} not found. It is written by the Playwright "setup" project; ` +
        'run the suite with `bun run e2e` (the chromium project depends on setup) ' +
        'or run `bun run e2e` first.'
    )
  }
  return JSON.parse(fs.readFileSync(PERSONAS_PATH, 'utf8')) as Personas
}

/**
 * Reads the cast written by the `setup` project and verifies it still matches
 * the database. If the database was reseeded after setup ran, ids in
 * personas.json can point at rows that no longer exist (or, worse, at ids
 * that now belong to something else) — specs should fail fast with a clear
 * message instead of misbehaving (e.g. treating a stale "existing user" email
 * as available and registering it as a new account).
 */
export async function loadPersonas(): Promise<Personas> {
  const personas = readPersonas()
  const db = adminClient()
  const missing: string[] = []

  const { data: groups, error: groupError } = await db
    .from('weekend_groups')
    .select('id')
    .eq('id', personas.group.id)
  if (groupError !== null) {
    throw new Error(
      `Failed to verify personas.json against the database: ${groupError.message}`
    )
  }
  if (groups.length === 0) {
    missing.push(`weekend group ${personas.group.id}`)
  }

  const userChecks = [
    {
      field: 'teamForms',
      userId: personas.teamForms.userId,
      email: personas.teamForms.email,
    },
    {
      field: 'teamFee',
      userId: personas.teamFee.userId,
      email: personas.teamFee.email,
    },
    {
      field: 'seededUser',
      userId: personas.seededUser.userId,
      email: personas.seededUser.email,
    },
    {
      field: 'nonRosterUser',
      userId: personas.nonRosterUser.userId,
      email: personas.nonRosterUser.email,
    },
    {
      field: 'billingManager',
      userId: personas.billingManager.userId,
      email: personas.billingManager.email,
    },
  ]
  const { data: users, error: usersError } = await db
    .from('users')
    .select('id, email')
    .in(
      'id',
      userChecks.map((check) => check.userId)
    )
  if (usersError !== null) {
    throw new Error(
      `Failed to verify personas.json against the database: ${usersError.message}`
    )
  }
  const emailById = new Map(users.map((user) => [user.id, user.email]))
  for (const check of userChecks) {
    const email = emailById.get(check.userId)
    if (email === undefined || email === null) {
      missing.push(`${check.field} user ${check.userId} (${check.email})`)
    } else if (email.toLowerCase() !== check.email.toLowerCase()) {
      missing.push(
        `${check.field} user ${check.userId} email changed from ${check.email} to ${email}`
      )
    }
  }

  const candidateIds = [
    personas.candidates.full.candidateId,
    personas.candidates.partial.candidateId,
  ]
  const { data: candidates, error: candidatesError } = await db
    .from('candidates')
    .select('id')
    .in('id', candidateIds)
  if (candidatesError !== null) {
    throw new Error(
      `Failed to verify personas.json against the database: ${candidatesError.message}`
    )
  }
  const candidateIdSet = new Set(candidates.map((candidate) => candidate.id))
  for (const id of candidateIds) {
    if (!candidateIdSet.has(id)) {
      missing.push(`candidate ${id}`)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `${PERSONAS_PATH} is stale: ${missing.join('; ')}. The database changed since setup ran; ` +
        'rerun `bun run e2e` (global setup runs first and picks a fresh cast).'
    )
  }

  return personas
}
