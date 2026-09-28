import type Stripe from 'stripe'
import { isErr, isOk, ok } from '@/lib/results'

// `server-only` is provided by Next's bundler, not an installed package.
jest.mock('server-only', () => ({}), { virtual: true })

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

jest.mock('@/lib/platform-stripe', () => ({
  getPlatformStripe: jest.fn(),
  getPlatformPriceId: jest.fn(),
  isPlatformBillingConfigured: jest.fn(),
}))

// The real module pulls in next/headers and the Supabase SSR client.
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('./repository', () => ({
  getBillingAccount: jest.fn(),
  findBillingAccountById: jest.fn(),
  findBillingAccountBySubscriptionId: jest.fn(),
  findBillingAccountByCustomerId: jest.fn(),
  updateBillingAccount: jest.fn(),
  recordWebhookEvent: jest.fn(),
  releaseWebhookEvent: jest.fn(),
}))

import { getPlatformStripe } from '@/lib/platform-stripe'
import * as BillingRepository from './repository'
import {
  applySubscriptionEvent,
  snapshotFromSubscription,
  snapshotToPatch,
  syncSubscription,
  toBillingAccount,
} from './platform-billing-service'
import type { RawBillingAccount } from './types'

/** A basil-shaped subscription: the period lives on the item, price on the item. */
function basilSubscription(
  overrides: Partial<Stripe.Subscription> = {}
): Stripe.Subscription {
  return {
    id: 'sub_123',
    object: 'subscription',
    customer: 'cus_123',
    status: 'active',
    cancel_at_period_end: false,
    canceled_at: null,
    latest_invoice: 'in_123',
    metadata: { billing_account_id: 'acct-1' },
    items: {
      object: 'list',
      data: [
        {
          id: 'si_123',
          object: 'subscription_item',
          current_period_start: 1_790_000_000,
          current_period_end: 1_792_592_000,
          price: {
            id: 'price_123',
            object: 'price',
            unit_amount: 4500,
            currency: 'usd',
            recurring: { interval: 'month', interval_count: 1 },
          },
        },
      ],
    },
    ...overrides,
  } as unknown as Stripe.Subscription
}

