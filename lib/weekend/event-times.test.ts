import {
  formatEventWhen,
  fromCommunityParts,
  toCommunityParts,
} from './event-times'

describe('community time parts', () => {
  it('round-trips a Central time', () => {
    const iso = fromCommunityParts('2026-12-03', '19:00')
    expect(iso).toBe('2026-12-04T01:00:00.000Z')
    expect(toCommunityParts(iso)).toEqual({ date: '2026-12-03', time: '19:00' })
  })
})

describe('formatEventWhen', () => {
  it('shows a start time on its own', () => {
    expect(formatEventWhen('2026-12-06T01:00:00.000Z', null)).toBe(
      'Sat, Dec 5 · 7:00 PM'
    )
  })

  it('shows a same-day range', () => {
    expect(
      formatEventWhen('2026-12-04T01:00:00.000Z', '2026-12-04T02:00:00.000Z')
    ).toBe('Thu, Dec 3 · 7:00 PM–8:00 PM')
  })

  it('shows a multi-day range with the end day', () => {
    expect(
      formatEventWhen('2026-12-04T01:00:00.000Z', '2026-12-06T23:00:00.000Z')
    ).toBe('Thu, Dec 3 7:00 PM → Sun 5:00 PM')
  })
})
