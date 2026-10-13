import { expect, test } from '@playwright/test'
import { isNil } from 'lodash'
import { createUnsubscribeToken } from '@/services/community-email/unsubscribe-token'
import {
  E2E_SUBJECT_PREFIX,
  candidateEmailsForWeekend,
  deleteE2EBroadcasts,
  deleteUnsubscribes,
  findE2EBroadcast,
  unsubscribeRows,
} from './fixtures/community-email'
import {
  loadPersonas,
  storageStatePath,
  type Personas,
} from './fixtures/personas'
import { adminClient } from './fixtures/supabase'

/**
 * Community email (docs/specs/23-spec-community-email): the basic flow end to
 * end, not every formatting option.
 *
 * 1. An admin writes an email to a weekend's candidates and sends it. Off
 *    production the safety rail emails only the sender, so every candidate is
 *    recorded as skipped and nothing reaches Resend.
 * 2. The unsubscribe link and the one-click header endpoint opt an address
 *    out, and reject a forged token.
 * 3. A member without the permission can't open Admin → Email.
 *
 * Sends as `billingManager` (S7), whom the seed makes a Full Access holder.
 */

test.describe.configure({ mode: 'serial', timeout: 60_000 })

let personas: Personas
let weekendId: string
let weekendType: 'MENS' | 'WOMENS'
let candidateEmails: string[]
const subject = `${E2E_SUBJECT_PREFIX} ${Date.now()}`

test.beforeAll(async () => {
  personas = await loadPersonas()
  weekendId = personas.candidates.full.weekendId

  const { data: weekend, error } = await adminClient()
    .from('weekends')
    .select('type')
    .eq('id', weekendId)
    .single()
  if (!isNil(error) || isNil(weekend)) {
    throw new Error(error?.message ?? `weekend ${weekendId} not found`)
  }
  weekendType = weekend.type

  candidateEmails = await candidateEmailsForWeekend(weekendId)
  expect(candidateEmails.length).toBeGreaterThan(1)

  await deleteE2EBroadcasts()
  await deleteUnsubscribes(candidateEmails)
})

test.afterAll(async () => {
  await deleteE2EBroadcasts()
  await deleteUnsubscribes(candidateEmails ?? [])
})

test.describe('as an admin', () => {
  test.use({ storageState: storageStatePath('billingManager') })

  test('writes an email to a weekend’s candidates and sends it', async ({
    page,
  }) => {
    await page.goto('/admin/email')
    await page.getByRole('button', { name: 'New email' }).first().click()
    await page.waitForURL(/\/admin\/email\/[0-9a-f-]{36}$/)

    // Who it goes to: this weekend's candidates.
    await page.getByLabel('Send to').click()
    await page.getByRole('option', { name: "A weekend's candidates" }).click()
    await page.getByLabel('Weekend').click()
    const gender = weekendType === 'MENS' ? '\\bMen' : '\\bWomen'
    await page
      .getByRole('option', {
        name: new RegExp(`${gender}.*#${personas.group.number}\\b`),
      })
      .click()
    await expect(page.getByTestId('recipient-count')).toContainText(
      `${candidateEmails.length} people will receive this`
    )

    // What it says.
    await page.getByLabel('Subject').fill(subject)
    await page.getByRole('textbox', { name: 'Message' }).click()
    await page.keyboard.type('Hello ')
    await page.getByRole('button', { name: 'First name' }).click()
    await page.keyboard.type(', see you at secuela.')
    await expect(page.getByRole('status').getByText('Saved')).toBeVisible()

    // The preview is the email as it will arrive.
    await page.getByRole('tab', { name: 'Preview' }).click()
    await expect(
      page
        .frameLocator('iframe[title="Email preview"]')
        .getByText('see you at secuela.')
    ).toBeVisible()

    // Send, through the confirmation.
    await page.getByRole('button', { name: 'Review & send' }).click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toContainText(
      `Send to ${candidateEmails.length} people?`
    )
    await expect(dialog).toContainText('Test deployment')
    await dialog.getByRole('button', { name: 'Send now' }).click()

    // The page turns into the sent report.
    await expect(
      page.getByRole('heading', { name: 'Recipients', level: 2 })
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      page.getByRole('heading', { name: subject, level: 1 })
    ).toBeVisible()

    const sent = await findE2EBroadcast(subject)
    expect(sent?.status).toBe('sent')
    expect(sent?.recipient_count).toBe(candidateEmails.length)
    expect(sent?.skipped_count).toBe(candidateEmails.length)
    expect(
      (sent?.email_broadcast_recipients ?? []).map((r) => r.email).sort()
    ).toEqual([...candidateEmails].sort())
  })
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
