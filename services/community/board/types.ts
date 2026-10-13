import type { RoleType } from '@/services/identity/roles'
import type { ProfilePhoto } from '@/components/user-avatar'
import type { ContactInfo } from '@/services/notifications'

/**
 * The predefined sort order for board positions.
 * Roles not in this list are not considered board positions.
 */
export const BOARD_ROLE_SORT_ORDER = [
  'President',
  'Vice President',
  'Corresponding Secretary',
  'Recording Secretary',
  'Treasurer',
  'Community Spiritual Director',
  'At-Large Members',
]

/**
 * Committees are picked up from `roles.type === 'COMMITTEE'` rather than a
 * hardcoded list, so a new committee shows up without a code change. Two
 * carve-outs keep that honest:
 *
 * - `BOARD_ROLE_SORT_ORDER` members are excluded. `At-Large Members` is
 *   COMMITTEE-typed (it takes multiple assignees) but it is a board position
 *   and already has its own card. `Pre Weekend Couple` is not on the board,
 *   so it lands here with the other committees.
 * - {@link NON_COMMITTEE_ROLE_LABELS} are excluded. `Full Access` is
 *   COMMITTEE-typed purely so several people can hold it; it is an access
 *   level, not a group the community would recognise.
 */
export const NON_COMMITTEE_ROLE_LABELS = ['Full Access', 'Admin']

/**
 * Legacy allowlist, kept as a fallback union with the `type` filter so a
 * committee whose row predates the `type` column still renders.
 */
export const BOARD_COMMITTEE_ROLES = ['Leaders Committee']

/**
 * A simplified board role for display purposes.
 */
export type BoardRole = {
  id: string
  label: string
  type: RoleType
  description: string | null
}

/**
 * A simplified member for board assignment purposes.
 */
export type BoardMember = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phoneNumber: string | null
  roles: Array<{ id: string; label: string }>
  profilePhoto: ProfilePhoto
}

/** Someone holding a position, as the member Community page shows them. */
export type PositionHolder = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phoneNumber: string | null
  profilePhoto: ProfilePhoto
}

/**
 * A board position, committee or team with whoever holds it. `type` tells a
 * single-holder position (INDIVIDUAL) from a group (COMMITTEE).
 */
export type CommunityPosition = BoardRole & {
  holders: PositionHolder[]
}

/** The read-only leadership view for the member Community page. */
export type CommunityLeadership = {
  /** Board positions in {@link BOARD_ROLE_SORT_ORDER}. */
  boardPositions: CommunityPosition[]
  /** Committees and teams, alphabetical. */
  committees: CommunityPosition[]
}

/**
 * The complete community board data structure.
 * Contains all data needed to render both read-only and editable board views.
 */
export type CommunityBoardData = {
  /** Board positions sorted by predefined order, excluding Leaders Committee */
  boardRoles: BoardRole[]
  /** The Leaders Committee role, if it exists */
  committeeRoles: BoardRole[]
  /** All community members available for assignment */
  members: BoardMember[]
  /** Contact information for the Pre-Weekend Couple */
  preWeekendCoupleContact: ContactInfo
}
