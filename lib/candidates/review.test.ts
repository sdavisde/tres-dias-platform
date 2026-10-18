import type { HydratedCandidate } from '@/lib/candidates/types'
import {
  candidateDetailsPath,
  candidateSubline,
  matchesQueueFilter,
  matchesQueueSearch,
  primaryActionFor,
  queueSubtitle,
  resolveSelection,
  reviewQueuePath,
  sortQueue,
  spotsLeft,
  toReviewCandidate,
  type ReviewCandidate,
} from './review'

function hydrated(
  overrides: Partial<HydratedCandidate> = {}
): HydratedCandidate {
  return {
    id: 'c1',
    weekend_id: 'w1',
    status: 'pending_approval',
    created_at: '2026-08-12T15:00:00Z',
    updated_at: '2026-08-12T15:00:00Z',
    candidate_sponsorship_info: {
      id: 's1',
      candidate_id: 'c1',
      candidate_name: 'Robert Chen',
      candidate_email: 'robert@example.com',
      sponsor_name: 'Martha Hughes',
      sponsor_email: 'martha@example.com',
      sponsor_phone: null,
      sponsor_address: null,
      sponsor_church: 'Grace Fellowship',
      sponsor_weekend: 'DTTD #7',
      reunion_group: null,
      attends_secuela: null,
      contact_frequency: 'Weekly',
      church_environment: null,
      home_environment: null,
      social_environment: null,
      work_environment: null,
      god_evidence: null,
      support_plan: null,
      prayer_request: null,
      payment_owner: 'sponsor',
      created_at: '2026-08-12T15:00:00Z',
      updated_at: '2026-08-12T15:00:00Z',
    } as HydratedCandidate['candidate_sponsorship_info'],
    candidate_info: {
      id: 'i1',
      candidate_id: 'c1',
      first_name: 'Robert',
      last_name: 'Chen',
      email: 'rc@example.com',
      age: 41,
      city: 'Llano',
      church: 'Grace Fellowship Church',
      emergency_contact_name: 'Amy Chen',
      emergency_contact_phone: '555-0100',
      camp_waiver_signed_at: '2026-08-15T00:00:00Z',
      medical_conditions: 'Peanut allergy',
    } as HydratedCandidate['candidate_info'],
    payments: [
      { created_at: '2026-08-18T00:00:00Z' },
      { created_at: '2026-08-20T00:00:00Z' },
    ] as HydratedCandidate['payments'],
    paymentSummary: {
      totalPaid: 195,
      totalFee: 195,
      balance: 0,
      status: 'Paid',
    },
    ...overrides,
  }
}

function review(overrides: Partial<ReviewCandidate> = {}): ReviewCandidate {
  return {
    ...toReviewCandidate(hydrated(), { canViewMedical: false }),
    ...overrides,
  }
}

describe('paths', () => {
  it('builds queue and detail links that keep the weekend selection', () => {
    expect(reviewQueuePath('g12', 'MENS')).toBe(
      '/weekends/g12/mens/review-candidates'
    )
    expect(reviewQueuePath('g12', 'WOMENS', 'c1')).toBe(
      '/weekends/g12/womens/review-candidates?candidate=c1'
    )
    expect(candidateDetailsPath('g12', 'MENS', 'c1')).toBe(
      '/weekends/g12/mens/review-candidates/c1'
    )
  })
})

describe('toReviewCandidate', () => {
  it('prefers the name from the forms and keeps medical text only with access', () => {
    const withoutAccess = toReviewCandidate(hydrated(), {
      canViewMedical: false,
    })
    expect(withoutAccess.name).toBe('Robert Chen')
    expect(withoutAccess.info?.hasMedicalNotes).toBe(true)
    expect(withoutAccess.info).not.toHaveProperty('medicalNotes')
    expect(JSON.stringify(withoutAccess)).not.toContain('Peanut')

    const withAccess = toReviewCandidate(hydrated(), { canViewMedical: true })
    expect(withAccess.info?.medicalNotes).toBe('Peanut allergy')
  })

  it('falls back to the sponsor form name before the forms are in', () => {
    const candidate = toReviewCandidate(
      hydrated({ candidate_info: undefined, status: 'sponsored' }),
      { canViewMedical: true }
    )
    expect(candidate.name).toBe('Robert Chen')
    expect(candidate.info).toBeNull()
  })

  it('records the latest payment date and the emergency-contact flag', () => {
    const candidate = toReviewCandidate(hydrated(), { canViewMedical: false })
    expect(candidate.fee.lastPaidAt).toBe('2026-08-20T00:00:00Z')
    expect(candidate.info?.hasEmergencyContact).toBe(true)
    expect(candidate.sponsor.paymentOwner).toBe('sponsor')
  })
})

