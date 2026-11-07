import { CHARole } from '@/lib/weekend/types'
import type { UserExperience } from './validation'
import {
  calculateRectorReadyStatus,
  countDistinctWeekends,
} from './calculations'

const rec = (
  cha_role: CHARole,
  weekend_reference: string,
  weekend_id: string | null = null
): UserExperience => ({
  id: weekend_reference + cha_role,
  user_id: 'u',
  weekend_id,
  cha_role,
  weekend_reference,
  rollo: null,
  created_at: new Date(),
  updated_at: new Date(),
})

describe('rector-ready rules', () => {
  it('does not count Head Spiritual Director as a team head', () => {
    const { criteria } = calculateRectorReadyStatus([
      rec(CHARole.HEAD_SPIRITUAL_DIRECTOR, 'DTTD#10'),
      rec(CHARole.HEAD_MUSIC, 'CTD#3'),
    ])
    expect(criteria.hasServedTeamHead).toBe(false)
  })

  it('counts one weekend group once across its two weekends', () => {
    expect(
      countDistinctWeekends([
        rec(CHARole.MUSIC, 'DTTD#10', 'mens-id'),
        rec(CHARole.MUSIC, 'DTTD#10', 'womens-id'),
        rec(CHARole.MUSIC, 'DTTD#11', null),
      ])
    ).toBe(2)
  })
})
