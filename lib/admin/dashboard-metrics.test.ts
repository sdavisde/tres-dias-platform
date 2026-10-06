import {
  deriveActionItems,
  deriveCollectedThisYear,
  deriveOutstanding,
  hasActiveWeekendGroup,
  needsPlanning,
} from './dashboard-metrics'
import type { OutstandingFee } from '@/lib/payments/outstanding'
import {
  buildFeeAccounts,
  deriveFeeBalances,
} from '@/lib/payments/fee-balances'
import type { PaymentTransactionDTO } from '@/services/payment'
import type { Weekend, WeekendGroupWithId } from '@/lib/weekend/types'

const NOW = new Date('2026-09-03T12:00:00Z')

function payment(
  overrides: Partial<PaymentTransactionDTO> = {}
): PaymentTransactionDTO {
  return {
    id: 'p1',
    type: 'candidate_fee',
    target_type: 'candidate',
    target_id: 'c1',
    weekend_id: null,
    payment_intent_id: null,
    gross_amount: 195,
    net_amount: null,
    stripe_fee: null,
    payment_method: 'cash',
    payment_owner: null,
    notes: null,
    charge_id: null,
    balance_transaction_id: null,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: null,
    voided_at: null,
    void_reason: null,
    target_name: null,
    target_email: null,
    weekend_number: 12,
    weekend_type: 'MENS',
    ...overrides,
  } as PaymentTransactionDTO
}

function openFee(overrides: Partial<OutstandingFee> = {}): OutstandingFee {
  return {
    targetType: 'candidate',
    targetId: 'c1',
    legacyTargetIds: [],
    name: 'Luis Moreno',
    expectedPayer: 'Tom Bailey',
    chaRole: null,
    weekendId: 'w1',
    weekendNumber: 12,
    weekendType: 'MENS',
    feeAmount: 185,
    coveredSoFar: 0,
    amountDue: 185,
    ...overrides,
  }
}

function weekend(overrides: Partial<Weekend> = {}): Weekend {
  return {
    id: 'w1',
    start_date: '2026-10-16',
    end_date: '2026-10-19',
    number: 12,
    status: 'ACTIVE',
    title: null,
    type: 'MENS',
    groupId: 'g1',
    ...overrides,
  }
}

function group(
  mens: Partial<Weekend>,
  womens: Partial<Weekend>
): WeekendGroupWithId {
  return {
    groupId: 'g1',
    weekends: {
      MENS: weekend({ type: 'MENS', ...mens }),
      WOMENS: weekend({ id: 'w2', type: 'WOMENS', ...womens }),
    },
  }
}

describe('deriveCollectedThisYear', () => {
  it('sums gross and counts only current-year, non-voided payments', () => {
    const result = deriveCollectedThisYear(
      [
        payment({ gross_amount: 195, created_at: '2026-02-01T00:00:00Z' }),
        payment({ gross_amount: 205, created_at: '2026-08-30T00:00:00Z' }),
        payment({ gross_amount: 185, created_at: '2025-11-01T00:00:00Z' }),
        payment({
          gross_amount: 195,
          created_at: '2026-03-01T00:00:00Z',
          voided_at: '2026-03-02T00:00:00Z',
        }),
      ],
      NOW
    )
    expect(result).toEqual({ year: 2026, total: 400, count: 2 })
  })

  it('returns zeros for an empty list', () => {
    expect(deriveCollectedThisYear([], NOW)).toEqual({
      year: 2026,
      total: 0,
      count: 0,
    })
  })
})

describe('deriveOutstanding', () => {
  it('sums what each person still owes and counts them', () => {
    expect(
      deriveOutstanding([
        openFee({ amountDue: 185 }),
        openFee({ targetId: 'c2', amountDue: 85 }),
        openFee({ targetId: 'm1', amountDue: 100 }),
      ])
    ).toEqual({ total: 370, openFeeCount: 3 })
  })

  it('is zero when nobody owes anything', () => {
    expect(deriveOutstanding([])).toEqual({ total: 0, openFeeCount: 0 })
  })

  it('agrees with the fee balances the payments page lists', () => {
    // One roster member in a group charging $200, nobody paid.
    const { outstanding } = deriveFeeBalances(
      buildFeeAccounts({
        groups: [
          {
            groupId: 'g12',
            groupNumber: 12,
            fees: { teamFee: 200, candidateFee: 200, onlineSurcharge: 10 },
          },
        ],
        weekends: [{ id: 'ww', groupId: 'g12', number: 12, type: 'WOMENS' }],
        rosterRows: [
          {
            id: 'roster-1',
            weekendId: 'ww',
            userId: 'user-1',
            chaRole: 'Rover',
            status: null,
            name: 'Ann Simmons',
          },
        ],
        candidates: [],
        groupMembers: [{ id: 'member-1', groupId: 'g12', userId: 'user-1' }],
        payments: [],
      })
    )
    expect(deriveOutstanding(outstanding)).toEqual({
      total: 200,
      openFeeCount: 1,
    })
  })

  it('never lets one overpayment hide another person’s unpaid fee', () => {
    // The pooled expected-minus-received figure this replaced would read $0
    // here; the person who still owes $185 is what the board needs to see.
    expect(deriveOutstanding([openFee({ amountDue: 185 })])).toEqual({
      total: 185,
      openFeeCount: 1,
    })
  })
})

