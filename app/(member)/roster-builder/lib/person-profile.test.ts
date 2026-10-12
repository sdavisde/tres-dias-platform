import { CHARole } from '@/lib/weekend/types'
import { countRollosGiven, orderServiceHistory } from './person-profile'

const record = (
  weekend_reference: string,
  cha_role: string,
  rollo: string | null = null
) => ({ weekend_reference, cha_role, rollo })

describe('orderServiceHistory', () => {
  it('puts DTTD first, newest first, then other communities, then unparsed', () => {
    const ordered = orderServiceHistory([
      record('CTD#12', CHARole.CHAPEL),
      record('DTTD#8', CHARole.DINING),
      record('Some weekend', CHARole.DINING),
      record('DTTD#11', CHARole.HEAD),
      record('ATD#3', CHARole.DINING),
    ])
    expect(ordered.map((e) => e.weekendLabel)).toEqual([
      'DTTD #11',
      'DTTD #8',
      'ATD #3',
      'CTD #12',
      'Some weekend',
    ])
  })

  it('marks lay leadership but not the Head Spiritual Director', () => {
    const ordered = orderServiceHistory([
      record('DTTD#3', CHARole.HEAD_DINING),
      record('DTTD#2', CHARole.HEAD_SPIRITUAL_DIRECTOR),
      record('DTTD#1', CHARole.DINING),
    ])
    expect(ordered.map((e) => e.isLayLeadership)).toEqual([true, false, false])
  })
})

describe('countRollosGiven', () => {
  it('counts records with a rollo', () => {
    expect(
      countRollosGiven([
        record('DTTD#1', CHARole.TABLE_LEADER, 'Piety'),
        record('DTTD#2', CHARole.DINING),
      ])
    ).toBe(1)
  })
})
