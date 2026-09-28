import type Stripe from 'stripe'
import { err, isErr, isOk, ok } from '@/lib/results'
import type { WebhookHandlerContext } from '@/services/stripe/handlers/types'
import type { RawBillingAccount } from '../types'

// `server-only` is provided by Next's bundler, not an installed package.
jest.mock('server-only', () => ({}), { virtual: true })

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

// The real module pulls in Sentry and the Supabase server client.
jest.mock('@/services/stripe/webhook-context', () => {
  const { err: makeErr } = jest.requireActual('@/lib/results')
  return {
    webhookErr: (
      code: string,
      message: string,
      stage: string,
      severity: string,
      context: unknown
    ) => makeErr({ code, message, stage, severity, context }),
    createHandlerContext: jest.fn(),
  }
})

jest.mock('@/lib/platform-stripe', () => ({
  getPlatformStripe: jest.fn(),
  getPlatformPriceId: jest.fn(),
  isPlatformBillingConfigured: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('../repository', () => ({
  getBillingAccount: jest.fn(),
  findBillingAccountById: jest.fn(),
  findBillingAccountBySubscriptionId: jest.fn(),
  findBillingAccountByCustomerId: jest.fn(),
  updateBillingAccount: jest.fn(),
  recordWebhookEvent: jest.fn(),
  releaseWebhookEvent: jest.fn(),
}))

import { getPlatformStripe } from '@/lib/platform-stripe'
import * as BillingRepository from '../repository'
import {
  billingCheckoutCompletedHandler,
  billingInvoicePaymentFailedHandler,
  billingSubscriptionUpdatedHandler,
  getPlatformBillingEventTypes,
} from './handlers'

const recordWebhookEvent = jest.mocked(BillingRepository.recordWebhookEvent)
const updateBillingAccount = jest.mocked(BillingRepository.updateBillingAccount)
const findBySubscription = jest.mocked(
  BillingRepository.findBillingAccountBySubscriptionId
)
const findByCustomer = jest.mocked(
  BillingRepository.findBillingAccountByCustomerId
)
const findById = jest.mocked(BillingRepository.findBillingAccountById)
const getBillingAccount = jest.mocked(BillingRepository.getBillingAccount)

function rawAccount(
  overrides: Partial<RawBillingAccount> = {}
): RawBillingAccount {
  return {
    id: 'acct-1',
    community_id: null,
    stripe_customer_id: 'cus_123',
    stripe_subscription_id: 'sub_123',
    status: 'active',
    price_id: 'price_123',
    plan_amount_cents: 4500,
    plan_interval: 'month',
    currency: 'usd',
    current_period_start: null,
    current_period_end: null,
    cancel_at_period_end: false,
    canceled_at: null,
    latest_invoice_id: null,
    latest_invoice_status: null,
    last_event_created: 1_790_000_000,
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

function subscription(
  overrides: Record<string, unknown> = {}
): Stripe.Subscription {
  return {
    id: 'sub_123',
    object: 'subscription',
    customer: 'cus_123',
    status: 'past_due',
    cancel_at_period_end: false,
    canceled_at: null,
    latest_invoice: 'in_123',
    metadata: {},
    items: {
      object: 'list',
      data: [
        {
          id: 'si_123',
          current_period_start: 1_790_000_000,
          current_period_end: 1_792_592_000,
          price: {
            id: 'price_123',
            unit_amount: 4500,
            currency: 'usd',
            recurring: { interval: 'month' },
          },
        },
      ],
    },
    ...overrides,
  } as unknown as Stripe.Subscription
}

function subscriptionUpdatedEvent(
  created: number,
  sub: Stripe.Subscription = subscription()
): Stripe.CustomerSubscriptionUpdatedEvent {
  return {
    id: 'evt_sub',
    type: 'customer.subscription.updated',
    created,
    data: { object: sub },
  } as unknown as Stripe.CustomerSubscriptionUpdatedEvent
}

function checkoutEvent(
  session: Record<string, unknown>
): Stripe.CheckoutSessionCompletedEvent {
  return {
    id: 'evt_checkout',
    type: 'checkout.session.completed',
    created: 1_790_000_500,
    data: {
      object: {
        id: 'cs_test',
        customer: 'cus_123',
        subscription: 'sub_123',
        metadata: { billing_account_id: 'acct-1' },
        client_reference_id: 'acct-1',
        ...session,
      },
    },
  } as unknown as Stripe.CheckoutSessionCompletedEvent
}

function invoiceFailedEvent(): Stripe.InvoicePaymentFailedEvent {
  return {
    id: 'evt_invoice',
    type: 'invoice.payment_failed',
    created: 1_790_000_600,
    data: {
      object: {
        id: 'in_456',
        object: 'invoice',
        status: 'open',
        customer: 'cus_123',
        parent: {
          type: 'subscription_details',
          subscription_details: { subscription: 'sub_123', metadata: null },
        },
      },
    },
  } as unknown as Stripe.InvoicePaymentFailedEvent
}

function makeCtx(eventType: string): WebhookHandlerContext {
  const paymentContext = { eventId: 'evt_test', eventType }
  return {
    adminClient: {} as WebhookHandlerContext['adminClient'],
    paymentContext,
    updateContext: (updates) => {
      Object.assign(paymentContext, updates)
    },
  }
}

/** The account is found on the first lookup that applies. */
function accountFound(account: RawBillingAccount = rawAccount()) {
  findById.mockResolvedValue(ok(account))
  findBySubscription.mockResolvedValue(ok(account))
  findByCustomer.mockResolvedValue(ok(account))
  getBillingAccount.mockResolvedValue(ok(account))
}

beforeEach(() => {
  jest.clearAllMocks()
  findById.mockResolvedValue(ok(null))
  findBySubscription.mockResolvedValue(ok(null))
  findByCustomer.mockResolvedValue(ok(null))
  getBillingAccount.mockResolvedValue(ok(null))
  updateBillingAccount.mockImplementation(async (_client, id, patch) =>
    ok(rawAccount({ id, ...patch }))
  )
})

describe('platform billing webhook registry', () => {
  it('covers the six events the endpoint is subscribed to', () => {
    expect(getPlatformBillingEventTypes().sort()).toEqual(
      [
        'checkout.session.completed',
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.paid',
        'invoice.payment_failed',
      ].sort()
    )
  })
})

describe('replay handling', () => {
  it('acknowledges a replayed event without writing anything', async () => {
    accountFound()
    recordWebhookEvent.mockResolvedValue(err('duplicate'))

    const result = await billingSubscriptionUpdatedHandler.handle(
      subscriptionUpdatedEvent(1_790_000_100),
      makeCtx('customer.subscription.updated')
    )

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.data).toEqual({
        processed: false,
        details: { replay: true },
      })
    }
    expect(updateBillingAccount).not.toHaveBeenCalled()
  })

  it('fails with error severity when the event cannot be recorded', async () => {
    accountFound()
    recordWebhookEvent.mockResolvedValue(err({ message: 'connection refused' }))

    const result = await billingSubscriptionUpdatedHandler.handle(
      subscriptionUpdatedEvent(1_790_000_100),
      makeCtx('customer.subscription.updated')
    )

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.severity).toBe('error')
    expect(updateBillingAccount).not.toHaveBeenCalled()
  })
})

describe('customer.subscription.updated', () => {
  it('skips a stale event and records it as skipped_stale', async () => {
    accountFound(rawAccount({ last_event_created: 1_790_000_100 }))
    recordWebhookEvent.mockResolvedValue(ok(undefined))

    const event = subscriptionUpdatedEvent(1_790_000_000)
    const result = await billingSubscriptionUpdatedHandler.handle(
      event,
      makeCtx(event.type)
    )

    expect(recordWebhookEvent).toHaveBeenCalledWith(
      expect.anything(),
      event,
      'skipped_stale'
    )
    expect(updateBillingAccount).not.toHaveBeenCalled()
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.data.processed).toBe(false)
      expect(result.data.details).toEqual({ stale: true })
    }
  })

  it('applies a fresh event: claims it first, then writes the snapshot', async () => {
    accountFound(rawAccount({ last_event_created: 1_790_000_000 }))
    recordWebhookEvent.mockResolvedValue(ok(undefined))

    const event = subscriptionUpdatedEvent(1_790_000_100)
    const result = await billingSubscriptionUpdatedHandler.handle(
      event,
      makeCtx(event.type)
    )

    expect(recordWebhookEvent).toHaveBeenCalledWith(
      expect.anything(),
      event,
      'applied'
    )
    expect(updateBillingAccount).toHaveBeenCalledTimes(1)
    const patch = updateBillingAccount.mock.calls[0]![2]
    expect(patch).toMatchObject({
      status: 'past_due',
      stripe_subscription_id: 'sub_123',
      last_event_created: 1_790_000_100,
    })
    // The claim happened before the write.
    expect(recordWebhookEvent.mock.invocationCallOrder[0]).toBeLessThan(
      updateBillingAccount.mock.invocationCallOrder[0]!
    )
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.data).toMatchObject({
        processed: true,
        entityType: 'billing_account',
        entityId: 'acct-1',
      })
    }
  })

  it('releases the claim and asks for a retry when the write fails', async () => {
    accountFound()
    recordWebhookEvent.mockResolvedValue(ok(undefined))
    updateBillingAccount.mockResolvedValue(err('disk full'))
    jest
      .mocked(BillingRepository.releaseWebhookEvent)
      .mockResolvedValue(ok(undefined))

    const event = subscriptionUpdatedEvent(1_790_000_100)
    const result = await billingSubscriptionUpdatedHandler.handle(
      event,
      makeCtx(event.type)
    )

    expect(BillingRepository.releaseWebhookEvent).toHaveBeenCalledWith(
      expect.anything(),
      'evt_sub'
    )
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.severity).toBe('error')
      expect(result.error.code).toBe('BILLING_SYNC_FAILED')
    }
  })

  it('answers with a warning (200) when no account matches', async () => {
    recordWebhookEvent.mockResolvedValue(ok(undefined))
    // The single row already belongs to a different subscription.
    getBillingAccount.mockResolvedValue(
      ok(
        rawAccount({
          stripe_subscription_id: 'sub_other',
          stripe_customer_id: 'cus_other',
        })
      )
    )

    const event = subscriptionUpdatedEvent(1_790_000_100)
    const result = await billingSubscriptionUpdatedHandler.handle(
      event,
      makeCtx(event.type)
    )

    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe('BILLING_ACCOUNT_NOT_FOUND')
      expect(result.error.severity).toBe('warning')
    }
    expect(recordWebhookEvent).not.toHaveBeenCalled()
    expect(updateBillingAccount).not.toHaveBeenCalled()
  })

  it('falls back to the single never-subscribed row', async () => {
    recordWebhookEvent.mockResolvedValue(ok(undefined))
    getBillingAccount.mockResolvedValue(
      ok(
        rawAccount({
          stripe_subscription_id: null,
          stripe_customer_id: null,
          status: null,
          last_event_created: null,
        })
      )
    )

    const event = subscriptionUpdatedEvent(1_790_000_100)
    const result = await billingSubscriptionUpdatedHandler.handle(
      event,
      makeCtx(event.type)
    )

    expect(isOk(result)).toBe(true)
    expect(updateBillingAccount).toHaveBeenCalledWith(
      expect.anything(),
      'acct-1',
      expect.objectContaining({
        stripe_subscription_id: 'sub_123',
        stripe_customer_id: 'cus_123',
      })
    )
  })
})

