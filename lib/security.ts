import type { User } from '@/lib/users/types'
import { Errors } from './error'
import { CHARole } from './weekend/types'
import { isNil } from 'lodash'

/**
 * Builds a callback to check user permissions. Will throw an error if the user does not have the required permissions.
 * @param permissions - The permissions required to access the resource
 * @returns A callback that checks if the user has one of the required persmissions
 */
export function permissionLock(permissions: Array<Permission>) {
  return (user: User | null): true => {
    if (isNil(user)) {
      throw new Error(Errors.NOT_LOGGED_IN.toString())
    }

    if (userHasPermission(user, permissions) === false) {
      throw new Error(Errors.INSUFFICIENT_PERMISSIONS.toString())
    }

    return true
  }
}

export function userHasPermission(
  user: User,
  permissions: Array<Permission>
): boolean {
  if (user.permissions.has(Permission.FULL_ACCESS)) {
    return true
  }

  const requiredPermissions = new Set(permissions)
  // return whether or not the permissions set has any in common with the user's permissions
  return requiredPermissions.intersection(user.permissions).size > 0
}

export function canImpersonate(user: User | null): boolean {
  if (isNil(user)) return false
  return (
    userHasPermission(user, [Permission.FULL_ACCESS]) ||
    (!isNil(user.originalUser) &&
      userHasPermission(user.originalUser, [Permission.FULL_ACCESS]))
  )
}

export enum Permission {
  // File management
  FILES_UPLOAD = 'FILES_UPLOAD',
  FILES_DELETE = 'FILES_DELETE',

  // User management
  // READ_MASTER_ROSTER = 'READ_MASTER_ROSTER', // Right now we're going to assume that anyone can read the master roster
  READ_USER_EXPERIENCE = 'READ_USER_EXPERIENCE',

  // Candidate management
  READ_CANDIDATES = 'READ_CANDIDATES',
  WRITE_CANDIDATES = 'WRITE_CANDIDATES',
  DELETE_CANDIDATES = 'DELETE_CANDIDATES',

  // Weekend admin management
  READ_DROPPED_ROSTER = 'READ_DROPPED_ROSTER',
  // READ_TEAM_ROSTER = 'READ_TEAM_ROSTER', everyone should be able to read team rosters
  WRITE_TEAM_ROSTER = 'WRITE_TEAM_ROSTER',
  READ_TEAM_ROSTER_BUILDER = 'READ_TEAM_ROSTER_BUILDER',
  READ_WRITE_TEAM_PAYMENTS = 'READ_WRITE_TEAM_PAYMENTS',

  READ_WEEKENDS = 'READ_WEEKENDS',
  WRITE_WEEKENDS = 'WRITE_WEEKENDS',

  READ_EVENTS = 'READ_EVENTS',
  WRITE_EVENTS = 'WRITE_EVENTS',

  // Payments
  READ_PAYMENTS = 'READ_PAYMENTS',
  WRITE_PAYMENTS = 'WRITE_PAYMENTS',
  /** Set a weekend group's fees and the defaults new groups start from. */
  MANAGE_FEES = 'MANAGE_FEES',

  // Security
  WRITE_USER_ROLES = 'WRITE_USER_ROLES',
  READ_USER_ROLES = 'READ_USER_ROLES',

  // General
  FULL_ACCESS = 'FULL_ACCESS',
  READ_ADMIN_PORTAL = 'READ_ADMIN_PORTAL',

  // Community
  WRITE_COMMUNITY_ENCOURAGEMENT = 'WRITE_COMMUNITY_ENCOURAGEMENT',

  // Settings
  WRITE_SETTINGS = 'WRITE_SETTINGS',
  /** The community's platform subscription: card on file, invoices, cancellation. */
  MANAGE_BILLING = 'MANAGE_BILLING',

