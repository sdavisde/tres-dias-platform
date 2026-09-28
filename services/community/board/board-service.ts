import 'server-only'

import type { Result } from '@/lib/results'
import { err, isErr, ok } from '@/lib/results'
import { getRoles } from '@/services/identity/roles/role-service'
import { getMasterRoster } from '@/services/master-roster'
import { getContactInformation } from '@/services/notifications'
import type { BoardMember, BoardRole, CommunityBoardData } from './types'
import {
  BOARD_ROLE_SORT_ORDER,
  BOARD_COMMITTEE_ROLES,
  NON_COMMITTEE_ROLE_LABELS,
} from './types'
import type { Role } from '@/services/identity/roles'
import type { MasterRosterMember } from '@/services/master-roster'

/**
 * Normalizes a Role to a BoardRole (simpler structure for the board UI).
 */
function normalizeRole(role: Role): BoardRole {
  return {
    id: role.id,
    label: role.label,
    type: role.type,
    description: role.description,
  }
}

/**
 * Normalizes a MasterRosterMember to a BoardMember (simpler structure).
 */
function normalizeMember(member: MasterRosterMember): BoardMember {
  return {
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phoneNumber: member.phoneNumber,
    roles: member.roles.map((role) => ({
      id: role.id,
      label: role.label,
    })),
    profilePhoto: member.profilePhoto,
  }
}

function isCommunityBoardRole(role: BoardRole): boolean {
  return BOARD_ROLE_SORT_ORDER.includes(role.label)
}
/**
 * A committee or team is any COMMITTEE-typed role that isn't already a board
 * position or a bare access level — unioned with the legacy allowlist so rows
 * predating the `type` column still show up. See the notes on
 * {@link NON_COMMITTEE_ROLE_LABELS}.
 */
function isBoardCommitteeRole(role: BoardRole): boolean {
  if (isCommunityBoardRole(role)) {
    return false
  }

  if (NON_COMMITTEE_ROLE_LABELS.includes(role.label)) {
    return false
  }

  return role.type === 'COMMITTEE' || BOARD_COMMITTEE_ROLES.includes(role.label)
}

/**
 * Sorts board roles according to the predefined order.
 * Roles in BOARD_ROLE_SORT_ORDER are sorted first in that order,
 * roles not in the list are sorted alphabetically after.
 */
function sortRoles(roles: BoardRole[], target: Array<string>): BoardRole[] {
  return [...roles].filter(isCommunityBoardRole).sort((a, b) => {
    const aIndex = BOARD_ROLE_SORT_ORDER.indexOf(
      a.label as (typeof BOARD_ROLE_SORT_ORDER)[number]
    )
    const bIndex = BOARD_ROLE_SORT_ORDER.indexOf(
      b.label as (typeof BOARD_ROLE_SORT_ORDER)[number]
    )

    // Both in sort order: sort by position
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex
    }

    // Only a is in sort order: a comes first
    if (aIndex !== -1) {
      return -1
    }

    // Only b is in sort order: b comes first
    if (bIndex !== -1) {
      return 1
    }

    // Neither in sort order: sort alphabetically
    return a.label.localeCompare(b.label)
  })
}

/**
 * Fetches all data needed for the community board page.
 */
export async function getCommunityBoardData(): Promise<
  Result<string, CommunityBoardData>
> {
  // Fetch all data in parallel
  const [rolesResult, rosterResult, contactResult] = await Promise.all([
    getRoles(),
    getMasterRoster(),
    getContactInformation('preweekend-couple'),
  ])

  // Handle errors
  if (isErr(rolesResult)) {
    return err(`Failed to fetch roles: ${rolesResult.error}`)
  }

  if (isErr(rosterResult)) {
    return err(`Failed to fetch roster: ${rosterResult.error}`)
  }

  if (isErr(contactResult)) {
    return err(
      `Failed to fetch pre-weekend couple contact: ${contactResult.error}`
    )
  }

  const roles = rolesResult.data
  const roster = rosterResult.data
  const preWeekendCoupleContact = contactResult.data

  // Separate committees from other board roles
  const committeeRoles = roles.filter(isBoardCommitteeRole).map(normalizeRole)
  const boardRolesUnsorted = roles
    .filter(isCommunityBoardRole)
    .map(normalizeRole)

  // Sort board roles according to predefined order
  const boardRoles = sortRoles(boardRolesUnsorted, BOARD_ROLE_SORT_ORDER)

  // Normalize members
  const members = roster.members.map(normalizeMember)

  return ok({
    boardRoles,
    committeeRoles,
    members,
    preWeekendCoupleContact,
  })
}
