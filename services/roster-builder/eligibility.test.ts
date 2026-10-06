import { CHARole } from '@/lib/weekend/types'
import { computeEligibility } from './eligibility'

const experienced = {
  hasBeenSectionHead: true,
  hasGivenRollo: true,
  rectorReadyIsReady: true,
  isClergy: false,
}

describe('computeEligibility', () => {
  describe('given an experienced lay member', () => {
    const eligibility = computeEligibility(experienced)

    it('is eligible for head and table leader roles', () => {
      expect(eligibility[CHARole.HEAD].eligible).toBe(true)
      expect(eligibility[CHARole.ASSISTANT_HEAD].eligible).toBe(true)
      expect(eligibility[CHARole.HEAD_DINING].eligible).toBe(true)
      expect(eligibility[CHARole.TABLE_LEADER].eligible).toBe(true)
    })
  })

  describe('given an experienced clergy member', () => {
    const eligibility = computeEligibility({ ...experienced, isClergy: true })

    it.each([
      CHARole.HEAD,
      CHARole.ASSISTANT_HEAD,
      CHARole.HEAD_ROLLISTA,
      CHARole.HEAD_TABLE,
      CHARole.HEAD_DINING,
      CHARole.TABLE_LEADER,
    ])('is not eligible for %s', (role) => {
      expect(eligibility[role]).toEqual({
        eligible: false,
        reason: 'Clergy cannot serve in this role',
      })
    })

    it('has no restriction on spiritual director roles', () => {
      expect(eligibility[CHARole.HEAD_SPIRITUAL_DIRECTOR]).toBeUndefined()
      expect(eligibility[CHARole.SPIRITUAL_DIRECTOR]).toBeUndefined()
    })

    it('keeps the rover rule', () => {
      expect(eligibility[CHARole.ROVER].eligible).toBe(true)
    })
  })

  describe('given a lay member without section head experience', () => {
    const eligibility = computeEligibility({
      ...experienced,
      hasBeenSectionHead: false,
    })

    it('still reports the experience requirement for Head', () => {
      expect(eligibility[CHARole.HEAD]).toEqual({
        eligible: false,
        reason: 'Needs section head experience',
      })
    })
  })
})