function rawAccount(
  overrides: Partial<RawBillingAccount> = {}
): RawBillingAccount {
  return {
    id: 'acct-1',
    community_id: null,
    stripe_customer_id: 'cus_123',
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
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('snapshotFromSubscription', () => {
  it('reads the period and price from the first subscription item (basil)', () => {
    const snapshot = snapshotFromSubscription(basilSubscription())

    expect(snapshot).toEqual({
      stripeSubscriptionId: 'sub_123',
      stripeCustomerId: 'cus_123',
      status: 'active',
      priceId: 'price_123',
      planAmountCents: 4500,
      planInterval: 'month',
      currency: 'usd',
      currentPeriodStart: new Date(1_790_000_000 * 1000).toISOString(),
      currentPeriodEnd: new Date(1_792_592_000 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      latestInvoiceId: 'in_123',
      latestInvoiceStatus: null,
    })
  })

  it('reads an expanded latest invoice and an expanded customer', () => {
    const snapshot = snapshotFromSubscription(
      basilSubscription({
        customer: { id: 'cus_expanded' } as unknown as Stripe.Customer,
        latest_invoice: {
          id: 'in_expanded',
          status: 'paid',
        } as unknown as Stripe.Invoice,
      })
    )
    expect(snapshot.stripeCustomerId).toBe('cus_expanded')
    expect(snapshot.latestInvoiceId).toBe('in_expanded')
    expect(snapshot.latestInvoiceStatus).toBe('paid')
  })

  it('tolerates a subscription with no items', () => {
    const snapshot = snapshotFromSubscription(
      basilSubscription({
        items: {
          object: 'list',
          data: [],
        } as unknown as Stripe.Subscription['items'],
      })
    )
    expect(snapshot.priceId).toBeNull()
    expect(snapshot.planAmountCents).toBeNull()
    expect(snapshot.currentPeriodEnd).toBeNull()
    expect(snapshot.status).toBe('active')
  })

  it('captures a cancellation', () => {
    const snapshot = snapshotFromSubscription(
      basilSubscription({
        status: 'canceled',
        canceled_at: 1_791_000_000,
        cancel_at_period_end: false,
      })
    )
    expect(snapshot.status).toBe('canceled')
    expect(snapshot.canceledAt).toBe(
      new Date(1_791_000_000 * 1000).toISOString()
    )
  })
})

describe('applySubscriptionEvent', () => {
  const snapshot = snapshotFromSubscription(basilSubscription())

  it('applies a fresh event and records its created timestamp', () => {
    const outcome = applySubscriptionEvent(
      { lastEventCreated: 1_790_000_000 },
      snapshot,
      1_790_000_100
    )
    expect(outcome.kind).toBe('apply')
    if (outcome.kind === 'apply') {
      expect(outcome.patch).toEqual({
        ...snapshotToPatch(snapshot),
        last_event_created: 1_790_000_100,
      })
      expect(outcome.patch.status).toBe('active')
      expect(outcome.patch.stripe_customer_id).toBe('cus_123')
    }
  })

  it('applies the first event ever (no last_event_created yet)', () => {
    const outcome = applySubscriptionEvent(
      { lastEventCreated: null },
      snapshot,
      1
    )
    expect(outcome.kind).toBe('apply')
  })

  it('applies an event with the same timestamp as the last one', () => {
    const outcome = applySubscriptionEvent(
      { lastEventCreated: 1_790_000_000 },
      snapshot,
      1_790_000_000
    )
    expect(outcome.kind).toBe('apply')
  })

  it('skips an event older than the newest one applied', () => {
    const outcome = applySubscriptionEvent(
      { lastEventCreated: 1_790_000_100 },
      snapshot,
      1_790_000_000
    )
    expect(outcome).toEqual({ kind: 'stale' })
  })

  it('writes the canceled transition through', () => {
    const canceled = snapshotFromSubscription(
      basilSubscription({ status: 'canceled', canceled_at: 1_791_000_000 })
    )
    const outcome = applySubscriptionEvent(
      { lastEventCreated: 1_790_000_000 },
      canceled,
      1_791_000_000
    )
    expect(outcome.kind).toBe('apply')
    if (outcome.kind === 'apply') {
      expect(outcome.patch.status).toBe('canceled')
      expect(outcome.patch.canceled_at).toBe(
        new Date(1_791_000_000 * 1000).toISOString()
      )
    }
  })

  it('writes a scheduled cancellation as still active with the flag set', () => {
    const canceling = snapshotFromSubscription(
      basilSubscription({
        cancel_at_period_end: true,
        canceled_at: 1_791_000_000,
      })
    )
    const outcome = applySubscriptionEvent(
      { lastEventCreated: null },
      canceling,
      1_791_000_000
    )
    expect(outcome.kind).toBe('apply')
    if (outcome.kind === 'apply') {
      expect(outcome.patch.status).toBe('active')
      expect(outcome.patch.cancel_at_period_end).toBe(true)
    }
  })

  it('does not blank the invoice status when the invoice is not expanded', () => {
    const patch = snapshotToPatch(snapshot)
    expect('latest_invoice_status' in patch).toBe(false)
    expect(patch.latest_invoice_id).toBe('in_123')
  })
})

describe('toBillingAccount', () => {
  it('camel-cases the row and drops unknown statuses to null', () => {
    const account = toBillingAccount(
      rawAccount({ status: 'active', latest_invoice_status: 'weird' })
    )
    expect(account.status).toBe('active')
    expect(account.latestInvoiceStatus).toBeNull()
    expect(account.stripeCustomerId).toBe('cus_123')
  })
})

describe('syncSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('reads the subscription from Stripe and writes it as the newest state', async () => {
    const retrieve = jest.fn().mockResolvedValue(basilSubscription())
    jest
      .mocked(getPlatformStripe)
      .mockReturnValue(ok({ subscriptions: { retrieve } } as unknown as Stripe))
    jest
      .mocked(BillingRepository.findBillingAccountById)
      .mockResolvedValue(ok(rawAccount()))
    jest
      .mocked(BillingRepository.updateBillingAccount)
      .mockImplementation(async (_client, id, patch) =>
        ok(rawAccount({ id, ...patch }))
      )

    const before = Math.floor(Date.now() / 1000)
    const result = await syncSubscription({} as never, 'sub_123')

    expect(retrieve).toHaveBeenCalledWith('sub_123', {
      expand: ['latest_invoice'],
    })
    expect(BillingRepository.updateBillingAccount).toHaveBeenCalledTimes(1)
    const patch = jest.mocked(BillingRepository.updateBillingAccount).mock
      .calls[0]![2]
    expect(patch.status).toBe('active')
    expect(patch.stripe_subscription_id).toBe('sub_123')
    expect(patch.last_event_created).toBeGreaterThanOrEqual(before)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.data.status).toBe('active')
  })

  it('fails without writing when Stripe is unreachable', async () => {
    jest.mocked(getPlatformStripe).mockReturnValue(
      ok({
        subscriptions: {
          retrieve: jest.fn().mockRejectedValue(new Error('boom')),
        },
      } as unknown as Stripe)
    )

    const result = await syncSubscription({} as never, 'sub_123')

    expect(isErr(result)).toBe(true)
    expect(BillingRepository.updateBillingAccount).not.toHaveBeenCalled()
  })

  it('falls back to the single unsubscribed row when nothing else matches', async () => {
    jest.mocked(getPlatformStripe).mockReturnValue(
      ok({
        subscriptions: {
          retrieve: jest
            .fn()
            .mockResolvedValue(basilSubscription({ metadata: {} })),
        },
      } as unknown as Stripe)
    )
    jest
      .mocked(BillingRepository.findBillingAccountBySubscriptionId)
      .mockResolvedValue(ok(null))
    jest
      .mocked(BillingRepository.findBillingAccountByCustomerId)
      .mockResolvedValue(ok(null))
    jest
      .mocked(BillingRepository.getBillingAccount)
      .mockResolvedValue(ok(rawAccount({ stripe_customer_id: null })))
    jest
      .mocked(BillingRepository.updateBillingAccount)
      .mockImplementation(async (_client, id, patch) =>
        ok(rawAccount({ id, ...patch }))
      )

    const result = await syncSubscription({} as never, 'sub_123')

    expect(BillingRepository.findBillingAccountById).not.toHaveBeenCalled()
    expect(BillingRepository.updateBillingAccount).toHaveBeenCalledWith(
      expect.anything(),
      'acct-1',
      expect.objectContaining({ stripe_customer_id: 'cus_123' })
    )
    expect(isOk(result)).toBe(true)
  })
})
