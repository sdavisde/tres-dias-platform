import { z } from 'zod'
import type { ProfilePhoto } from '@/components/user-avatar'

/**
 * One person in the member-facing community directory: contact details and
 * a little community context. Deliberately excludes the full address,
 * experience, rector readiness and roles that the admin People page shows.
 */
export type DirectoryMember = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phoneNumber: string | null
  church: string | null
  weekendAttended: string | null
  /** Only the city is shared — never the street address. */
  city: string | null
  profilePhoto: ProfilePhoto
}

/** Reads just the city out of the stored address JSON, however complete it is. */
export const addressCitySchema = z.object({
  city: z.string().trim().min(1),
})
