import {
  buildStandardWeekendEvents,
  standardEventTitle,
  STANDARD_WEEKEND_EVENTS,
} from './standard-events'
import { WeekendType } from './types'

describe('buildStandardWeekendEvents', () => {
  // Thursday Dec 3, 2026 — Central Standard Time (UTC-6)
  const events = buildStandardWeekendEvents(
    {
      id: 'mens-id',
      type: WeekendType.MENS,
      startDate: '2026-12-03',
      groupId: 'group-id',
    },
    13
  )

  it('creates one event per standard type, in order', () => {
    expect(events.map((e) => e.type)).toEqual(
      STANDARD_WEEKEND_EVENTS.map((s) => s.type)
    )
    expect(events.every((e) => e.weekendId === 'mens-id')).toBe(true)
    expect(events.every((e) => e.weekendGroupId === 'group-id')).toBe(true)
  })

  it('puts the sendoff on Thursday 7–8 PM community time', () => {
    const sendoff = events.find((e) => e.type === 'sendoff')
    expect(sendoff?.datetime).toBe('2026-12-04T01:00:00.000Z')
    expect(sendoff?.endDatetime).toBe('2026-12-04T02:00:00.000Z')
  })

  it('runs the weekend from Thursday 7 PM to Sunday 5 PM', () => {
    const weekend = events.find((e) => e.type === 'weekend')
    expect(weekend?.datetime).toBe('2026-12-04T01:00:00.000Z')
    expect(weekend?.endDatetime).toBe('2026-12-06T23:00:00.000Z')
  })

  it('holds serenade practice Saturday 4:30 PM and the serenade at 7 PM', () => {
    expect(events.find((e) => e.type === 'serenade_practice')?.datetime).toBe(
      '2026-12-05T22:30:00.000Z'
    )
    expect(events.find((e) => e.type === 'serenade')?.datetime).toBe(
      '2026-12-06T01:00:00.000Z'
    )
  })

  it('closes Sunday at 5 PM', () => {
    expect(events.find((e) => e.type === 'closing')?.datetime).toBe(
      '2026-12-06T23:00:00.000Z'
    )
  })

  it('respects daylight saving time', () => {
    // Thursday Apr 9, 2026 — Central Daylight Time (UTC-5)
    const [sendoff] = buildStandardWeekendEvents(
      {
        id: 'w',
        type: WeekendType.WOMENS,
        startDate: '2026-04-09',
        groupId: 'g',
      },
      12
    )
    expect(sendoff.datetime).toBe('2026-04-10T00:00:00.000Z')
  })
})

describe('standardEventTitle', () => {
  it('names the weekend, the event and the group', () => {
    expect(standardEventTitle('serenade', WeekendType.MENS, 13)).toBe(
      "Men's Serenade #13"
    )
    expect(
      standardEventTitle('serenade_practice', WeekendType.WOMENS, null)
    ).toBe("Women's Serenade practice")
  })
})