describe('checkout.session.completed', () => {
  it('ignores a payment-mode session (a misrouted fee checkout)', async () => {
    recordWebhookEvent.mockResolvedValue(ok(undefined))

    const event = checkoutEvent({ mode: 'payment', payment_intent: 'pi_1' })
    const result = await billingCheckoutCompletedHandler.handle(
      event,
      makeCtx(event.type)
    )

    expect(recordWebhookEvent).toHaveBeenCalledWith(
      expect.anything(),
      event,
      'ignored'
    )
    expect(updateBillingAccount).not.toHaveBeenCalled()
    expect(getPlatformStripe).not.toHaveBeenCalled()
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.data.processed).toBe(false)
  })

  it('stores the customer and subscription, then syncs from Stripe', async () => {
    accountFound(
      rawAccount({
        stripe_subscription_id: null,
        status: null,
        last_event_created: null,
      })
    )
    recordWebhookEvent.mockResolvedValue(ok(undefined))
    const retrieve = jest
      .fn()
      .mockResolvedValue(subscription({ status: 'active' }))
    jest
      .mocked(getPlatformStripe)
      .mockReturnValue(ok({ subscriptions: { retrieve } } as unknown as Stripe))

    const event = checkoutEvent({ mode: 'subscription' })
    const result = await billingCheckoutCompletedHandler.handle(
      event,
      makeCtx(event.type)
    )

    expect(updateBillingAccount).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      'acct-1',
      { stripe_customer_id: 'cus_123', stripe_subscription_id: 'sub_123' }
    )
    expect(retrieve).toHaveBeenCalledWith('sub_123', {
      expand: ['latest_invoice'],
    })
    expect(updateBillingAccount).toHaveBeenCalledTimes(2)
    expect(updateBillingAccount.mock.calls[1]![2]).toMatchObject({
      status: 'active',
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.data).toMatchObject({
        processed: true,
        entityType: 'billing_account',
        entityId: 'acct-1',
      })
    }
  })

  it('releases the claim and retries when the Stripe read fails', async () => {
    accountFound(rawAccount({ stripe_subscription_id: null }))
    recordWebhookEvent.mockResolvedValue(ok(undefined))
    jest
      .mocked(BillingRepository.releaseWebhookEvent)
      .mockResolvedValue(ok(undefined))
    jest.mocked(getPlatformStripe).mockReturnValue(
      ok({
        subscriptions: {
          retrieve: jest.fn().mockRejectedValue(new Error('timeout')),
        },
      } as unknown as Stripe)
    )

    const event = checkoutEvent({ mode: 'subscription' })
    const result = await billingCheckoutCompletedHandler.handle(
      event,
      makeCtx(event.type)
    )

    expect(BillingRepository.releaseWebhookEvent).toHaveBeenCalledWith(
      expect.anything(),
      'evt_checkout'
    )
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.severity).toBe('error')
  })
})

