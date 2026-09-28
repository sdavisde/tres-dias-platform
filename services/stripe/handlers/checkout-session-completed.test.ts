import type Stripe from 'stripe'
import { err, isErr, isOk, ok } from '@/lib/results'
import type { WebhookHandlerContext } from './types'

// `server-only` is provided by Next's bundler, not an installed package.
jest.mock('server-only', () => ({}), { virtual: true })

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

// The real module pulls in Sentry and the Supabase server client.
jest.mock('../webhook-context', () => {
  const { err: makeErr } = jest.requireActual('@/lib/results')
  return {
    webhookErr: (
      code: string,
      message: string,
      stage: string,
      severity: string,
      context: unknown
    ) => makeErr({ code, message, stage, severity, context }),
  }
})

jest.mock('@/services/payment/payment-service', () => ({
  findPaymentByIntentId: jest.fn(),
  recordPayment: jest.fn(),
}))

jest.mock('@/services/weekend-group-member/repository', () => ({
  getGroupMemberById: jest.fn(),
}))

jest.mock('../stripe-service', () => ({
  getTransactionData: jest.fn(),
}))

jest.mock('@/services/notifications/notification-service', () => ({
  notifyAssistantHeadForTeamPayment: jest.fn(),
  notifyCandidatePaymentReceivedAdmin: jest.fn(),
}))

import * as PaymentService from '@/services/payment/payment-service'
import { getGroupMemberById } from '@/services/weekend-group-member/repository'
import { getTransactionData } from '../stripe-service'
import { notifyAssistantHeadForTeamPayment } from '@/services/notifications/notification-service'
import { checkoutSessionCompletedHandler } from './checkout-session-completed'

const findPaymentByIntentId = jest.mocked(PaymentService.findPaymentByIntentId)
const recordPayment = jest.mocked(PaymentService.recordPayment)

function teamEvent(): Stripe.CheckoutSessionCompletedEvent {
  return {
    id: 'evt_test',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test',
        payment_intent: 'pi_test',
        amount_total: 21000,
        metadata: {
          fee_type: 'team',
          weekend_group_id: 'group-1',
          payment_owner: 'Terry Team',
          group_member_id: 'gm-1',
          user_id: 'user-1',
          user_email: 'terry@example.com',
        },
      },
    },
  } as unknown as Stripe.CheckoutSessionCompletedEvent
}

function makeCtx(): WebhookHandlerContext {
  const paymentContext = {
    eventId: 'evt_test',
    eventType: 'checkout.session.completed',
  }
  return {
    adminClient: {} as WebhookHandlerContext['adminClient'],
    paymentContext,
    updateContext: (updates) => {
      Object.assign(paymentContext, updates)
    },
  }
}

describe('checkoutSessionCompletedHandler replay handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('ignores a replay whose payment intent is already recorded', async () => {
    findPaymentByIntentId.mockResolvedValue(ok({ id: 'pay-1' } as never))

    const result = await checkoutSessionCompletedHandler.handle(
      teamEvent(),
      makeCtx()
    )

    expect(findPaymentByIntentId).toHaveBeenCalledWith('pi_test', {
      dangerouslyBypassRLS: true,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.data).toEqual({
        processed: false,
        entityType: 'team_payment',
        entityId: 'pay-1',
      })
    }
    expect(recordPayment).not.toHaveBeenCalled()
    expect(getGroupMemberById).not.toHaveBeenCalled()
  })

  it('fails with an error severity when the lookup fails, recording nothing', async () => {
    findPaymentByIntentId.mockResolvedValue(err('connection refused'))

    const result = await checkoutSessionCompletedHandler.handle(
      teamEvent(),
      makeCtx()
    )

    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.severity).toBe('error')
    }
    expect(recordPayment).not.toHaveBeenCalled()
  })

  it('records the payment on first delivery', async () => {
    findPaymentByIntentId.mockResolvedValue(ok(null))
    jest
      .mocked(getGroupMemberById)
      .mockResolvedValue(
        ok({ id: 'gm-1', user_id: 'user-1', weekendId: 'weekend-1' } as never)
      )
    jest.mocked(getTransactionData).mockResolvedValue(err('not yet'))
    recordPayment.mockResolvedValue(ok({ id: 'pay-new' } as never))
    jest
      .mocked(notifyAssistantHeadForTeamPayment)
      .mockResolvedValue(ok(undefined) as never)

    const result = await checkoutSessionCompletedHandler.handle(
      teamEvent(),
      makeCtx()
    )

    expect(recordPayment).toHaveBeenCalledTimes(1)
    expect(recordPayment.mock.calls[0]![0]).toMatchObject({
      target_type: 'weekend_group_member',
      target_id: 'gm-1',
      payment_intent_id: 'pi_test',
      gross_amount: 210,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.data.processed).toBe(true)
      expect(result.data.entityId).toBe('pay-new')
    }
  })
})
