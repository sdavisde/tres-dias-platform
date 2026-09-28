import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { APIRequestContext, APIResponse } from '@playwright/test'
import { isNil } from 'lodash'
import Stripe from 'stripe'
import type { Tables } from '@/database.types'
import { adminClient } from './supabase'

/**
 * Fixtures for the platform billing specs (e2e/billing*.spec.ts).
 *
 * - `snapshotBillingAccount()` / `restoreBillingAccount()`: `billing_account`
 *   is not wiped by the reseed (it is migration-seeded, like `roles`), and a
 *   developer's local row can hold a real sandbox subscription. The specs
 *   snapshot it before touching it and put it back afterwards. The snapshot
 *   is also written to e2e/.auth/, so a run killed before `afterAll` is
 *   repaired by the next run's snapshot step.
 * - `resetBillingAccountForSpec()`: puts the row in the never-subscribed state.
 * - Synthetic, signed events for /api/webhooks/platform-billing, signed with
 *   PLATFORM_STRIPE_WEBHOOK_SECRET. No Stripe account is involved. The
 *   subscription is basil-shaped, as `snapshotFromSubscription` reads it
 *   (period dates and price on `items.data[0]`, `metadata.billing_account_id`).
 *   `checkout.session.completed` is deliberately absent: its handler reads the
 *   subscription from Stripe live, which a PR run cannot do.
 * - `deleteBillingWebhookEvents()`: removes only the `billing_webhook_events`
 *   rows the specs created (event ids start with `evt_e2e_billing_`).
 */

type BillingAccountRow = Tables<'billing_account'>

// Only used for its offline signing helper; never makes a request.
const stripe = new Stripe('sk_test_e2e_dummy')

const PLATFORM_WEBHOOK_PATH = '/api/webhooks/platform-billing'
const SNAPSHOT_PATH = 'e2e/.auth/billing-account.snapshot.json'

/** Every synthetic event id starts with this; cleanup keys on it. */
export const E2E_BILLING_EVENT_PREFIX = 'evt_e2e_billing_'

/** The plan the synthetic subscriptions are on ($45 / month). */
export const E2E_PLAN = {
  priceId: 'price_e2e_platform',
  unitAmount: 4500,
  currency: 'usd',
  interval: 'month',
} as const

function shortId(): string {
  return randomUUID().replaceAll('-', '').slice(0, 24)
}

function unwrap<T>(
  response: { data: T | null; error: { message: string } | null },
  what: string
): T {
  if (!isNil(response.error)) {
    throw new Error(
      `Billing fixture failed (${what}): ${response.error.message}`
    )
  }
  if (isNil(response.data)) {
    throw new Error(`Billing fixture failed (${what}): no data`)
  }
  return response.data
}

// ---------------------------------------------------------------------------
// billing_account snapshot / restore / reset
// ---------------------------------------------------------------------------

export type BillingAccountSnapshot = BillingAccountRow[]

async function readBillingAccounts(): Promise<BillingAccountRow[]> {
  return unwrap(
    await adminClient().from('billing_account').select('*').order('id'),
    'read billing_account'
  )
}

async function writeRows(rows: BillingAccountRow[]): Promise<void> {
  for (const { id, created_at: _createdAt, ...columns } of rows) {
    const { error } = await adminClient()
      .from('billing_account')
      .update(columns)
      .eq('id', id)
    if (!isNil(error)) {
      throw new Error(
        `Failed to restore billing_account ${id}: ${error.message}`
      )
    }
  }
}

/** True when a row carries ids only the synthetic events use. */
function holdsE2EState(row: BillingAccountRow): boolean {
  return (
    (row.stripe_subscription_id ?? '').startsWith('sub_e2e_') ||
    (row.stripe_customer_id ?? '').startsWith('cus_e2e_')
  )
}

/**
 * Repairs a row left behind by a run that died before `afterAll`: if a
 * snapshot file is still on disk and the row is in a state the specs put it in
 * (never-subscribed, or synthetic `_e2e_` ids), the file is written back.
 * Anything else means the row changed for real since, so it is left alone.
 */
async function recoverFromCrashedRun(): Promise<void> {
  if (!fs.existsSync(SNAPSHOT_PATH)) return
  const saved = JSON.parse(
    fs.readFileSync(SNAPSHOT_PATH, 'utf8')
  ) as BillingAccountSnapshot
  const current = new Map((await readBillingAccounts()).map((r) => [r.id, r]))
  const repairable = saved.filter((row) => {
    const now = current.get(row.id)
    return (
      !isNil(now) &&
      (holdsE2EState(now) ||
        (isNil(now.status) && isNil(now.stripe_subscription_id)))
    )
  })
  if (repairable.length > 0) {
    console.warn(
      `billing fixture: restoring billing_account from ${SNAPSHOT_PATH}, left by a run that did not finish`
    )
    await writeRows(repairable)
  }
  fs.rmSync(SNAPSHOT_PATH)
}

