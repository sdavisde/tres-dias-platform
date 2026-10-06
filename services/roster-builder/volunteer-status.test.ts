import { computeVolunteerStatus, type SecuelaEvent } from './volunteer-status'

describe('computeVolunteerStatus', () => {
  describe('given a secuela event with start and end datetime', () => {
    const secuelaEvent: SecuelaEvent = {
      startDate: '2026-04-11T14:00:00Z',
      endDate: '2026-04-11T20:00:00Z',
    }

    it('returns "none" when signInTimestamp is null', () => {
      expect(computeVolunteerStatus(null, secuelaEvent)).toBe('none')
    })

    it('returns "attended_secuela" when sign-in is the morning of the event (generous)', () => {
      expect(computeVolunteerStatus('2026-04-11T13:00:00Z', secuelaEvent)).toBe(
        'attended_secuela'
      )
    })

    it('returns "wants_to_serve" when sign-in is on an earlier day', () => {
      expect(computeVolunteerStatus('2026-04-01T16:00:00Z', secuelaEvent)).toBe(
        'wants_to_serve'
      )
    })

    it('returns "wants_to_serve" when sign-in is the evening before in community time', () => {
      // 2026-04-11T02:00Z is 9pm Apr 10 in Central time
      expect(computeVolunteerStatus('2026-04-11T02:00:00Z', secuelaEvent)).toBe(
        'wants_to_serve'
      )
    })

    it('returns "attended_secuela" when sign-in is during the event', () => {
      expect(computeVolunteerStatus('2026-04-11T16:00:00Z', secuelaEvent)).toBe(
        'attended_secuela'
      )
    })

    it('returns "attended_secuela" when sign-in is exactly at the end time', () => {
      expect(computeVolunteerStatus('2026-04-11T20:00:00Z', secuelaEvent)).toBe(
        'attended_secuela'
      )
    })

    it('returns "wants_to_serve" when sign-in is after the end time', () => {
      expect(computeVolunteerStatus('2026-04-11T20:00:01Z', secuelaEvent)).toBe(
        'wants_to_serve'
      )
    })

    it('returns "wants_to_serve" when sign-in is on a later day', () => {
      expect(computeVolunteerStatus('2026-04-15T12:00:00Z', secuelaEvent)).toBe(
        'wants_to_serve'
      )
    })
  })

  describe('given a secuela event with start date only (no end datetime)', () => {
    const secuelaEvent: SecuelaEvent = {
      startDate: '2026-04-11T14:00:00Z',
      endDate: null,
    }

    it('returns "attended_secuela" when sign-in is early in the day', () => {
      expect(computeVolunteerStatus('2026-04-11T12:00:00Z', secuelaEvent)).toBe(
        'attended_secuela'
      )
    })

    it('returns "attended_secuela" when sign-in is at 11:59pm on the same day', () => {
      // 11:59pm Central is 04:59Z the next day
      expect(computeVolunteerStatus('2026-04-12T04:59:59Z', secuelaEvent)).toBe(
        'attended_secuela'
      )
    })

    it('returns "wants_to_serve" when sign-in is before the event day', () => {
      expect(computeVolunteerStatus('2026-04-10T12:00:00Z', secuelaEvent)).toBe(
        'wants_to_serve'
      )
    })

    it('returns "wants_to_serve" when sign-in is the next day', () => {
      expect(computeVolunteerStatus('2026-04-12T05:00:01Z', secuelaEvent)).toBe(
        'wants_to_serve'
      )
    })
  })

  describe('given no secuela event is defined for the weekend', () => {
    it('returns "none" even when the user has a sign-in timestamp', () => {
      expect(computeVolunteerStatus('2026-04-11T14:00:00Z', null)).toBe('none')
    })

    it('returns "none" when sign-in timestamp is also null', () => {
      expect(computeVolunteerStatus(null, null)).toBe('none')
    })
  })
})
