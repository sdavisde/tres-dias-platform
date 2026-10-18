import { expect, test, type Page } from '@playwright/test'
import { hubPath } from '@/lib/weekend/hub'
import { WeekendType } from '@/lib/weekend/types'
import {
  E2E_SUBJECT_PREFIX,
  deleteDraftsBy,
  deleteE2EBroadcasts,
  deleteUnsubscribes,
  findE2EBroadcast,
  insertSentE2EBroadcast,
  teamEmailsForWeekend,
  unsubscribe,
} from './fixtures/community-email'
import {
  loadPersonas,
  storageStatePath,
  type Personas,
} from './fixtures/personas'

/**
 * Who can reach community email outside Admin → Email
 * (docs/specs/23-spec-community-email, weekend entry points):
 *
 * 1. The President and Corresponding Secretary can read Admin → Email's sent
 *    emails (no sending).
 * 2. The men's Rector and Head get an "Email" menu on their weekend's Team
 *    tab, offering their own team only, and nothing on the women's weekend.
 * 3. The Head writes and sends from /email/{id}. Off production only the
 *    sender and the sandbox allowlist are emailed; the test unsubscribes
 *    those first so nothing reaches Resend, and every other team member is
 *    recorded as skipped. The Resend request
 *    itself is covered by services/community-email/send-broadcast.test.ts.
 */

test.describe.configure({ mode: 'serial', timeout: 60_000 })

let personas: Personas
let mensTeam: string[]
const readSubject = `${E2E_SUBJECT_PREFIX} read ${Date.now()}`
const sendSubject = `${E2E_SUBJECT_PREFIX} team ${Date.now()}`

const leaderIds = () => [
  personas.leaders.rector.userId,
  personas.leaders.head.userId,
]

test.beforeAll(async () => {
  personas = await loadPersonas()
  mensTeam = await teamEmailsForWeekend(personas.leaders.weekendId)
  expect(mensTeam.length).toBeGreaterThan(1)

  await deleteE2EBroadcasts()
  await deleteDraftsBy(leaderIds())
  await insertSentE2EBroadcast(readSubject, personas.billingManager.userId)
})

/**
 * Team members a send off production would really email: the sender and the
 * sandbox allowlist (COMMUNITY_EMAIL_SANDBOX_ALLOWLIST, often the developer's
 * own address). The send test unsubscribes them so no real email goes out.
 */
const reallyEmailed = () => {
  const allowlist = (process.env.COMMUNITY_EMAIL_SANDBOX_ALLOWLIST ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
  const head = personas.leaders.head.email.toLowerCase()
  return mensTeam.filter((email) => email === head || allowlist.includes(email))
}

test.afterAll(async () => {
  await deleteE2EBroadcasts()
  await deleteDraftsBy(leaderIds())
  await deleteUnsubscribes(reallyEmailed())
})

for (const board of ['president', 'correspondingSecretary'] as const) {
  test.describe(`as the ${board}`, () => {
    test.use({ storageState: storageStatePath(board) })

    test('reads sent emails in Admin → Email but cannot write one', async ({
      page,
    }) => {
      await page.goto('/admin/email')
      // The list renders a table and (below md) cards; either shows it.
      await expect(page.getByText(readSubject).first()).toBeVisible()
      await expect(page.getByRole('button', { name: 'New email' })).toHaveCount(
        0
      )

      await page.getByText(readSubject).first().click()
      await expect(
        page.getByRole('heading', { name: 'Recipients', level: 2 })
      ).toBeVisible()
    })
  })
}

/**
 * The roster toolbar's Email menu on a weekend's Team tab (the roster rows
 * have their own "Email" contact buttons, which open no menu).
 */
const emailMenuButton = (page: Page) =>
  page
    .getByRole('button', { name: 'Email', exact: true })
    .and(page.locator('[aria-haspopup="menu"]'))

const teamTab = (type: WeekendType) => hubPath(personas.group.id, 'team', type)

for (const leader of ['rector', 'head'] as const) {
  test.describe(`as the men's ${leader}`, () => {
    test.use({ storageState: storageStatePath(leader) })

    test("emails the men's team, and only the men's team", async ({ page }) => {
      await page.goto(teamTab(WeekendType.MENS))
      await emailMenuButton(page).click()

      const menu = page.getByRole('menu')
      await expect(
        menu.getByRole('menuitem', { name: "The Men's team" })
      ).toBeVisible()
      await expect(
        menu.getByRole('menuitem', { name: /Both teams/ })
      ).toHaveCount(0)

      // Choosing it opens a draft already addressed to the team.
      await menu.getByRole('menuitem', { name: "The Men's team" }).click()
      await page.waitForURL(/\/email\/[0-9a-f-]{36}\?back=/)
      await expect(page.getByTestId('recipient-count')).toContainText(
        `${mensTeam.length} people will receive this`
      )
      await expect(page.getByLabel('Send to')).toHaveCount(0)
    })

    test("has no Email menu on the women's weekend", async ({ page }) => {
      await page.goto(teamTab(WeekendType.WOMENS))
      await expect(
        page.getByRole('heading', { name: /Team Roster/ })
      ).toBeVisible()
      await expect(emailMenuButton(page)).toHaveCount(0)
    })
  })
}

test.describe("as the men's head, sending", () => {
  test.use({ storageState: storageStatePath('head') })

  test('sends to every team member from /email/{id}', async ({ page }) => {
    const held = reallyEmailed()
    for (const email of held) await unsubscribe(email)
    const recipients = mensTeam.filter((email) => !held.includes(email))

    await page.goto(teamTab(WeekendType.MENS))
    await emailMenuButton(page).click()
    await page.getByRole('menuitem', { name: "The Men's team" }).click()
    await page.waitForURL(/\/email\/[0-9a-f-]{36}\?back=/)
    await expect(page.getByTestId('recipient-count')).toContainText(
      `${recipients.length} people will receive this`
    )

    await page.getByLabel('Subject').fill(sendSubject)
    await page.getByRole('textbox', { name: 'Message' }).click()
    await page.keyboard.type('Team meeting Saturday at 9.')
    await expect(page.getByRole('status').getByText('Saved')).toBeVisible()

    await page.getByRole('button', { name: 'Review & send' }).click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toContainText(`Send to ${recipients.length} people?`)
    await dialog.getByRole('button', { name: 'Send now' }).click()

    // Sent: the page hands back to the Team tab it came from.
    await page.waitForURL((url) => url.pathname === teamTab(WeekendType.MENS), {
      timeout: 30_000,
    })

    const sent = await findE2EBroadcast(sendSubject)
    expect(sent?.status).toBe('sent')
    expect(sent?.audience).toEqual({
      type: 'weekend_team',
      weekendId: personas.leaders.weekendId,
    })
    expect(
      (sent?.email_broadcast_recipients ?? []).map((r) => r.email).sort()
    ).toEqual([...recipients].sort())
    expect(
      new Set((sent?.email_broadcast_recipients ?? []).map((r) => r.status))
    ).toEqual(new Set(['skipped']))

    // The co-leaders see it under "Already sent".
    await emailMenuButton(page).click()
    await expect(page.getByRole('menu')).toContainText(sendSubject)
  })
})
