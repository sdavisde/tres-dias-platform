import { CHARole, Rollo } from '@/lib/weekend/types'
import type { UserExperience } from './validation'
import { calculateRectorGap } from './rector-selection'

let seq = 0
const rec = (
  cha_role: CHARole,
  weekend_reference = 'DTTD#10',
  rollo: string | null = null
): UserExperience => ({
  id: `id-${seq++}`,
  user_id: 'u',
  weekend_id: null,
  cha_role,
  weekend_reference,
  rollo,
  created_at: new Date(),
  updated_at: new Date(),
})

describe('calculateRectorGap', () => {
  it('is zero weekends away when ready', () => {
    const gap = calculateRectorGap([
      rec(CHARole.ASSISTANT_HEAD, 'DTTD#9'),
      rec(CHARole.HEAD_CHAPEL, 'DTTD#10', Rollo.IDEALS),
      rec(CHARole.DINING, 'DTTD#11', Rollo.STUDY),
    ])
    expect(gap).toMatchObject({ missing: [], weekendsAway: 0, rollosGiven: 2 })
  })

  it('suggests the head of the most-served section', () => {
    const gap = calculateRectorGap([
      rec(CHARole.ASSISTANT_HEAD, 'DTTD#9'),
      rec(CHARole.CHAPEL, 'DTTD#10', Rollo.IDEALS),
      rec(CHARole.CHAPEL, 'DTTD#11', Rollo.STUDY),
      rec(CHARole.DINING, 'DTTD#8'),
    ])
    expect(gap).toMatchObject({
      missing: ['teamHead'],
      weekendsAway: 1,
      finishingRole: 'Head Chapel',
      finishingNote: 'served Chapel ×2',
    })
  })

  it('lets Head Dining cover section head and Dining in one weekend', () => {
    const gap = calculateRectorGap([
      rec(CHARole.ASSISTANT_HEAD, 'DTTD#9', Rollo.IDEALS),
      rec(CHARole.TABLE_LEADER, 'DTTD#10', Rollo.STUDY),
    ])
    expect(gap).toMatchObject({
      missing: ['teamHead', 'dining'],
      weekendsAway: 1,
      finishingRole: 'Head Dining',
      finishingNote: 'covers both',
    })
  })

  it('counts a missing rollo as its own weekend after a head role', () => {
    const gap = calculateRectorGap([
      rec(CHARole.HEAD_CHAPEL, 'DTTD#9'),
      rec(CHARole.DINING, 'DTTD#10'),
      rec(CHARole.TABLE_LEADER, 'DTTD#11', Rollo.STUDY),
    ])
    expect(gap).toMatchObject({
      missing: ['head', 'rollos'],
      weekendsAway: 2,
      finishingRole: null,
      narrative: 'Assistant Head, then a rollo as Table Leader',
    })
  })

  it('needs a weekend per missing rollo', () => {
    const gap = calculateRectorGap([
      rec(CHARole.ASSISTANT_HEAD, 'DTTD#9'),
      rec(CHARole.HEAD_DINING, 'DTTD#10'),
    ])
    expect(gap).toMatchObject({
      missing: ['rollos'],
      weekendsAway: 2,
      finishingRole: null,
      narrative: 'Two rollos as Table Leader',
    })
  })

  it('finishes with one rollo as Table Leader', () => {
    const gap = calculateRectorGap([
      rec(CHARole.ASSISTANT_HEAD, 'DTTD#9'),
      rec(CHARole.HEAD_DINING, 'DTTD#10', Rollo.IDEALS),
    ])
    expect(gap).toMatchObject({
      weekendsAway: 1,
      finishingRole: 'A rollo',
      finishingNote: 'as Table Leader',
    })
  })

  it('lists roles before rollos on a long path', () => {
    const gap = calculateRectorGap([
      rec(CHARole.DINING, 'DTTD#9'),
      rec(CHARole.TABLE_LEADER, 'DTTD#10', Rollo.IDEALS),
    ])
    expect(gap.weekendsAway).toBe(3)
    expect(gap.narrative).toMatch(
      /^Assistant Head, then .+, then a rollo as Table Leader$/
    )
  })

  it('ignores other communities and repeat rollo rows on one weekend', () => {
    const gap = calculateRectorGap([
      rec(CHARole.HEAD, 'CTD#4'),
      rec(CHARole.TABLE_LEADER, 'DTTD#10', Rollo.IDEALS),
      rec(CHARole.TABLE_LEADER, 'DTTD#10', Rollo.IDEALS),
    ])
    expect(gap.rollosGiven).toBe(1)
    expect(gap.missing).toEqual(['head', 'teamHead', 'rollos', 'dining'])
  })
})
