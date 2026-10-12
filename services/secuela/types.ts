/** One member who signed in for a secuela. */
export type SecuelaSignIn = {
  userId: string
  name: string
  signedInAt: string
}

/** One secuela event with who signed in. */
export type SecuelaSummary = {
  eventId: number
  groupId: string
  groupNumber: number | null
  title: string | null
  startsAt: string
  endsAt: string | null
  location: string | null
  /** When sign-ins start counting as attendance (the start time). */
  windowOpensAt: string
  /** When sign-ins stop counting as attendance. */
  windowClosesAt: string
  attendedCount: number
  wantsToServeCount: number
  /** Signed in during the attendance window, earliest first. */
  attended: SecuelaSignIn[]
  /** Signed in outside the window to volunteer, earliest first. */
  wantsToServe: SecuelaSignIn[]
}

export type SecuelaOverview = {
  /** The active weekend group, if there is one. */
  activeGroup: { groupId: string; groupNumber: number | null } | null
  /** The active group's secuela; null when it hasn't been scheduled yet. */
  active: SecuelaSummary | null
  /** Secuelas for other groups that have already started, newest first. */
  previous: SecuelaSummary[]
}
