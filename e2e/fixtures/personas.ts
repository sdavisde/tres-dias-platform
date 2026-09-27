import fs from 'node:fs'
import path from 'node:path'

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

export type SignedInPersona = 'teamForms' | 'teamFee'

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
        'run the suite with `yarn e2e` (the chromium project depends on setup) ' +
        'or run `yarn e2e --project=setup` first.'
    )
  }
  return JSON.parse(fs.readFileSync(PERSONAS_PATH, 'utf8')) as Personas
}
