import 'server-only'

import { isNil } from 'lodash'
import type { Result } from '@/lib/results'
import { err, isErr, ok } from '@/lib/results'
import { getRoles } from '@/services/identity/roles/role-service'
import { getMasterRoster } from '@/services/master-roster'
import { getContactInformation } from '@/services/notifications'
import * as BoardRepository from './repository'
import type {
  BoardMember,
  BoardRole,
  CommunityBoardData,
  CommunityLeadership,
  CommunityPosition,
  PositionHolder,
} from './types'
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
function sortRoles<T extends BoardRole>(
  roles: T[],
  target: Array<string>
): T[] {
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

type RawPositionHolder = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone_number: string | null
  profile_photo_path: string | null
  profile_photo_updated_at: string | null
}

type RawRoleWithHolders = BoardRole & {
  user_roles: Array<{ users: RawPositionHolder | null }>
}

function normalizeHolder(user: RawPositionHolder): PositionHolder {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    phoneNumber: user.phone_number,
    profilePhoto: {
      path: user.profile_photo_path,
      updatedAt: user.profile_photo_updated_at,
    },
  }
}

const holderSortKey = (holder: PositionHolder) =>
  `${holder.lastName ?? ''} ${holder.firstName ?? ''}`

function toPosition(role: RawRoleWithHolders): CommunityPosition {
  const holders = role.user_roles
    .flatMap(({ users }) => (isNil(users) ? [] : [normalizeHolder(users)]))
    .sort((a, b) => holderSortKey(a).localeCompare(holderSortKey(b)))

  return {
    id: role.id,
    label: role.label,
    type: role.type,
    description: role.description,
    holders,
  }
}

/**
 * Board positions and committees with their holders, for the member
 * Community page. Reads only the contact fields members may see.
 */
export async function getCommunityLeadership(): Promise<
  Result<string, CommunityLeadership>
> {
  const result = await BoardRepository.getRolesWithHolders()
  if (isErr(result)) {
    return err(`Failed to fetch positions: ${result.error}`)
  }

  const positions = (result.data as RawRoleWithHolders[]).map(toPosition)

  return ok({
    boardPositions: sortRoles(positions, BOARD_ROLE_SORT_ORDER),
    committees: positions
      .filter(isBoardCommitteeRole)
      .sort((a, b) => a.label.localeCompare(b.label)),
  })
}
