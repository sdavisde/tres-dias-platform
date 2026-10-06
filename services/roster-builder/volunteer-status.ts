import { communityDayKey } from '@/lib/weekend/hub'
import type { VolunteerStatus } from './types'

/**
 * The secuela event window used to determine volunteer status.
 *
 * - `startDate`: when the secuela event begins (ISO 8601 string)
 * - `endDate`: when the secuela event ends (ISO 8601 string, optional)
 *
 * A sign-in counts as attendance when it falls on the secuela's day (in the
 * community's timezone) and no later than `endDate`, or the end of that day
 * when `endDate` is null.
 */
export type SecuelaEvent = {
  startDate: string
  endDate: string | null
}

/**
 * Determines a community member's volunteer status based on when they
 * signed in relative to the secuela event.
 *
 * Rules:
 * 1. If there is no secuela event defined, return `'none'` — we can't
 *    determine attendance without a reference event.
 * 2. If the user has no sign-in timestamp, return `'none'`.
 * 3. Sign-in before the secuela's day → `'wants_to_serve'` (they signed up
 *    ahead of time but haven't been to secuela yet).
 * 4. Sign-in on the secuela's day (community timezone):
 *    - With an end datetime: on or before it → `'attended_secuela'`
 *      (generous: early arrivals that morning still count)
 *    - Without one: any time that day → `'attended_secuela'`
 * 5. Anything later → `'wants_to_serve'`
 */
export function computeVolunteerStatus(
  signInTimestamp: string | null,
  secuelaEvent: SecuelaEvent | null
): VolunteerStatus {
  if (secuelaEvent === null) return 'none'
  if (signInTimestamp === null) return 'none'

  const signIn = new Date(signInTimestamp)
  const eventDay = communityDayKey(new Date(secuelaEvent.startDate))
  const signInDay = communityDayKey(signIn)

  if (signInDay < eventDay) return 'wants_to_serve'

  if (secuelaEvent.endDate !== null) {
    return signIn <= new Date(secuelaEvent.endDate)
      ? 'attended_secuela'
      : 'wants_to_serve'
  }

  return signInDay === eventDay ? 'attended_secuela' : 'wants_to_serve'
}