  // Candidate-specific read permissions
  READ_CANDIDATE_CONTACT_INFO = 'READ_CANDIDATE_CONTACT_INFO',
  READ_CANDIDATE_ADDRESS = 'READ_CANDIDATE_ADDRESS',
  READ_CANDIDATE_SHIRT_SIZE = 'READ_CANDIDATE_SHIRT_SIZE',
  READ_CANDIDATE_MEDICAL_INFO = 'READ_CANDIDATE_MEDICAL_INFO',
  READ_CANDIDATE_EMERGENCY_CONTACT = 'READ_CANDIDATE_EMERGENCY_CONTACT',
  READ_CANDIDATE_MARITAL_STATUS = 'READ_CANDIDATE_MARITAL_STATUS',
  READ_CANDIDATE_TABLE_ASSIGNMENT_PROPERTIES = 'READ_CANDIDATE_TABLE_ASSIGNMENT_PROPERTIES',
  READ_CANDIDATE_SPONSOR_INFO = 'READ_CANDIDATE_SPONSOR_INFO',
  READ_CANDIDATE_CHURCH = 'READ_CANDIDATE_CHURCH',
  READ_CANDIDATE_PAYMENTS = 'READ_CANDIDATE_PAYMENTS',

  // Team form submissions
  READ_TEAM_FORM_INFO = 'READ_TEAM_FORM_INFO',
}

/**
 * Maps CHA roles to the permissions they implicitly grant during an active weekend.
 * Leadership roles (Rector, Head, etc.) get broad roster management permissions,
 * while support roles (Tech) get limited permissions relevant to their function.
 *
 * MIRRORED IN SQL: `public.auth_user_cha_has_permission()`
 * (supabase/migrations/20260927000002_permission_helpers.sql) copies the role
 * lists for WRITE_TEAM_ROSTER, READ_WRITE_TEAM_PAYMENTS and
 * READ_TEAM_ROSTER_BUILDER so row-level security lets weekend leaders write
 * roster and team-payment rows without a database role. When you change those
 * entries here, change the SQL too; lib/security/cha-permissions-sql.test.ts
 * fails if they drift.
 */
