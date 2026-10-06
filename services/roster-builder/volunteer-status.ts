import {
  isDuringSecuela,
  type SecuelaEvent,
} from '@/lib/secuela/attendance-window'
import type { VolunteerStatus } from './types'

export type { SecuelaEvent } from '@/lib/secuela/attendance-window'

/**
 * Determines a community member's volunteer status based on when they
 * signed in relative to the secuela event.
 *
 * Rules:
 * 1. If there is no secuela event defined, return `'none'` — we can't
 *    determine attendance without a reference event.
 * 2. If the user has no sign-in timestamp, return `'none'`.
 * 3. Sign-in during the attendance window → `'attended_secuela'`
 * 4. Sign-in any other time → `'wants_to_serve'`
 */
export function computeVolunteerStatus(
  signInTimestamp: string | null,
  secuelaEvent: SecuelaEvent | null
): VolunteerStatus {
  if (secuelaEvent === null) return 'none'
  if (signInTimestamp === null) return 'none'

  return isDuringSecuela(signInTimestamp, secuelaEvent)
    ? 'attended_secuela'
    : 'wants_to_serve'
}
