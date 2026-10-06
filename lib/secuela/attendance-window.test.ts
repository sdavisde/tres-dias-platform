import {
  decideSecuelaSignIn,
  getSecuelaAttendanceWindow,
} from './attendance-window'

describe('getSecuelaAttendanceWindow', () => {
  it('opens 30 minutes early and closes at the end time', () => {
    const window = getSecuelaAttendanceWindow({
      startDate: '2026-04-11T14:00:00Z',
      endDate: '2026-04-11T20:00:00Z',
    })
    expect(window.opensAt.toISOString()).toBe('2026-04-11T13:30:00.000Z')
    expect(window.closesAt.toISOString()).toBe('2026-04-11T20:00:00.000Z')
  })

  it('closes 3 hours after the start when there is no end time', () => {
    const window = getSecuelaAttendanceWindow({
      startDate: '2026-04-11T14:00:00Z',
      endDate: null,
    })
    expect(window.closesAt.toISOString()).toBe('2026-04-11T17:00:00.000Z')
  })
})

describe('decideSecuelaSignIn', () => {
  const secuelaEvent = {
    startDate: '2026-04-11T14:00:00Z',
    endDate: '2026-04-11T20:00:00Z',
  }

  it('refuses sign-ins before the window opens', () => {
    expect(
      decideSecuelaSignIn(new Date('2026-04-11T13:00:00Z'), secuelaEvent, null)
    ).toEqual({
      kind: 'not_open',
      opensAt: new Date('2026-04-11T13:30:00Z'),
    })
  })

  it('records a sign-in during the secuela', () => {
    expect(
      decideSecuelaSignIn(new Date('2026-04-11T15:00:00Z'), secuelaEvent, null)
    ).toEqual({ kind: 'record' })
  })

  it('records a sign-in after the secuela', () => {
    expect(
      decideSecuelaSignIn(new Date('2026-04-20T15:00:00Z'), secuelaEvent, null)
    ).toEqual({ kind: 'record' })
  })

  it('keeps an existing sign-in made during the secuela', () => {
    expect(
      decideSecuelaSignIn(
        new Date('2026-04-20T15:00:00Z'),
        secuelaEvent,
        '2026-04-11T15:00:00Z'
      )
    ).toEqual({ kind: 'keep' })
  })

  it('replaces an existing sign-in made outside the secuela', () => {
    expect(
      decideSecuelaSignIn(
        new Date('2026-04-11T15:00:00Z'),
        secuelaEvent,
        '2026-04-01T15:00:00Z'
      )
    ).toEqual({ kind: 'record' })
  })

  it('records sign-ups when no secuela is scheduled', () => {
    expect(
      decideSecuelaSignIn(new Date('2026-04-11T15:00:00Z'), null, null)
    ).toEqual({ kind: 'record' })
  })
})
