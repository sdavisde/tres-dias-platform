import {
  chromium,
  expect,
  type Browser,
  type FullConfig,
} from '@playwright/test'
import {
  storageStatePath,
  writePersonas,
  type PersonaUser,
  type Personas,
  type SignedInPersona,
  type TeamPersona,
} from './fixtures/personas'
import {
  activeGroup,
  pickAwaitingCandidate,
  pickNonRosterUser,
  pickSeededUser,
  pickTeamFormsMember,
  pickUnpaidTeamMember,
  seedPassword,
  type CandidatePick,
  type TeamMemberPick,
  type UserPick,
} from './fixtures/seed'

/**
 * Runs once before the whole suite (Playwright global setup). Chooses the
 * run's cast by predicate (Seed Invariants S1–S6), writes it to
 * e2e/.auth/personas.json, and signs in the personas that specs reuse through
 * `test.use({ storageState })`.
 *
 * Auth budget: 2 sign-ins (teamForms, teamFee) against GoTrue's local limit of
 * 30 sign-in/sign-up requests per IP per 5 minutes.
 */

function toUser({ user, email }: UserPick): PersonaUser {
  return {
    userId: user.id,
    email,
    firstName: user.first_name,
    lastName: user.last_name,
  }
}

function toTeam(pick: TeamMemberPick): TeamPersona {
  return {
    ...toUser(pick),
    groupMemberId: pick.member.id,
    rosterId: pick.roster.id,
    rosterWeekendId: pick.roster.weekend_id,
    chaRole: pick.roster.cha_role,
    fee: pick.fee,
    surcharge: pick.surcharge,
    covered: pick.covered,
  }
}

function toCandidate(pick: CandidatePick): Personas['candidates']['full'] {
  return {
    candidateId: pick.candidate.id,
    weekendId: pick.candidate.weekend_id,
    name: pick.name,
    email: pick.email,
    fee: pick.fee,
    surcharge: pick.surcharge,
    covered: pick.covered,
  }
}

/** Signs in through the real form in a fresh context and saves its session. */
async function signIn(
  browser: Browser,
  baseURL: string | undefined,
  name: SignedInPersona,
  email: string
): Promise<void> {
  // A context per persona, so one persona's cookies never reach the other's
  // saved state.
  const context = await browser.newContext({ baseURL })
  try {
    const page = await context.newPage()
    await page.goto('/login')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(seedPassword())
    // The page also has a mode-toggle button labelled "Sign In", so target
    // the form's submit button rather than matching on the label.
    await page.locator('button[type="submit"]').click()

    // Sign-in redirects away from /login once the session cookie is set.
    // Without waiting, saving state races the redirect.
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
      timeout: 15_000,
    })
    await expect(page).toHaveURL(/\/home/)
    // Let /home finish streaming before the context closes; otherwise Next
    // logs "The destination stream closed early" for the aborted response.
    await page.waitForLoadState('networkidle')

    await context.storageState({ path: storageStatePath(name) })
  } finally {
    await context.close()
  }
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL
  if (baseURL === undefined) {
    throw new Error(
      'global-setup: no baseURL found on config.projects[0].use.baseURL. ' +
        'Set `use.baseURL` in playwright.config.ts.'
    )
  }

  const { group, weekends, fees } = await activeGroup()
  const teamForms = await pickTeamFormsMember()
  const teamFee = await pickUnpaidTeamMember({
    excludingUserIds: [teamForms.member.user_id],
  })
  const nonRosterUser = await pickNonRosterUser()
  const seededUser = await pickSeededUser({
    avoidUserIds: [
      teamForms.member.user_id,
      teamFee.member.user_id,
      nonRosterUser.user.id,
    ],
  })
  const [full, partial] = await Promise.all([
    pickAwaitingCandidate({ partial: false }),
    pickAwaitingCandidate({ partial: true }),
  ])

  const personas: Personas = {
    teamForms: toTeam(teamForms),
    teamFee: toTeam(teamFee),
    seededUser: toUser(seededUser),
    nonRosterUser: toUser(nonRosterUser),
    candidates: { full: toCandidate(full), partial: toCandidate(partial) },
    group: {
      id: group.id,
      number: group.number,
      teamFee: fees.teamFee,
      candidateFee: fees.candidateFee,
      onlineSurcharge: fees.onlineSurcharge,
      weekendIds: weekends.map((w) => w.id),
    },
  }

  // Scenarios never share a person.
  const userIds = [
    personas.teamForms.userId,
    personas.teamFee.userId,
    personas.seededUser.userId,
    personas.nonRosterUser.userId,
  ]
  expect(new Set(userIds).size, `persona user ids: ${userIds.join(', ')}`).toBe(
    userIds.length
  )

  writePersonas(personas)

  const browser = await chromium.launch()
  try {
    await signIn(browser, baseURL, 'teamForms', personas.teamForms.email)
    await signIn(browser, baseURL, 'teamFee', personas.teamFee.email)
  } finally {
    await browser.close()
  }
}
