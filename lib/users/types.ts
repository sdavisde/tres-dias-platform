import type { TeamMemberInfo } from '@/lib/weekend/types'
import type { Address } from './validation'
import type { RoleType } from '@/services/identity/roles'

export type CommunityInformation = {
  churchAffiliation: string | null
  weekendAttended: string | null
  essentialsTrainingDate: string | null
  specialGiftsAndSkills: string[] | null
  isClergy: boolean
}

export type User = {
  id: string
  firstName: string | null
  lastName: string | null
  gender: string | null
  email: string
  phoneNumber: string | null
  address: Address | null
  /** Storage path of the user's avatar in the `avatars` bucket, or null for none. */
  profilePhotoPath: string | null
  /** When the avatar was last set; used as a cache-busting key on the CDN URL. */
  profilePhotoUpdatedAt: string | null
  roles: Array<UserRoleInfo>
  permissions: Set<string>
  communityInformation: CommunityInformation
  /** Contains information about this user's CHA role and status if they are on the upcoming weekend team roster */
  teamMemberInfo: TeamMemberInfo | null
  /**
   * When impersonating a user, this will contain information about the original user before impersonation
   * If this is null, the logged-in user is not impersonating anyone.
   */
  originalUser: User | null
}

/**
 * A duplicate of User that requires `teamMemberInfo` so that it can be used safely
 */
export type TeamMemberUser = Omit<User, 'teamMemberInfo'> & {
  teamMemberInfo: TeamMemberInfo
}

export type UserRoleInfo = {
  id: string
  label: string
  permissions: Array<string>
  type: RoleType
}
