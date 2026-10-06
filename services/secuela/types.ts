/** One secuela event with its sign-in counts. */
export type SecuelaSummary = {
  eventId: number
  groupId: string
  groupNumber: number | null
  title: string | null
  startsAt: string
  endsAt: string | null
  location: string | null
  /** When sign-ins start counting as attendance (30 minutes early). */
  windowOpensAt: string
  /** When sign-ins stop counting as attendance. */
  windowClosesAt: string
  attendedCount: number
  wantsToServeCount: number
}

export type SecuelaOverview = {
  /** The active weekend group, if there is one. */
  activeGroup: { groupId: string; groupNumber: number | null } | null
  /** The active group's secuela; null when it hasn't been scheduled yet. */
  active: SecuelaSummary | null
  /** Secuelas for other groups that have already started, newest first. */
  previous: SecuelaSummary[]
}
