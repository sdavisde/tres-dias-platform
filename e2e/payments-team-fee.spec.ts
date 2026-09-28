import type { Page } from '@playwright/test'
import { CHECKOUT_REFUSAL_MESSAGES } from '@/lib/payments/checkout-price'
import { formatFee } from '@/lib/payments/group-fees'
import { expect, paymentRows, test } from './fixtures/payments'
import {
  loadPersonas,
  storageStatePath,
  type Personas,
} from './fixtures/personas'
import { postWebhook, signedCheckoutCompleted } from './fixtures/stripe-events'

/**
 * FR-4.3 and FR-4.6 for the team fee, as the `teamFee` persona (S3). The
 * payment itself is a synthetic signed webhook (Settled Decision "Payments on
 * PRs"): the embedded checkout cannot mount with the dummy Stripe keys, so
 * nothing here touches its iframe.
 *
 * The webhook handler's follow-up `getTransactionData` call reaches Stripe
 * with the dummy key and fails, and the assistant-head email fails on the
 * dummy Resend key; both are tolerated (FR-4.8). The fixture in
 * ./fixtures/payments.ts deletes the pi_e2e_ rows and the email_log rows.
 */

test.describe.configure({ mode: 'serial' })
test.use({ storageState: storageStatePath('teamFee') })

let personas: Personas

test.beforeAll(async () => {
  personas = await loadPersonas()
})

function payTeamFeeLink(page: Page) {
  return page.getByRole('link', { name: 'Pay team fees' })
}

test('the team fee page shows the fee and the card surcharge', async ({
  page,
}) => {
  const { fee, surcharge, covered } = personas.teamFee
  // Same branches as app/(member)/payment/team-fee/page.tsx.
  const description =
    covered > 0
      ? `${formatFee(fee - covered)} left of your ${formatFee(fee)} team fee, plus ${formatFee(surcharge)} card processing.`
      : `Your ${formatFee(fee)} team fee, plus ${formatFee(surcharge)} card processing.`

  await page.goto('/payment/team-fee')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Team fee' })
  ).toBeVisible()
  await expect(page.getByText(description, { exact: true })).toBeVisible()
  await expect(page.getByText('Nothing to pay online')).toBeHidden()
})

test('a signed checkout event pays the team fee once, and a replay records nothing', async ({
  page,
  request,
}) => {
  test.setTimeout(90_000)
  const member = personas.teamFee
  const expectedTotal = member.fee - member.covered + member.surcharge

  await test.step('the checklist item starts not done', async () => {
    await page.goto('/home')
    await expect(page.getByText('Pay team fees', { exact: true })).toBeVisible()
    await expect(
      page.getByText('Pay team fees', { exact: true })
    ).not.toHaveClass(/line-through/)
  })

  const event = signedCheckoutCompleted({
    target: { kind: 'team', groupMemberId: member.groupMemberId },
    // getCheckoutQuote's payerName for a team fee is "first last".
    quote: {
      payerName: `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim(),
      groupId: personas.group.id,
      userId: member.userId,
    },
    userEmail: member.email,
    amountTotalCents: expectedTotal * 100,
    customerEmail: member.email,
  })

  await test.step('the webhook accepts and processes the event', async () => {
    const started = Date.now()
    const response = await postWebhook(request, event)
    console.info(`team fee webhook: ${Date.now() - started}ms`)
    expect(response.status()).toBe(200)
    expect(await response.json()).toMatchObject({
      received: true,
      processed: true,
    })
  })

  await test.step('exactly one payment row is recorded', async () => {
    const rows = await paymentRows(member.groupMemberId)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      payment_intent_id: event.paymentIntentId,
      target_type: 'weekend_group_member',
      target_id: member.groupMemberId,
      payment_method: 'stripe',
      weekend_id: member.rosterWeekendId,
    })
    expect(Number(rows[0].gross_amount)).toBe(expectedTotal)
  })

  await test.step('the team fee page has nothing left to pay', async () => {
    await page.goto('/payment/team-fee')
    await expect(page.getByText('Nothing to pay online')).toBeVisible()
    await expect(
      page.getByText(CHECKOUT_REFUSAL_MESSAGES.team['already-paid'], {
        exact: true,
      })
    ).toBeVisible()
  })

  await test.step('the home checklist shows the fee done', async () => {
    await page.goto('/home')
    // components/team-todos/todo-item.tsx: a done item strikes its label
    // through and its link stops taking clicks.
    await expect(page.getByText('Pay team fees', { exact: true })).toHaveClass(
      /line-through/
    )
    await expect(payTeamFeeLink(page)).toHaveClass(/pointer-events-none/)
  })

  await test.step('replaying the identical event records nothing', async () => {
    const response = await postWebhook(request, event)
    expect(response.status()).toBe(200)
    expect(await response.json()).toMatchObject({
      received: true,
      processed: false,
    })
    expect(await paymentRows(member.groupMemberId)).toHaveLength(1)
  })
})