const CHA_ROLE_PERMISSIONS: Readonly<Record<CHARole, readonly Permission[]>> = {
  [CHARole.RECTOR]: [
    Permission.READ_WRITE_TEAM_PAYMENTS,
    Permission.WRITE_TEAM_ROSTER,
    Permission.READ_TEAM_ROSTER_BUILDER,
    Permission.READ_DROPPED_ROSTER,
    Permission.READ_USER_EXPERIENCE,
    Permission.READ_CANDIDATE_ADDRESS,
    Permission.READ_CANDIDATE_SHIRT_SIZE,
    Permission.READ_CANDIDATE_MEDICAL_INFO,
    Permission.READ_CANDIDATE_EMERGENCY_CONTACT,
    Permission.READ_CANDIDATE_MARITAL_STATUS,
    Permission.READ_CANDIDATE_SPONSOR_INFO,
    Permission.READ_TEAM_FORM_INFO,
  ],
  [CHARole.BACKUP_RECTOR]: [
    Permission.READ_WRITE_TEAM_PAYMENTS,
    Permission.WRITE_TEAM_ROSTER,
    Permission.READ_DROPPED_ROSTER,
    Permission.READ_USER_EXPERIENCE,
    Permission.READ_CANDIDATE_SHIRT_SIZE,
    Permission.READ_CANDIDATE_MEDICAL_INFO,
    Permission.READ_CANDIDATE_EMERGENCY_CONTACT,
    Permission.READ_CANDIDATE_MARITAL_STATUS,
    Permission.READ_CANDIDATE_SPONSOR_INFO,
    Permission.READ_CANDIDATE_TABLE_ASSIGNMENT_PROPERTIES,
    Permission.READ_CANDIDATE_CHURCH,
    Permission.READ_TEAM_FORM_INFO,
  ],
  [CHARole.HEAD]: [
    Permission.READ_WRITE_TEAM_PAYMENTS,
    Permission.WRITE_TEAM_ROSTER,
    Permission.READ_DROPPED_ROSTER,
    Permission.READ_USER_EXPERIENCE,
    Permission.READ_CANDIDATE_ADDRESS,
    Permission.READ_CANDIDATE_SHIRT_SIZE,
    Permission.READ_CANDIDATE_MEDICAL_INFO,
    Permission.READ_CANDIDATE_EMERGENCY_CONTACT,
    Permission.READ_CANDIDATE_MARITAL_STATUS,
    Permission.READ_CANDIDATE_SPONSOR_INFO,
    Permission.READ_TEAM_FORM_INFO,
  ],
  [CHARole.ASSISTANT_HEAD]: [
    Permission.READ_WRITE_TEAM_PAYMENTS,
    Permission.WRITE_TEAM_ROSTER,
    Permission.READ_DROPPED_ROSTER,
    Permission.READ_USER_EXPERIENCE,
    Permission.READ_CANDIDATE_ADDRESS,
    Permission.READ_CANDIDATE_SHIRT_SIZE,
    Permission.READ_CANDIDATE_MEDICAL_INFO,
    Permission.READ_CANDIDATE_EMERGENCY_CONTACT,
    Permission.READ_CANDIDATE_MARITAL_STATUS,
    Permission.READ_CANDIDATE_SPONSOR_INFO,
    Permission.READ_TEAM_FORM_INFO,
  ],
  [CHARole.ROSTER]: [
    Permission.WRITE_TEAM_ROSTER,
    Permission.READ_DROPPED_ROSTER,
    Permission.READ_USER_EXPERIENCE,
    Permission.READ_CANDIDATE_CONTACT_INFO,
    Permission.READ_CANDIDATE_ADDRESS,
    Permission.READ_CANDIDATE_CHURCH,
    Permission.READ_TEAM_FORM_INFO,
  ],
  [CHARole.TECH]: [],
  [CHARole.HEAD_ROLLISTA]: [],
  [CHARole.TABLE_LEADER]: [],
  [CHARole.HEAD_TECH]: [],
  [CHARole.HEAD_CHAPEL_TECH]: [],
  [CHARole.HEAD_SPIRITUAL_DIRECTOR]: [],
  [CHARole.SPIRITUAL_DIRECTOR]: [],
  [CHARole.SPIRITUAL_DIRECTOR_TRAINEE]: [],
  [CHARole.HEAD_PRAYER]: [],
  [CHARole.PRAYER]: [],
  [CHARole.HEAD_CHAPEL]: [],
  [CHARole.CHAPEL]: [],
  [CHARole.HEAD_MUSIC]: [],
  [CHARole.MUSIC]: [],
  [CHARole.HEAD_PALANCA]: [
    Permission.READ_CANDIDATE_SHIRT_SIZE,
    Permission.READ_CANDIDATE_SPONSOR_INFO,
  ],
  [CHARole.PALANCA]: [
    Permission.READ_CANDIDATE_SHIRT_SIZE,
    Permission.READ_CANDIDATE_SPONSOR_INFO,
  ],
  [CHARole.HEAD_TABLE]: [],
  [CHARole.TABLE]: [],
  [CHARole.HEAD_DORM]: [],
  [CHARole.DORM]: [
    Permission.READ_CANDIDATE_CHURCH,
    Permission.READ_CANDIDATE_TABLE_ASSIGNMENT_PROPERTIES,
  ],
  [CHARole.HEAD_DINING]: [],
  [CHARole.DINING]: [],
  [CHARole.HEAD_MOBILE]: [],
  [CHARole.MOBILE]: [],
  [CHARole.ESCORT]: [],
  [CHARole.FLOATER]: [],
  [CHARole.MEAT]: [],
  [CHARole.GOPHER]: [],
  [CHARole.MEDIC]: [
    Permission.READ_CANDIDATE_MEDICAL_INFO,
    Permission.READ_CANDIDATE_EMERGENCY_CONTACT,
    Permission.READ_CANDIDATE_MARITAL_STATUS,
  ],
  [CHARole.SMOKER]: [],
  [CHARole.STOREROOM]: [],
  [CHARole.OUTSIDE_PRAYER]: [],
  [CHARole.ROVER]: [],
} as const

/**
 * Returns the permissions granted by a CHA role.
 */
export function getPermissionsForCHARole(
  chaRole: CHARole | null | undefined
): readonly Permission[] {
  if (isNil(chaRole)) {
    return []
  }
  return CHA_ROLE_PERMISSIONS[chaRole] ?? []
}
