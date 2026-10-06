export type ContactFields = {
  firstName: string
  lastName: string
  phone: string
  email: string
  gender: string
}

export type AddressFields = {
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  zip: string
}

export type CommunityFields = {
  churchAffiliation: string
  weekendCommunity: string
  weekendNumber: string
  essentialsDate: Date | undefined
  skills: string[]
  isClergy: boolean
}

export type NewExperienceEntry = {
  /** Client-only identity so rows survive edits to their neighbours. */
  key: string
  /** Persisted, and shown read-only until the refreshed roster includes it. */
  saved: boolean
  cha_role: string
  community: string
  weekend_number: string
  rollo: string
}
