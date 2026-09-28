import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { format } from 'date-fns'
import {
  billingAccountRow,
  billingWebhookEventRows,
  deleteBillingWebhookEvents,
  e2eStripeId,
  postPlatformWebhook,
  resetBillingAccountForSpec,
  restoreBillingAccount,
  signedInvoicePaymentFailed,
  signedSubscriptionCreated,
  signedSubscriptionDeleted,
  signedSubscriptionUpdated,
  snapshotBillingAccount,
  type BillingAccountSnapshot,
  type SignedBillingEvent,
  type SubscriptionEventInput,
} from './fixtures/billing'
import { loadPersonas, storageStatePath } from './fixtures/personas'

/**
 * Platform billing (docs/specs/21-spec-platform-billing), as the
 * `billingManager` persona (S7): an admin can always sign the community up,
 * and the Billing page and dashboard follow what Stripe says through the
 * webhook.
 *
 * Every Stripe event here is synthetic and signed with
 * PLATFORM_STRIPE_WEBHOOK_SECRET, so the spec needs no Stripe account. With
 * dummy keys (CI) every live Stripe read on the page fails and degrades (no
 * payment method, "Invoices couldn't be loaded"); nothing below asserts on
 * those parts. `checkout.session.completed` is not used: its handler reads the
 * subscription from Stripe live. The real hosted Checkout is covered by the
 * `@stripe-live` spec in ./billing-live.spec.ts.
 *
 * The tests build on each other (one subscription's life, in order). The
 * `billing_account` row is snapshotted before and restored after, since a
 * developer's local row can hold a real sandbox subscription.
 */

test.describe.configure({ mode: 'serial', timeout: 60_000 })
test.use({ storageState: storageStatePath('billingManager') })

const DAY = 24 * 60 * 60

let snapshot: BillingAccountSnapshot | undefined
let billingAccountId: string
const sentEventIds = new Set<string>()

// One subscription for the whole file. `t0` anchors every event's `created`
// so the stale-event ordering below is explicit.
const t0 = Math.floor(Date.now() / 1000)
const subscriptionId = e2eStripeId('sub')
const customerId = e2eStripeId('cus')
const invoiceId = e2eStripeId('in')
const periodStart = t0
const periodEnd = t0 + 30 * DAY

function subscription(
  overrides: Pick<SubscriptionEventInput, 'status' | 'created'> &
    Partial<SubscriptionEventInput>
): SubscriptionEventInput {
  return {
    billingAccountId,
    subscriptionId,
    customerId,
    periodStart,
    periodEnd,
    ...overrides,
  }
}

/** Same format as lib/billing/format.ts `formatBillingDate`. */
function billingDate(epochSeconds: number): string {
  return format(new Date(epochSeconds * 1000), 'MMMM d, yyyy')
}

/** POSTs a signed event, tracking its id for cleanup. */
async function send(
  request: Parameters<typeof postPlatformWebhook>[0],
  event: SignedBillingEvent
) {
  sentEventIds.add(event.eventId)
  return postPlatformWebhook(request, event)
}

function planCard(page: Page) {
  return page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByRole('heading', { name: 'Tres Dias Platform' }) })
}

async function openBilling(page: Page) {
  await page.goto('/admin/billing')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Billing' })
  ).toBeVisible()
  await expect(
    page.getByText("Platform billing isn't set up on this deployment."),
    'The dev server needs PLATFORM_STRIPE_SECRET_KEY, PLATFORM_STRIPE_WEBHOOK_SECRET and PLATFORM_STRIPE_PRICE_ID'
  ).toBeHidden()
}

test.beforeAll(async () => {
  await loadPersonas()
  snapshot = await snapshotBillingAccount()
  billingAccountId = await resetBillingAccountForSpec()
  // Sweeps evt_e2e_billing_ rows a crashed run may have left.
  await deleteBillingWebhookEvents([])
})

test.afterAll(async () => {
  if (snapshot !== undefined) await restoreBillingAccount(snapshot)
  await deleteBillingWebhookEvents(sentEventIds)
})

// Signed in the signup test (billingAccountId is only known after beforeAll)
// and replayed byte for byte in the next one.
let createdEvent: SignedBillingEvent

test('offers Subscribe when the community has never subscribed', async ({
  page,
}) => {
  await openBilling(page)
  const card = planCard(page)
  await expect(card.getByText('Not subscribed', { exact: true })).toBeVisible()
  await expect(
    card.getByText('Nothing is charged until the community subscribes.')
  ).toBeVisible()
  const subscribe = card.getByRole('button', { name: 'Subscribe' })
  await expect(subscribe).toBeVisible()
  await expect(subscribe).toBeEnabled()
  await expect(
    page.getByRole('button', { name: 'Manage subscription' })
  ).toHaveCount(0)
})

