import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { SECUELA_SERVE_PROMPT_DURATION_MS } from '@/lib/secuela/attendance-window'
import { WeekendStatus } from '@/lib/weekend/types'
import {
  loadPersonas,
  storageStatePath,
  type Personas,
} from './fixtures/personas'
import {
  bypassServerCache,
  restoreSecuelaWorld,
  setGroupStatus,
  setSecuelaSignIn,
  setSecuelaTime,
  snapshotSecuelaWorld,
  type SecuelaWorldSnapshot,
} from './fixtures/secuela'

/**
 * The secuela banner on the member home page across the weekend lifecycle,
 * as the `teamFee` persona with no secuela sign-in:
 * - before the secuela it advertises the secuela;
 * - after it ends, it invites the member to say they're interested in serving
 *   (until SECUELA_SERVE_PROMPT_DURATION_MS has passed);
 * - with sign-ups over, or no active weekend, there is no banner at all.
 *
 * Each test moves the active group's secuela (or its status) in the database;
 * the original rows are restored after the file.
 */

test.describe.configure({ mode: 'serial' })
test.use({ storageState: storageStatePath('teamFee') })

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const UPCOMING = /Secuela is coming up/
const SERVE = /Are you interested in serving on/
const ANY_BANNER =
  /Secuela is coming up|Secuela is happening now|signed in to .* Secuela|Are you interested in serving on/

let personas: Personas
let snapshot: SecuelaWorldSnapshot

test.beforeAll(async () => {
  personas = await loadPersonas()
  snapshot = await snapshotSecuelaWorld(
    personas.group.id,
    personas.teamFee.groupMemberId
  )
})

test.beforeEach(async ({ context, baseURL }) => {
  await bypassServerCache(context, baseURL ?? 'http://localhost:3000')
  await setSecuelaSignIn(snapshot, null)
})

test.afterAll(async () => {
  if (snapshot !== undefined) await restoreSecuelaWorld(snapshot)
})

/** Opens /home and waits for the greeting, so streamed sections are in. */
async function openHome(page: Page): Promise<void> {
  await page.goto('/home')
  await expect(
    page.getByRole('heading', { level: 1, name: /^Hi / })
  ).toBeVisible()
}

/** A secuela of three hours starting `startOffset` ms from now. */
async function secuelaAt(startOffset: number): Promise<void> {
  const start = new Date(Date.now() + startOffset)
  await setSecuelaTime(snapshot, start, new Date(start.getTime() + 3 * HOUR))
}

test('advertises the secuela before it starts', async ({ page }) => {
  await secuelaAt(2 * DAY)
  await openHome(page)

  await expect(page.getByText(UPCOMING)).toContainText(
    `#${personas.group.number}`
  )
  await expect(page.getByText(SERVE)).toHaveCount(0)
})

test('invites members to serve once the secuela is over', async ({ page }) => {
  await secuelaAt(-2 * DAY)
  await openHome(page)

  await expect(page.getByText(SERVE)).toContainText(`#${personas.group.number}`)
  await expect(
    page.getByText(/has passed, but you can still let the leadership team know/)
  ).toBeVisible()
  await expect(page.getByText(UPCOMING)).toHaveCount(0)

  await page.getByRole('link', { name: /I'm interested/ }).click()
  await expect(page).toHaveURL(/\/secuela-signin$/)
})

test('stops inviting members who already said they want to serve', async ({
  page,
}) => {
  await secuelaAt(-2 * DAY)
  await setSecuelaSignIn(snapshot, new Date())
  await openHome(page)

  await expect(page.getByText(ANY_BANNER)).toHaveCount(0)
})

test('shows no banner once the serve invitation has expired', async ({
  page,
}) => {
  // Ends one day past the cutoff
  await secuelaAt(-(SECUELA_SERVE_PROMPT_DURATION_MS + DAY + 3 * HOUR))
  await openHome(page)

  await expect(page.getByText(ANY_BANNER)).toHaveCount(0)
})

test('shows no banner when no weekend is active', async ({ page }) => {
  await secuelaAt(-2 * DAY)
  await setGroupStatus(snapshot, WeekendStatus.FINISHED)
  await openHome(page)

  await expect(page.getByText(ANY_BANNER)).toHaveCount(0)
})
