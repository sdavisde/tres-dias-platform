import {
  buildCheckoutMetadata,
  CHECKOUT_METADATA_KEYS,
} from './checkout-metadata'
import { checkoutFeeTypeFromMetadata } from './checkout-price'

const candidateQuote = {
  payerName: 'Sam Sponsor',
  groupId: 'group-1',
  userId: null,
}

const teamQuote = {
  payerName: 'Terry Team',
  groupId: 'group-1',
  userId: 'user-1',
}

function expectAllStrings(metadata: Record<string, string>) {
  for (const value of Object.values(metadata)) {
    expect(typeof value).toBe('string')
  }
}

describe('buildCheckoutMetadata', () => {
  it('sends exactly the candidate keys, all strings', () => {
    const metadata = buildCheckoutMetadata(
      { kind: 'candidate', candidateId: 'cand-1' },
      candidateQuote
    )

    expect(Object.keys(metadata).sort()).toEqual(
      [...CHECKOUT_METADATA_KEYS.candidate].sort()
    )
    expectAllStrings(metadata)
    expect(metadata).toEqual({
      fee_type: 'candidate',
      weekend_group_id: 'group-1',
      payment_owner: 'Sam Sponsor',
      candidateId: 'cand-1',
    })
  })

  it('sends exactly the team keys, all strings', () => {
    const metadata = buildCheckoutMetadata(
      { kind: 'team', groupMemberId: 'gm-1' },
      teamQuote,
      { userEmail: 'terry@example.com' }
    )

    expect(Object.keys(metadata).sort()).toEqual(
      [...CHECKOUT_METADATA_KEYS.team].sort()
    )
    expectAllStrings(metadata)
    expect(metadata).toEqual({
      fee_type: 'team',
      weekend_group_id: 'group-1',
      payment_owner: 'Terry Team',
      group_member_id: 'gm-1',
      user_id: 'user-1',
      user_email: 'terry@example.com',
    })
  })

  it('turns a missing group, user or email into empty strings, keeping the keys', () => {
    const metadata = buildCheckoutMetadata(
      { kind: 'team', groupMemberId: 'gm-1' },
      { payerName: 'Terry Team', groupId: null, userId: null }
    )

    expect(Object.keys(metadata).sort()).toEqual(
      [...CHECKOUT_METADATA_KEYS.team].sort()
    )
    expectAllStrings(metadata)
    expect(metadata.weekend_group_id).toBe('')
    expect(metadata.user_id).toBe('')
    expect(metadata.user_email).toBe('')
  })

  it('round-trips the fee type through checkoutFeeTypeFromMetadata', () => {
    expect(
      checkoutFeeTypeFromMetadata(
        buildCheckoutMetadata(
          { kind: 'candidate', candidateId: 'cand-1' },
          candidateQuote
        )
      )
    ).toBe('candidate')
    expect(
      checkoutFeeTypeFromMetadata(
        buildCheckoutMetadata(
          { kind: 'team', groupMemberId: 'gm-1' },
          teamQuote
        )
      )
    ).toBe('team')
  })
})