describe('hasActiveWeekendGroup', () => {
  it('is true when either weekend in a group is ACTIVE', () => {
    expect(
      hasActiveWeekendGroup([
        group({ status: 'FINISHED' }, { status: 'ACTIVE' }),
      ])
    ).toBe(true)
  })

  it('is false when every group is planning or finished', () => {
    expect(
      hasActiveWeekendGroup([
        group({ status: 'FINISHED' }, { status: 'FINISHED' }),
        group({ status: 'PLANNING' }, { status: 'PLANNING' }),
      ])
    ).toBe(false)
  })

  it('is false with no groups at all', () => {
    expect(hasActiveWeekendGroup([])).toBe(false)
  })
})

describe('needsPlanning', () => {
  it('is false while a weekend is still ahead', () => {
    expect(
      needsPlanning(
        [group({ start_date: '2026-10-16' }, { start_date: '2026-10-23' })],
        NOW
      )
    ).toBe(false)
  })

  it('is false while a group is in PLANNING even without future dates', () => {
    expect(
      needsPlanning(
        [
          group(
            { status: 'PLANNING', start_date: '2026-01-01' },
            { status: 'PLANNING', start_date: '2026-01-08' }
          ),
        ],
        NOW
      )
    ).toBe(false)
  })

  it('is true when every weekend is finished or in the past', () => {
    expect(
      needsPlanning(
        [
          group(
            { status: 'FINISHED', start_date: '2026-04-16' },
            { status: 'FINISHED', start_date: '2026-04-23' }
          ),
        ],
        NOW
      )
    ).toBe(true)
  })

  it('is true with no groups at all', () => {
    expect(needsPlanning([], NOW)).toBe(true)
  })
})

describe('deriveActionItems', () => {
  // Inside the one-month window before the Men's weekend (NOW is 2026-09-03).
  const SOON = '2026-09-20'
  const pastGroups = [
    group(
      { status: 'FINISHED', start_date: '2026-04-16' },
      { status: 'FINISHED', start_date: '2026-04-23' }
    ),
  ]

  it('lists open fees, the secuela, and start-planning when all apply', () => {
    const items = deriveActionItems({
      outstanding: { total: 925, openFeeCount: 5 },
      weekendGroups: pastGroups,
      activeGroupSecuela: {
        groupNumber: 12,
        isScheduled: false,
        mensStartDate: SOON,
      },
      now: NOW,
    })
    expect(items).toEqual([
      {
        key: 'open-fees',
        openFeeCount: 5,
        outstandingTotal: 925,
        href: '/admin/payments?status=outstanding',
      },
      { key: 'schedule-secuela', groupNumber: 12, href: '/admin/secuela' },
      { key: 'start-planning', href: '/admin/weekends' },
    ])
  })

  it('points open fees at the outstanding filter on the payments ledger', () => {
    const [item] = deriveActionItems({
      outstanding: { total: 925, openFeeCount: 5 },
      weekendGroups: null,
      now: NOW,
    })
    expect(item.href).toBe('/admin/payments?status=outstanding')
  })

  it('is empty when fees are settled and a weekend is scheduled', () => {
    expect(
      deriveActionItems({
        outstanding: { total: 0, openFeeCount: 0 },
        weekendGroups: [
          group({ start_date: '2026-10-16' }, { start_date: '2026-10-23' }),
        ],
        now: NOW,
      })
    ).toEqual([])
  })

  it('contributes no item from a failed source', () => {
    expect(
      deriveActionItems({
        outstanding: null,
        weekendGroups: null,
        now: NOW,
      })
    ).toEqual([])
  })

  it('asks for a secuela date when the active group has none', () => {
    expect(
      deriveActionItems({
        outstanding: null,
        weekendGroups: null,
        activeGroupSecuela: {
          groupNumber: 12,
          isScheduled: false,
          mensStartDate: SOON,
        },
        now: NOW,
      })
    ).toEqual([
      { key: 'schedule-secuela', groupNumber: 12, href: '/admin/secuela' },
    ])
  })

  it('stays quiet once the secuela is on the calendar', () => {
    expect(
      deriveActionItems({
        outstanding: null,
        weekendGroups: null,
        activeGroupSecuela: {
          groupNumber: 12,
          isScheduled: true,
          mensStartDate: SOON,
        },
        now: NOW,
      })
    ).toEqual([])
  })

  it('stays quiet when the secuela lookup failed or no group is active', () => {
    expect(
      deriveActionItems({
        outstanding: null,
        weekendGroups: null,
        activeGroupSecuela: null,
        now: NOW,
      })
    ).toEqual([])
  })

  it("waits to ask for a secuela until a month before the Men's weekend", () => {
    const secuelaItems = (mensStartDate: string | null, now: Date) =>
      deriveActionItems({
        outstanding: null,
        weekendGroups: null,
        activeGroupSecuela: {
          groupNumber: 12,
          isScheduled: false,
          mensStartDate,
        },
        now,
      })
    // More than a month out: quiet.
    expect(secuelaItems('2026-10-16', NOW)).toEqual([])
    // Exactly a month out: due.
    expect(
      secuelaItems('2026-10-16', new Date('2026-09-16T00:00:00Z'))
    ).toHaveLength(1)
    // The weekend has already started: still due.
    expect(secuelaItems('2026-08-20', NOW)).toHaveLength(1)
    // Unknown start date: can't claim it's due.
    expect(secuelaItems(null, NOW)).toEqual([])
    expect(secuelaItems('', NOW)).toEqual([])
  })

  it('names the group even when its DTTD number is unknown', () => {
    expect(
      deriveActionItems({
        outstanding: null,
        weekendGroups: null,
        activeGroupSecuela: {
          groupNumber: null,
          isScheduled: false,
          mensStartDate: SOON,
        },
        now: NOW,
      })
    ).toEqual([
      { key: 'schedule-secuela', groupNumber: null, href: '/admin/secuela' },
    ])
  })
})