describe('invoice.payment_failed', () => {
  it('records the invoice status and tolerates a failing Stripe read', async () => {
    accountFound()
    recordWebhookEvent.mockResolvedValue(ok(undefined))
    jest.mocked(getPlatformStripe).mockReturnValue(err('no key'))

    const event = invoiceFailedEvent()
    const result = await billingInvoicePaymentFailedHandler.handle(
      event,
      makeCtx(event.type)
    )

    expect(recordWebhookEvent).toHaveBeenCalledWith(
      expect.anything(),
      event,
      'applied'
    )
    expect(updateBillingAccount).toHaveBeenCalledTimes(1)
    expect(updateBillingAccount).toHaveBeenCalledWith(
      expect.anything(),
      'acct-1',
      { latest_invoice_id: 'in_456', latest_invoice_status: 'open' }
    )
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.data.processed).toBe(true)
      expect(result.data.details).toMatchObject({
        invoiceId: 'in_456',
        invoiceStatus: 'open',
        subscriptionRefreshed: false,
      })
    }
  })

  it('refreshes the subscription when Stripe answers', async () => {
    accountFound()
    recordWebhookEvent.mockResolvedValue(ok(undefined))
    jest.mocked(getPlatformStripe).mockReturnValue(
      ok({
        subscriptions: {
          retrieve: jest.fn().mockResolvedValue(subscription()),
        },
      } as unknown as Stripe)
    )

    const event = invoiceFailedEvent()
    const result = await billingInvoicePaymentFailedHandler.handle(
      event,
      makeCtx(event.type)
    )

    expect(updateBillingAccount).toHaveBeenCalledTimes(2)
    expect(updateBillingAccount.mock.calls[1]![2]).toMatchObject({
      status: 'past_due',
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.data.details).toMatchObject({ subscriptionRefreshed: true })
    }
  })
})
