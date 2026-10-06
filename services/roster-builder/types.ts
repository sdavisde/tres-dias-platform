import type {
  ExperienceLevel,
  RectorReadyStatus,
} from '@/services/master-roster/types'
import type { UserExperience } from '@/lib/users/experience/validation'
import type { ProfilePhoto } from '@/components/user-avatar'

// ============================================================================
// Volunteer Status
// ============================================================================

export type VolunteerStatus = 'attended_secuela' | 'wants_to_serve' | 'none'

// ============================================================================
// Community Member Types (for roster builder display)
// ============================================================================

/**
 * Assignment status for a community member on a specific weekend.
 */
export type AssignmentStatus =
  | { type: 'unassigned' }
  | { type: 'draft'; draftId: string; chaRole: string; rollo: string | null }
  | {
      type: 'finalized'
      rosterId: string
      chaRole: string
      rollo: string | null
    }

/**
 * Eligibility result for a specific role.
 */
export type EligibilityResult = {
  eligible: boolean
  reason?: string
}

/**
 * A community member with all computed fields needed for the roster builder.
 */
export type RosterBuilderCommunityMember = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phoneNumber: string | null
  church: string | null
  gender: string | null
  isClergy: boolean

  // Experience data
  experience: UserExperience[]
  experienceLevel: ExperienceLevel
  weekendsServed: number

  // Computed flags
  rectorReadyStatus: RectorReadyStatus
  hasBeenSectionHead: boolean
  hasGivenRollo: boolean
  volunteerStatus: VolunteerStatus

  // Current assignment on this weekend
  assignmentStatus: AssignmentStatus

  // Eligibility map for roles with special requirements
  eligibility: Record<string, EligibilityResult>

  profilePhoto: ProfilePhoto
}

// ============================================================================
// Draft Roster Types
// ============================================================================

/**
 * Draft roster record with joined user data for display.
 */
export type DraftRosterMember = {
  id: string
  weekendId: string
  userId: string
  chaRole: string
  rollo: string | null
  createdBy: string
  createdAt: string | null
  finalizedAt: string | null
  user: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string | null
    phoneNumber: string | null
  }
}

/**
 * Raw shape returned from the draft roster query with user join.
 */
export type RawDraftRosterWithUser = {
  id: string
  weekend_id: string
  user_id: string
  cha_role: string
  rollo: string | null
  created_by: string
  created_at: string | null
  finalized_at: string | null
  users: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    phone_number: string | null
  } | null
}
