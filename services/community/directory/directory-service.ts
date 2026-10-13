import 'server-only'

import type { Result } from '@/lib/results'
import { isErr, ok, safeParse, unwrapOr } from '@/lib/results'
import * as DirectoryRepository from './repository'
import { addressCitySchema, type DirectoryMember } from './types'

/** Trims a free-text field, treating blank as missing. */
function presentOrNull(value: string | null): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}

export async function getCommunityDirectory(): Promise<
  Result<string, DirectoryMember[]>
> {
  const result = await DirectoryRepository.getDirectoryUsers()
  if (isErr(result)) {
    return result
  }

  return ok(
    result.data.map((user) => ({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: presentOrNull(user.email),
      phoneNumber: presentOrNull(user.phone_number),
      church: presentOrNull(user.church_affiliation),
      weekendAttended: presentOrNull(user.weekend_attended),
      city:
        unwrapOr(safeParse(user.address, addressCitySchema), null)?.city ??
        null,
      profilePhoto: {
        path: user.profile_photo_path,
        updatedAt: user.profile_photo_updated_at,
      },
    }))
  )
}
