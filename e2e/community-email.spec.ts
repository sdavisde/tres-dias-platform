import { expect, test } from '@playwright/test'
import { createUnsubscribeToken } from '@/services/community-email/unsubscribe-token'
import {
  candidateEmailsForWeekend,
  deleteUnsubscribes,
  unsubscribeRows,
} from './fixtures/community-email'
import { loadPersonas, storageStatePath } from './fixtures/personas'

/**
 * Community email (docs/specs/23-spec-community-email), the parts no other
 * spec covers:
 *
 * 1. The unsubscribe link and the one-click header endpoint opt an address
 *    out, and reject a forged token.
 * 2. A member without the permission can't open Admin → Email.
 *
 * Writing and sending is covered by e2e/weekend-email.spec.ts (from the
 * weekend hub) and services/community-email/send-broadcast.test.ts (the
 * Resend request).
 */

test.describe.configure({ mode: 'serial', timeout: 60_000 })

let candidateEmails: string[]

test.beforeAll(async () => {
  const personas = await loadPersonas()
  candidateEmails = await candidateEmailsForWeekend(
    personas.candidates.full.weekendId
  )
  expect(candidateEmails.length).toBeGreaterThan(1)
  await deleteUnsubscribes(candidateEmails)
})

test.afterAll(async () => {
  await deleteUnsubscribes(candidateEmails ?? [])
})

test('unsubscribe link and one-click header opt an address out', async ({
  browser,
  request,
}) => {
  const [viaPage, viaHeader] = candidateEmails

  // A signed-out person following the link in an email.
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(
    `/unsubscribe?t=${encodeURIComponent(createUnsubscribeToken(viaPage))}`
  )
  await expect(page.getByText(viaPage)).toBeVisible()
  await page.getByRole('button', { name: 'Unsubscribe' }).click()
  await expect(page.getByText("You're unsubscribed")).toBeVisible()
  await context.close()

  // A mail client's one-click button (RFC 8058).
  const oneClick = await request.post(
    `/api/email/unsubscribe?t=${encodeURIComponent(createUnsubscribeToken(viaHeader))}`
  )
  expect(oneClick.status()).toBe(200)

  const forged = await request.post(
    `/api/email/unsubscribe?t=${Buffer.from(viaHeader).toString('base64url')}.forged`
  )
  expect(forged.status()).toBe(400)

  const rows = await unsubscribeRows([viaPage, viaHeader])
  expect(rows.map((row) => [row.email, row.source]).sort()).toEqual(
    [
      [viaPage, 'link'],
      [viaHeader, 'one_click'],
    ].sort()
  )
})

test.describe('as a member without the permission', () => {
  test.use({ storageState: storageStatePath('teamForms') })

  test('cannot open Admin → Email', async ({ page }) => {
    await page.goto('/admin/email')
    await expect(page).not.toHaveURL(/\/admin\/email/)
  })
})
