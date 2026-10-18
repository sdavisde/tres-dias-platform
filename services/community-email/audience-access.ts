import {
  getPermissionsForCHARole,
  Permission,
  userHasPermission,
} from '@/lib/security'
import type { User } from '@/lib/users/types'
import type { CHARole } from '@/lib/weekend/types'
import type { Audience } from './types'

/**
 * `user.permissions` merges role and CHA-role grants; weekend email reaches
 * further when it comes from a role, so this asks the roles alone.
 */
function roleGrants(user: User, permission: Permission): boolean {
  return user.roles.some((role) => role.permissions.includes(permission))
}

/** The sender's CHA role on this weekend lets them email its team. */
function leadsWeekend(user: User, weekendId: string): boolean {
  return (user.teamMemberInfo?.weekendAssignments ?? []).some(
    (assignment) =>
      assignment.weekendId === weekendId &&
      getPermissionsForCHARole(assignment.chaRole as CHARole | null).includes(
        Permission.SEND_WEEKEND_EMAIL
      )
  )
}

/**
 * Whether the sender may email this audience:
 *
 * - SEND_COMMUNITY_EMAIL (or Full Access): anyone.
 * - SEND_WEEKEND_EMAIL from a role (Admin, board, PWC): any weekend group's
 *   teams and new pescadores.
 * - SEND_WEEKEND_EMAIL from a CHA role (Rector, Head…): only the team of the
 *   weekend they lead.
 */
export function canSendToAudience(user: User, audience: Audience): boolean {
  if (userHasPermission(user, [Permission.SEND_COMMUNITY_EMAIL])) {
    return true
  }
  switch (audience.type) {
    case 'weekend_team':
      return (
        roleGrants(user, Permission.SEND_WEEKEND_EMAIL) ||
        leadsWeekend(user, audience.weekendId)
      )
    case 'group_team':
    case 'group_pescadores':
      return roleGrants(user, Permission.SEND_WEEKEND_EMAIL)
    default:
      return false
  }
}

/** The sender can write some email (preview, test send). */
export function canSendSomeEmail(user: User): boolean {
  return userHasPermission(user, [
    Permission.SEND_COMMUNITY_EMAIL,
    Permission.SEND_WEEKEND_EMAIL,
  ])
}