test('a completed signup shows as Active', async ({ page, request }) => {
  createdEvent = signedSubscriptionCreated(
    subscription({ status: 'active', created: t0 })
  )

  const response = await send(request, createdEvent)
  expect(response.status()).toBe(200)
  expect(await response.json()).toMatchObject({
    received: true,
    processed: true,
  })

  const row = await billingAccountRow()
  expect(row).toMatchObject({
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: customerId,
    status: 'active',
    plan_amount_cents: 4500,
    plan_interval: 'month',
  })

  await openBilling(page)
  const card = planCard(page)
  await expect(card.getByText('Active', { exact: true })).toBeVisible()
  await expect(card.getByText('$45 / month')).toBeVisible()
  await expect(
    card.getByText(`Renews on ${billingDate(periodEnd)}`, { exact: true })
  ).toBeVisible()
  await expect(
    card.getByRole('button', { name: 'Manage subscription' })
  ).toBeVisible()
  await expect(card.getByRole('button', { name: 'Subscribe' })).toHaveCount(0)
})

test('a replayed event changes nothing', async ({ request }) => {
  const before = await billingAccountRow()

  const response = await send(request, createdEvent)
  expect(response.status()).toBe(200)
  expect(await response.json()).toMatchObject({
    received: true,
    processed: false,
  })

  expect(await billingWebhookEventRows(createdEvent.eventId)).toHaveLength(1)
  const after = await billingAccountRow()
  expect(after.updated_at).toBe(before.updated_at)
  expect(after.status).toBe('active')
})

test('a failed renewal warns on the page and the dashboard', async ({
  page,
  request,
}) => {
  await test.step('the failed invoice is recorded', async () => {
    const response = await send(
      request,
      signedInvoicePaymentFailed({
        billingAccountId,
        subscriptionId,
        customerId,
        invoiceId,
        created: t0 + 10,
      })
    )
    expect(response.status()).toBe(200)
    expect(await response.json()).toMatchObject({ processed: true })
    expect(await billingAccountRow()).toMatchObject({
      latest_invoice_id: invoiceId,
      latest_invoice_status: 'open',
    })
  })

  await test.step('the subscription goes past due', async () => {
    const response = await send(
      request,
      signedSubscriptionUpdated(
        subscription({
          status: 'past_due',
          created: t0 + 20,
          latestInvoiceId: invoiceId,
        })
      )
    )
    expect(response.status()).toBe(200)
    expect(await response.json()).toMatchObject({ processed: true })
    expect((await billingAccountRow()).status).toBe('past_due')
  })

  await test.step('the Billing page shows the warning', async () => {
    await openBilling(page)
    await expect(
      page
        .getByRole('alert')
        .filter({ hasText: "The last payment didn't go through" })
    ).toBeVisible()
    await expect(
      planCard(page).getByText('Past due', { exact: true })
    ).toBeVisible()
  })

  await test.step('the admin dashboard shows the alert', async () => {
    await page.goto('/admin')
    const alert = page
      .getByRole('alert')
      .filter({ hasText: 'The platform subscription payment failed' })
    await expect(alert).toBeVisible()
    await expect(
      alert.getByRole('link', { name: /Go to billing/ })
    ).toHaveAttribute('href', '/admin/billing')
  })
})

test('an out-of-order stale update is ignored', async ({ request }) => {
  // Older than the past_due event (t0 + 20), so it must not win.
  const stale = signedSubscriptionUpdated(
    subscription({ status: 'active', created: t0 + 5 })
  )
  const response = await send(request, stale)
  expect(response.status()).toBe(200)
  expect(await response.json()).toMatchObject({
    received: true,
    processed: false,
  })

  const [ledger] = await billingWebhookEventRows(stale.eventId)
  expect(ledger?.outcome).toBe('skipped_stale')
  expect((await billingAccountRow()).status).toBe('past_due')
})

test('cancellation brings Subscribe back', async ({ page, request }) => {
  const canceledAt = t0 + 30
  const response = await send(
    request,
    signedSubscriptionDeleted(
      subscription({ status: 'canceled', created: canceledAt, canceledAt })
    )
  )
  expect(response.status()).toBe(200)
  expect(await response.json()).toMatchObject({ processed: true })
  expect((await billingAccountRow()).status).toBe('canceled')

  await openBilling(page)
  const card = planCard(page)
  await expect(card.getByText('Canceled', { exact: true })).toBeVisible()
  await expect(
    card.getByText(`Canceled on ${billingDate(canceledAt)}.`, { exact: true })
  ).toBeVisible()
  const subscribe = card.getByRole('button', { name: 'Subscribe' })
  await expect(subscribe).toBeVisible()
  await expect(subscribe).toBeEnabled()
  await expect(
    card.getByRole('button', { name: 'Manage subscription' })
  ).toHaveCount(0)
})

test('an unsigned or wrongly signed event is rejected', async ({ request }) => {
  const event = signedSubscriptionUpdated(
    subscription({ status: 'active', created: t0 + 40 })
  )

  const unsigned = await postPlatformWebhook(request, {
    payload: event.payload,
  })
  expect(unsigned.status()).toBe(400)

  const forged = await postPlatformWebhook(request, {
    payload: event.payload,
    signature: 't=1,v1=0000',
  })
  expect(forged.status()).toBe(400)

  expect(await billingWebhookEventRows(event.eventId)).toHaveLength(0)
  expect((await billingAccountRow()).status).toBe('canceled')
})
