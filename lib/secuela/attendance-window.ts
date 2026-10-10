// Pure helpers for when a secuela sign-in counts as attendance. No server
// imports, so the sign-in flow, roster builder and admin page can all share it.

/**
 * The secuela event used to determine volunteer status.
 *
 * - `startDate`: when the secuela event begins (ISO 8601 string)
 * - `endDate`: when the secuela event ends (ISO 8601 string, optional)
 */
export type SecuelaEvent = {
  startDate: string
  endDate: string | null
}

/** Assumed length of a secuela that has no end time set. */
export const SECUELA_DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000

/**
 * The window during which a sign-in counts as attending: the start time
 * through the end time (or start + 3 hours when there is none).
 */
export function getSecuelaAttendanceWindow(secuelaEvent: SecuelaEvent): {
  opensAt: Date
  closesAt: Date
} {
  const start = new Date(secuelaEvent.startDate).getTime()
  const end =
    secuelaEvent.endDate !== null
      ? new Date(secuelaEvent.endDate).getTime()
      : start + SECUELA_DEFAULT_DURATION_MS

  return {
    opensAt: new Date(start),
    closesAt: new Date(end),
  }
}

/** Whether `instant` falls inside the secuela's attendance window. */
export function isDuringSecuela(
  instant: string | Date,
  secuelaEvent: SecuelaEvent
): boolean {
  const { opensAt, closesAt } = getSecuelaAttendanceWindow(secuelaEvent)
  const time = new Date(instant).getTime()
  return time >= opensAt.getTime() && time <= closesAt.getTime()
}

export type SecuelaSignInDecision =
  /** Too early: registration opens at `opensAt`. Nothing is recorded. */
  | { kind: 'not_open'; opensAt: Date }
  /** Record `now` as the member's sign-in time. */
  | { kind: 'record' }
  /** Keep the existing sign-in — it was made during the secuela. */
  | { kind: 'keep' }

/**
 * What a sign-in at `now` should do.
 *
 * - Before the attendance window opens, registration isn't open yet.
 * - A sign-in made during the secuela is never overwritten by a later one, so
 *   someone who attended doesn't drop to "wants to serve" by signing up again.
 * - With no secuela on the calendar, sign-ups are always recorded (they count
 *   as "wants to serve" once one is scheduled).
 */
export function decideSecuelaSignIn(
  now: Date,
  secuelaEvent: SecuelaEvent | null,
  existingSignIn: string | null
): SecuelaSignInDecision {
  if (secuelaEvent === null) return { kind: 'record' }

  const { opensAt } = getSecuelaAttendanceWindow(secuelaEvent)
  if (now.getTime() < opensAt.getTime()) {
    return { kind: 'not_open', opensAt }
  }

  if (
    existingSignIn !== null &&
    isDuringSecuela(existingSignIn, secuelaEvent)
  ) {
    return { kind: 'keep' }
  }

  return { kind: 'record' }
}
