import type { Tables } from '@/database.types'
import type { CommunityInformation } from '@/lib/users/types'
import type { Address } from '@/lib/users/validation'
import type { UserExperience } from '@/lib/users/experience/validation'
import type { RoleType } from '@/services/identity/roles'
import type { ProfilePhoto } from '@/components/user-avatar'

export type MasterRosterMember = {
  id: string
  firstName: string | null
  lastName: string | null
  gender: string | null
  email: string | null
  phoneNumber: string | null
  address: Address | null
  communityInformation: CommunityInformation
  roles: Array<{ id: string; label: string; type: RoleType }>
  permissions: Array<string>
  level: ExperienceLevel
  rectorReady: RectorReadyStatus
  experience: Array<UserExperience>
  profilePhoto: ProfilePhoto
}

export type MasterRoster = {
  members: Array<MasterRosterMember>
}

// User experience types

export type ExperienceLevel = 1 | 2 | 3

export type RectorReadyCriteria = {
  hasServedHeadOrAssistantHead: boolean
  hasServedTeamHead: boolean
  hasGivenTwoOrMoreTalks: boolean
  hasWorkedDining: boolean
  hasServedAsRector: boolean
}

export type RectorReadyStatusLabel = 'In Progress' | 'Qualified' | 'Has Served'

export type RectorReadyStatus = {
  isReady: boolean
  statusLabel: RectorReadyStatusLabel
  criteria: RectorReadyCriteria
}

export type ExperienceLevelDistribution = {
  count: number
  percentage: number
}

export type ExperienceDistribution = {
  level1: ExperienceLevelDistribution
  level2: ExperienceLevelDistribution
  level3: ExperienceLevelDistribution
  total: number
}

export type UserServiceHistory = {
  level: ExperienceLevel
  rectorReady: RectorReadyStatus
  experience: UserExperience[]
  totalWeekends: number
  totalDTTDWeekends: number
}

export type GroupedExperience = {
  community: string
  records: UserExperience[]
}

export type UserExperienceRecord = {
  weekend_id: string | null
  weekend_reference: string
}

/**
 * Raw community user data shape from the master roster query.
 * Includes user info and experience records needed by the roster builder.
 */
export type RawCommunityUser = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone_number: string | null
  church_affiliation: string | null
  gender: string | null
  is_clergy: boolean
  users_experience: Array<Tables<'users_experience'>>
  profile_photo_path: string | null
  profile_photo_updated_at: string | null
}

/**
 * Bundled community data for the roster builder.
 * Contains all raw data needed to compute eligibility and assignment status.
 */
export type CommunityDataForRosterBuilder = {
  users: RawCommunityUser[]
  rosterAssignments: Map<
    string,
    { rosterId: string; chaRole: string; rollo: string | null }
  >
  draftAssignments: Map<
    string,
    { draftId: string; chaRole: string; rollo: string | null }
  >
  secuelaAttendees: Map<string, string>
  secuelaEvent: { startDate: string; endDate: string | null } | null
}
