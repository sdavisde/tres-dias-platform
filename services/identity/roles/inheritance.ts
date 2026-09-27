import { isNil } from 'lodash'
import { Permission } from '@/lib/security'

/**
 * Role inheritance, resolved in one place.
 *
 * A role may be "based on" another role. Its effective permissions are its own
 * permissions plus everything its ancestors have (transitively). Inheritance
 * is additive only — a child can never remove what its parent grants.
 *
 * This module is pure so the graph logic is unit-testable and shared by the
 * roles service (the editor) and the user service (a user's permission set).
 */

/** The minimum shape the graph needs; both `Role` and raw DB rows satisfy it. */
export type RoleNode = {
  id: string
  permissions: readonly string[]
  based_on_role_id: string | null
}

/**
 * Walks up from `roleId` and returns its ancestor ids, nearest first. A
 * pre-existing loop in the data (which the DB trigger prevents) is cut off
 * rather than looping forever.
 */
export function getAncestorIds(
  roleId: string,
  rolesById: ReadonlyMap<string, RoleNode>
): string[] {
  const ancestors: string[] = []
  const seen = new Set<string>([roleId])
  let current = rolesById.get(roleId)?.based_on_role_id ?? null
  while (!isNil(current) && !seen.has(current)) {
    seen.add(current)
    ancestors.push(current)
    current = rolesById.get(current)?.based_on_role_id ?? null
  }
  return ancestors
}

/** Would setting `roleId` to be based on `basedOnRoleId` form a loop? */
export function wouldCreateCycle(
  roleId: string,
  basedOnRoleId: string | null,
  roles: readonly RoleNode[]
): boolean {
  if (isNil(basedOnRoleId)) return false
  if (basedOnRoleId === roleId) return true
  const rolesById = indexRoles(roles)
  return getAncestorIds(basedOnRoleId, rolesById).includes(roleId)
}

export function indexRoles(roles: readonly RoleNode[]): Map<string, RoleNode> {
  return new Map(roles.map((role) => [role.id, role]))
}

/** Permissions the role gets from its ancestors only (not its own). */
export function getInheritedPermissions(
  roleId: string,
  roles: readonly RoleNode[]
): Set<Permission> {
  const rolesById = indexRoles(roles)
  const inherited = new Set<Permission>()
  for (const ancestorId of getAncestorIds(roleId, rolesById)) {
    for (const permission of rolesById.get(ancestorId)?.permissions ?? []) {
      inherited.add(permission as Permission)
    }
  }
  return inherited
}

/** Own ∪ inherited for one role. */
export function getEffectivePermissions(
  roleId: string,
  roles: readonly RoleNode[]
): Set<Permission> {
  const effective = getInheritedPermissions(roleId, roles)
  for (const permission of indexRoles(roles).get(roleId)?.permissions ?? []) {
    effective.add(permission as Permission)
  }
  return effective
}

/** True when the role's own or inherited permissions include FULL_ACCESS. */
export function roleGrantsFullAccess(
  roleId: string,
  roles: readonly RoleNode[]
): boolean {
  return getEffectivePermissions(roleId, roles).has(Permission.FULL_ACCESS)
}

/**
 * Would a role with these own permissions and parent grant FULL_ACCESS? Used
 * before a role is created or edited, when it may not be in the graph yet.
 */
export function inputGrantsFullAccess(
  input: { permissions: readonly string[]; based_on_role_id: string | null },
  roles: readonly RoleNode[]
): boolean {
  if (input.permissions.includes(Permission.FULL_ACCESS)) return true
  if (isNil(input.based_on_role_id)) return false
  return roleGrantsFullAccess(input.based_on_role_id, roles)
}

/** Effective permissions for every role in the graph, keyed by role id. */
export function expandRoleGraph(
  roles: readonly RoleNode[]
): Map<string, Set<Permission>> {
  return new Map(
    roles.map((role) => [role.id, getEffectivePermissions(role.id, roles)])
  )
}

/** Ids of roles that are (directly or transitively) based on `roleId`. */
export function getDescendantIds(
  roleId: string,
  roles: readonly RoleNode[]
): string[] {
  const rolesById = indexRoles(roles)
  return roles
    .filter(
      (role) =>
        role.id !== roleId &&
        getAncestorIds(role.id, rolesById).includes(roleId)
    )
    .map((role) => role.id)
}

export type UserRoleEdge = { user_id: string; role_id: string }

export type FullAccessImpact = {
  /** Distinct users whose effective permissions include FULL_ACCESS. */
  totalHolders: number
  /**
   * For each role: how many users would lose FULL_ACCESS entirely if that
   * role's own FULL_ACCESS were removed (counting descendants that only get
   * it through this role, and users whose other roles do not grant it).
   */
  holdersLostIfRemoved: Record<string, number>
}

/**
 * Computes how many people hold Full Access and what removing it from each
 * role would do, so the editor can warn before leaving fewer than two.
 */
export function computeFullAccessImpact(
  roles: readonly RoleNode[],
  userRoles: readonly UserRoleEdge[]
): FullAccessImpact {
  const effective = expandRoleGraph(roles)
  const grantingRoles = new Set(
    [...effective.entries()]
      .filter(([, permissions]) => permissions.has(Permission.FULL_ACCESS))
      .map(([id]) => id)
  )

  const rolesByUser = new Map<string, Set<string>>()
  for (const edge of userRoles) {
    const set = rolesByUser.get(edge.user_id) ?? new Set<string>()
    set.add(edge.role_id)
    rolesByUser.set(edge.user_id, set)
  }

  const holders = [...rolesByUser.entries()].filter(([, roleIds]) =>
    [...roleIds].some((id) => grantingRoles.has(id))
  )

  const holdersLostIfRemoved: Record<string, number> = {}
  for (const role of roles) {
    if (!role.permissions.includes(Permission.FULL_ACCESS)) {
      holdersLostIfRemoved[role.id] = 0
      continue
    }
    // Recompute the graph without this role's own FULL_ACCESS.
    const without = roles.map((r) =>
      r.id === role.id
        ? {
            ...r,
            permissions: r.permissions.filter(
              (p) => p !== Permission.FULL_ACCESS
            ),
          }
        : r
    )
    const stillGranting = new Set(
      [...expandRoleGraph(without).entries()]
        .filter(([, permissions]) => permissions.has(Permission.FULL_ACCESS))
        .map(([id]) => id)
    )
    holdersLostIfRemoved[role.id] = holders.filter(
      ([, roleIds]) => ![...roleIds].some((id) => stillGranting.has(id))
    ).length
  }

  return { totalHolders: holders.length, holdersLostIfRemoved }
}
