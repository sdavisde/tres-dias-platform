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

    it('returns "attended_secuela" when sign-in is 30 minutes before the start', () => {
      expect(computeVolunteerStatus('2026-04-11T13:30:00Z', secuelaEvent)).toBe(
        'attended_secuela'
      )
    })

    it('returns "wants_to_serve" when sign-in is earlier than 30 minutes before the start', () => {
      expect(computeVolunteerStatus('2026-04-11T13:29:59Z', secuelaEvent)).toBe(
        'wants_to_serve'
      )
    })

    it('returns "wants_to_serve" when sign-in is days before the event', () => {
      expect(computeVolunteerStatus('2026-04-01T16:00:00Z', secuelaEvent)).toBe(
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
  })

  describe('given a secuela event with no end datetime', () => {
    const secuelaEvent: SecuelaEvent = {
      startDate: '2026-04-11T14:00:00Z',
      endDate: null,
    }

    it('returns "attended_secuela" up to 3 hours after the start', () => {
      expect(computeVolunteerStatus('2026-04-11T17:00:00Z', secuelaEvent)).toBe(
        'attended_secuela'
      )
    })

    it('returns "wants_to_serve" more than 3 hours after the start', () => {
      expect(computeVolunteerStatus('2026-04-11T17:00:01Z', secuelaEvent)).toBe(
        'wants_to_serve'
      )
    })

    it('returns "wants_to_serve" when sign-in is the day before', () => {
      expect(computeVolunteerStatus('2026-04-10T14:00:00Z', secuelaEvent)).toBe(
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