/**
 * Reads every `billing_account` row (there is one) so the spec can put it
 * back, and keeps a copy on disk until `restoreBillingAccount` runs.
 */
export async function snapshotBillingAccount(): Promise<BillingAccountSnapshot> {
  await recoverFromCrashedRun()
  const rows = await readBillingAccounts()
  if (rows.length === 0) {
    throw new Error(
      'billing_account has no row. The platform billing migration seeds one; is the local database migrated?'
    )
  }
  fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true })
  fs.writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(rows, null, 2)}\n`)
  return rows
}

/** Writes the snapshot back, column for column, and drops the file copy. */
export async function restoreBillingAccount(
  snapshot: BillingAccountSnapshot
): Promise<void> {
  await writeRows(snapshot)
  if (fs.existsSync(SNAPSHOT_PATH)) fs.rmSync(SNAPSHOT_PATH)
}

/**
 * Puts the row in the never-subscribed state: no Stripe ids, no status, no
 * period, no invoice, and no `last_event_created`, so the first synthetic
 * event is never stale. Returns the row's id.
 */
export async function resetBillingAccountForSpec(): Promise<string> {
  const rows = await readBillingAccounts()
  if (rows.length !== 1) {
    throw new Error(
      `Expected exactly one billing_account row, found ${rows.length}`
    )
  }
  const [row] = rows
  const { error } = await adminClient()
    .from('billing_account')
    .update({
      stripe_customer_id: null,
      stripe_subscription_id: null,
      status: null,
      price_id: null,
      plan_amount_cents: null,
      plan_interval: null,
      currency: null,
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      canceled_at: null,
      latest_invoice_id: null,
      latest_invoice_status: null,
      last_event_created: null,
    })
    .eq('id', row.id)
  if (!isNil(error)) {
    throw new Error(`Failed to reset billing_account: ${error.message}`)
  }
  return row.id
}

/** The single row, as the database holds it now. */
export async function billingAccountRow(): Promise<BillingAccountRow> {
  const [row] = await readBillingAccounts()
  if (isNil(row)) throw new Error('billing_account has no row')
  return row
}

// ---------------------------------------------------------------------------
// billing_webhook_events
// ---------------------------------------------------------------------------

/** Ledger rows for one event id (the idempotency guard: at most one). */
export async function billingWebhookEventRows(
  eventId: string
): Promise<Tables<'billing_webhook_events'>[]> {
  return unwrap(
    await adminClient()
      .from('billing_webhook_events')
      .select('*')
      .eq('stripe_event_id', eventId),
    'read billing_webhook_events'
  )
}

/**
 * Deletes the ledger rows for the given event ids, plus any synthetic
 * `evt_e2e_billing_` row a crashed run left behind. Real events are never
 * touched.
 */
export async function deleteBillingWebhookEvents(
  eventIds: Iterable<string>
): Promise<void> {
  const ids = [...eventIds]
  const db = adminClient()
  if (ids.length > 0) {
    const { error } = await db
      .from('billing_webhook_events')
      .delete()
      .in('stripe_event_id', ids)
    if (!isNil(error)) {
      throw new Error(
        `Failed to delete billing_webhook_events: ${error.message}`
      )
    }
  }
  const { error } = await db
    .from('billing_webhook_events')
    .delete()
    .like('stripe_event_id', `${E2E_BILLING_EVENT_PREFIX}%`)
  if (!isNil(error)) {
    throw new Error(
      `Failed to delete ${E2E_BILLING_EVENT_PREFIX} billing_webhook_events: ${error.message}`
    )
  }
}

// ---------------------------------------------------------------------------
// Signed events
// ---------------------------------------------------------------------------

function platformWebhookSecret(): string {
  const secret = process.env.PLATFORM_STRIPE_WEBHOOK_SECRET
  if (isNil(secret) || secret === '') {
    throw new Error(
      'PLATFORM_STRIPE_WEBHOOK_SECRET is not set. The billing spec signs its ' +
        'webhook events with it, and it must match the dev server value (see ' +
        'docs/e2e-testing.md)'
    )
  }
  return secret
}

export type SignedBillingEvent = {
  /** The exact bytes that were signed; POST them unchanged. */
  payload: string
  signature: string
  eventId: string
}

/** A fresh synthetic id with Stripe's prefix, e.g. `sub_e2e_…`. */
export function e2eStripeId(prefix: 'sub' | 'cus' | 'in'): string {
  return `${prefix}_e2e_${shortId()}`
}

function signEvent(
  type: string,
  created: number,
  object: unknown
): SignedBillingEvent {
  const eventId = `${E2E_BILLING_EVENT_PREFIX}${shortId()}`
  const event = {
    id: eventId,
    object: 'event',
    type,
    created,
    livemode: false,
    // The version the platform client pins (lib/platform-stripe.ts).
    api_version: '2025-08-27.basil',
    data: { object },
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
  }
  const payload = JSON.stringify(event)
  return {
    payload,
    signature: stripe.webhooks.generateTestHeaderString({
      payload,
      secret: platformWebhookSecret(),
    }),
    eventId,
  }
}

export type SubscriptionEventInput = {
  billingAccountId: string
  subscriptionId: string
  customerId: string
  status: Stripe.Subscription.Status
  /** `event.created`, epoch seconds; drives the stale-event check. */
  created: number
  cancelAtPeriodEnd?: boolean
  /** Epoch seconds when the subscription was canceled, if it was. */
  canceledAt?: number | null
  /** Epoch seconds. */
  periodStart: number
  /** Epoch seconds. */
  periodEnd: number
  latestInvoiceId?: string | null
}

/** A basil-shaped subscription carrying the fields the handler reads. */
function subscriptionObject(
  input: SubscriptionEventInput
): Stripe.Subscription {
  return {
    id: input.subscriptionId,
    object: 'subscription',
    customer: input.customerId,
    status: input.status,
    cancel_at_period_end: input.cancelAtPeriodEnd ?? false,
    canceled_at: input.canceledAt ?? null,
    latest_invoice: input.latestInvoiceId ?? null,
    metadata: { billing_account_id: input.billingAccountId },
    created: input.periodStart,
    livemode: false,
    items: {
      object: 'list',
      has_more: false,
      url: `/v1/subscription_items?subscription=${input.subscriptionId}`,
      data: [
        {
          id: `si_e2e_${shortId()}`,
          object: 'subscription_item',
          subscription: input.subscriptionId,
          quantity: 1,
          current_period_start: input.periodStart,
          current_period_end: input.periodEnd,
          price: {
            id: E2E_PLAN.priceId,
            object: 'price',
            unit_amount: E2E_PLAN.unitAmount,
            currency: E2E_PLAN.currency,
            recurring: { interval: E2E_PLAN.interval, interval_count: 1 },
            type: 'recurring',
          },
        },
      ],
    },
  } as unknown as Stripe.Subscription
}

export function signedSubscriptionCreated(
  input: SubscriptionEventInput
): SignedBillingEvent {
  return signEvent(
    'customer.subscription.created',
    input.created,
    subscriptionObject(input)
  )
}

export function signedSubscriptionUpdated(
  input: SubscriptionEventInput
): SignedBillingEvent {
  return signEvent(
    'customer.subscription.updated',
    input.created,
    subscriptionObject(input)
  )
}

export function signedSubscriptionDeleted(
  input: SubscriptionEventInput
): SignedBillingEvent {
  return signEvent(
    'customer.subscription.deleted',
    input.created,
    subscriptionObject(input)
  )
}

export type InvoicePaymentFailedInput = {
  billingAccountId: string
  subscriptionId: string
  customerId: string
  invoiceId: string
  /** `event.created`, epoch seconds. */
  created: number
}

/**
 * `invoice.payment_failed` in the basil shape: the subscription is
 * `parent.subscription_details.subscription`. The handler records the invoice
 * and then tries a live subscription read, which fails on the synthetic id and
 * is tolerated.
 */
export function signedInvoicePaymentFailed(
  input: InvoicePaymentFailedInput
): SignedBillingEvent {
  const invoice = {
    id: input.invoiceId,
    object: 'invoice',
    customer: input.customerId,
    status: 'open',
    amount_due: E2E_PLAN.unitAmount,
    amount_paid: 0,
    currency: E2E_PLAN.currency,
    created: input.created,
    livemode: false,
    parent: {
      type: 'subscription_details',
      quote_details: null,
      subscription_details: {
        subscription: input.subscriptionId,
        metadata: { billing_account_id: input.billingAccountId },
      },
    },
  } as unknown as Stripe.Invoice
  return signEvent('invoice.payment_failed', input.created, invoice)
}

/**
 * POSTs a raw payload to the platform webhook. The body is sent as the string
 * itself so its bytes match what was signed. Omit `signature` to send none.
 */
export function postPlatformWebhook(
  request: APIRequestContext,
  { payload, signature }: { payload: string; signature?: string }
): Promise<APIResponse> {
  return request.post(PLATFORM_WEBHOOK_PATH, {
    data: payload,
    headers: {
      'content-type': 'application/json',
      ...(isNil(signature) ? {} : { 'stripe-signature': signature }),
    },
  })
}