describe('queue filters and search', () => {
  it('shows decisions on Needs review, everyone active on All, rejected on Dropped', () => {
    expect(
      matchesQueueFilter({ status: 'pending_approval' }, 'needs-review')
    ).toBe(true)
    expect(matchesQueueFilter({ status: 'confirmed' }, 'needs-review')).toBe(
      false
    )
    expect(matchesQueueFilter({ status: 'confirmed' }, 'all')).toBe(true)
    expect(matchesQueueFilter({ status: 'rejected' }, 'all')).toBe(false)
    expect(matchesQueueFilter({ status: 'rejected' }, 'dropped')).toBe(true)
  })

  it('matches name, email or sponsor, ignoring case', () => {
    const candidate = review()
    expect(matchesQueueSearch(candidate, 'robert')).toBe(true)
    expect(matchesQueueSearch(candidate, 'MARTHA')).toBe(true)
    expect(matchesQueueSearch(candidate, 'rc@example')).toBe(true)
    expect(matchesQueueSearch(candidate, 'zzz')).toBe(false)
    expect(matchesQueueSearch(candidate, '  ')).toBe(true)
  })

  it('sorts decisions first, then workflow order, then name', () => {
    const sorted = sortQueue([
      review({ id: 'a', status: 'confirmed', name: 'Zed' }),
      review({ id: 'b', status: 'pending_approval', name: 'Mia' }),
      review({ id: 'c', status: 'pending_approval', name: 'Ann' }),
      review({ id: 'd', status: 'sponsored', name: 'Bo' }),
    ])
    expect(sorted.map((c) => c.id)).toEqual(['c', 'b', 'd', 'a'])
  })
})

describe('copy', () => {
  it('writes the queue subtitle from sponsor and progress', () => {
    expect(queueSubtitle(review())).toBe(
      'Sponsored by Martha Hughes · fee paid'
    )
    expect(
      queueSubtitle(
        review({
          fee: {
            status: 'Unpaid',
            totalPaid: 0,
            totalFee: 195,
            balance: 195,
            lastPaidAt: null,
          },
        })
      )
    ).toBe('Sponsored by Martha Hughes · forms complete')
    expect(
      queueSubtitle(
        review({
          status: 'awaiting_payment',
          fee: {
            status: 'Unpaid',
            totalPaid: 0,
            totalFee: 195,
            balance: 195,
            lastPaidAt: null,
          },
        })
      )
    ).toBe('Sponsored by Martha Hughes · fee still pending')
    expect(
      queueSubtitle(
        review({
          info: null,
          sponsor: { ...review().sponsor, name: null },
          fee: {
            status: 'Unpaid',
            totalPaid: 0,
            totalFee: 195,
            balance: 195,
            lastPaidAt: null,
          },
        })
      )
    ).toBe('No sponsor on file · forms not yet in')
  })

  it('builds the detail subline from what is known', () => {
    expect(candidateSubline(review())).toBe(
      'Age 41 · Llano · Grace Fellowship Church'
    )
    expect(
      candidateSubline(
        review({ info: { ...review().info!, age: null, church: null } })
      )
    ).toBe('Llano')
    expect(candidateSubline(review({ info: null }))).toBeNull()
  })
})

describe('primaryActionFor', () => {
  it('maps every status to the footer action', () => {
    expect(primaryActionFor('sponsored', "Men's #12")).toEqual({
      kind: 'send-forms',
      label: 'Send forms',
    })
    expect(primaryActionFor('awaiting_forms', "Men's #12")).toEqual({
      kind: 'send-forms',
      label: 'Resend forms',
    })
    expect(primaryActionFor('pending_approval', "Men's #12")).toEqual({
      kind: 'approve',
      label: "Approve for Men's #12",
      resend: false,
    })
    expect(primaryActionFor('awaiting_payment', "Men's #12")).toEqual({
      kind: 'approve',
      label: 'Resend payment request',
      resend: true,
    })
    expect(primaryActionFor('confirmed', "Men's #12").kind).toBe('none')
    expect(primaryActionFor('rejected', "Men's #12").kind).toBe('none')
  })
})

describe('spotsLeft and resolveSelection', () => {
  it('counts everyone who is not dropped against capacity', () => {
    expect(
      spotsLeft([
        { status: 'confirmed' },
        { status: 'sponsored' },
        { status: 'rejected' },
      ])
    ).toBe(40)
    expect(spotsLeft(Array(50).fill({ status: 'confirmed' }))).toBe(0)
  })

  it('keeps a valid requested id, otherwise picks the first row in the chip', () => {
    const rows = [
      { id: 'a', status: 'confirmed' as const },
      { id: 'b', status: 'pending_approval' as const },
    ]
    expect(resolveSelection(rows, 'a', 'needs-review')).toBe('a')
    expect(resolveSelection(rows, 'nope', 'needs-review')).toBe('b')
    expect(resolveSelection(rows, null, 'dropped')).toBeNull()
  })
})
