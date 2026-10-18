import { err, isOk, ok } from '@/lib/results'

// `server-only` is provided by Next's bundler, not an installed package.
jest.mock('server-only', () => ({}), { virtual: true })

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

jest.mock('./repository', () => ({
  getDepositByPayoutId: jest.fn(),
  createDeposit: jest.fn(),
  linkPaymentToDeposit: jest.fn(),
  getDepositById: jest.fn(),
}))

jest.mock('@/services/payment/repository', () => ({
  getPaymentByPaymentIntentId: jest.fn(),
}))

import * as DepositRepository from './repository'
import * as PaymentRepository from '@/services/payment/repository'
import { recordStripePayoutDeposit } from './deposit-service'

const deposit = {
  id: 'dep-1',
  deposit_type: 'stripe_payout',
  amount: 420,
  status: 'paid',
  arrival_date: null,
  transaction_count: 2,
  payout_id: 'po_test',
  notes: null,
  created_at: '2026-10-18T00:00:00.000Z',
}

describe('recordStripePayoutDeposit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest
      .mocked(PaymentRepository.getPaymentByPaymentIntentId)
      .mockImplementation(async (id) => ok({ id: `pay-${id}` } as never))
    jest
      .mocked(DepositRepository.linkPaymentToDeposit)
      .mockResolvedValue(ok({} as never))
    jest.mocked(DepositRepository.getDepositById).mockResolvedValue(err('skip'))
  })

  it('reuses the deposit from an earlier delivery and links every payment', async () => {
    jest
      .mocked(DepositRepository.getDepositByPayoutId)
      .mockResolvedValue(ok(deposit as never))

    const result = await recordStripePayoutDeposit(
      {
        payout_id: 'po_test',
        amount: 420,
        status: 'paid',
        payment_intent_ids: ['pi_a', 'pi_b'],
      },
      { dangerouslyBypassRLS: true }
    )

    expect(isOk(result)).toBe(true)
    expect(DepositRepository.createDeposit).not.toHaveBeenCalled()
    expect(DepositRepository.linkPaymentToDeposit).toHaveBeenCalledTimes(2)
    expect(
      jest.mocked(DepositRepository.linkPaymentToDeposit).mock.calls[1]![1]
    ).toBe('pay-pi_b')
  })
})
