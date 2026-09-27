import 'server-only'

import { isNil, uniq } from 'lodash'
import type { Result } from '@/lib/results'
import { err, isErr, ok } from '@/lib/results'
import * as RoleRepository from './repository'
import type { Tables } from '@/database.types'
import { Permission, userHasPermission } from '@/lib/security'
import type { User } from '@/lib/users/types'
import type { Role, RoleInput, RoleUsageById } from './types'
import { roleInputSchema } from './validation'
import {
  computeFullAccessImpact,
  getEffectivePermissions,
  inputGrantsFullAccess,
  roleGrantsFullAccess,
  wouldCreateCycle,
  type FullAccessImpact,
} from './inheritance'

export const FULL_ACCESS_GRANT_REFUSED =
  'Only someone with Full Access can grant or edit Full Access.'

/**
 * WRITE_USER_ROLES lets a board member manage roles, but must never be a
 * ladder to FULL_ACCESS: granting it, editing a role that has it, or basing a
 * role on one that has it all require the actor to hold FULL_ACCESS already.
 * The database enforces the same rule (role_grants_full_access policies).
 */
function mayTouchFullAccess(actor: User): boolean {
  return userHasPermission(actor, [Permission.FULL_ACCESS])
}

function normalizeRole(rawRole: Tables<'roles'>): Role {
  return {
    id: rawRole.id,
    label: rawRole.label,
    permissions: rawRole.permissions as Array<Permission>,
    type: rawRole.type ?? 'INDIVIDUAL',
    description: rawRole.description ?? null,
    based_on_role_id: rawRole.based_on_role_id ?? null,
  }
}

export async function getRoles(): Promise<Result<string, Role[]>> {
  const result = await RoleRepository.getAllRoles()
  if (isErr(result)) {
    return result
  }
  const roles = result.data.map(normalizeRole)
  return ok(roles)
}

/**
 * Effective permissions (own ∪ ancestors') for one role, resolved through the
 * shared inheritance module.
 */
export async function getRoleEffectivePermissions(
  roleId: string
): Promise<Result<string, Permission[]>> {
  const graph = await RoleRepository.getRoleGraph()
  if (isErr(graph)) {
    return graph
  }
  return ok([...getEffectivePermissions(roleId, graph.data)])
}

/** How each role is referenced (users holding it, roles based on it). */
export async function getRoleUsage(): Promise<Result<string, RoleUsageById>> {
  const [rolesResult, edgesResult] = await Promise.all([
    RoleRepository.getRoleGraph(),
    RoleRepository.getAllUserRoleEdges(),
  ])
  if (isErr(rolesResult)) return rolesResult
  if (isErr(edgesResult)) return edgesResult

  const usage: RoleUsageById = {}
  for (const role of rolesResult.data) {
    usage[role.id] = { userCount: 0, dependentRoleIds: [] }
  }
  for (const role of rolesResult.data) {
    if (!isNil(role.based_on_role_id) && !isNil(usage[role.based_on_role_id])) {
      usage[role.based_on_role_id].dependentRoleIds.push(role.id)
    }
  }
  const usersByRole = new Map<string, Set<string>>()
  for (const edge of edgesResult.data) {
    const set = usersByRole.get(edge.role_id) ?? new Set<string>()
    set.add(edge.user_id)
    usersByRole.set(edge.role_id, set)
  }
  for (const [roleId, users] of usersByRole) {
    if (!isNil(usage[roleId])) usage[roleId].userCount = users.size
  }
  return ok(usage)
}

/** How many people hold Full Access, and what removing it from each role costs. */
export async function getFullAccessImpact(): Promise<
  Result<string, FullAccessImpact>
> {
  const [rolesResult, edgesResult] = await Promise.all([
    RoleRepository.getRoleGraph(),
    RoleRepository.getAllUserRoleEdges(),
  ])
  if (isErr(rolesResult)) return rolesResult
  if (isErr(edgesResult)) return edgesResult
  return ok(computeFullAccessImpact(rolesResult.data, edgesResult.data))
}

async function validateRoleInput(
  roleId: string | null,
  input: RoleInput
): Promise<Result<string, RoleInput>> {
  const parsed = roleInputSchema.safeParse(input)
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid role')
  }
  const clean: RoleInput = {
    ...parsed.data,
    permissions: uniq(parsed.data.permissions),
  }

  if (!isNil(clean.based_on_role_id)) {
    const graph = await RoleRepository.getRoleGraph()
    if (isErr(graph)) return graph
    const parent = graph.data.find((r) => r.id === clean.based_on_role_id)
    if (isNil(parent)) {
      return err('The role this one is based on no longer exists')
    }
    if (
      !isNil(roleId) &&
      wouldCreateCycle(roleId, clean.based_on_role_id, graph.data)
    ) {
      return err(
        'That would make the role based on itself — pick a different role'
      )
    }
  }

  return ok(clean)
}

export async function updateRole(
  roleId: string,
  input: RoleInput,
  actor: User
): Promise<Result<string, Role>> {
  const validated = await validateRoleInput(roleId, input)
  if (isErr(validated)) return validated
  if (!mayTouchFullAccess(actor)) {
    const graph = await RoleRepository.getRoleGraph()
    if (isErr(graph)) return graph
    if (
      roleGrantsFullAccess(roleId, graph.data) ||
      inputGrantsFullAccess(validated.data, graph.data)
    ) {
      return err(FULL_ACCESS_GRANT_REFUSED)
    }
  }
  const result = await RoleRepository.updateRole(roleId, validated.data)
  if (isErr(result)) return result
  return ok(normalizeRole(result.data))
}

export async function createRole(
  input: RoleInput,
  actor: User
): Promise<Result<string, Role>> {
  const validated = await validateRoleInput(null, input)
  if (isErr(validated)) return validated
  if (!mayTouchFullAccess(actor)) {
    const graph = await RoleRepository.getRoleGraph()
    if (isErr(graph)) return graph
    if (inputGrantsFullAccess(validated.data, graph.data)) {
      return err(FULL_ACCESS_GRANT_REFUSED)
    }
  }
  const roleResult = await RoleRepository.createRole(validated.data)
  if (isErr(roleResult)) {
    return roleResult
  }
  return ok(normalizeRole(roleResult.data))
}

/**
 * Creates a copy of an existing role: same type, parent and own permissions,
 * with a "(copy)" label until renamed.
 */
export async function duplicateRole(
  sourceRoleId: string,
  actor: User,
  label?: string
): Promise<Result<string, Role>> {
  const rolesResult = await RoleRepository.getAllRoles()
  if (isErr(rolesResult)) return rolesResult
  const source = rolesResult.data.find((r) => r.id === sourceRoleId)
  if (isNil(source)) return err('Role not found')

  return await createRole(
    {
      label: label ?? `${source.label} (copy)`,
      description: source.description ?? '',
      type: source.type ?? 'INDIVIDUAL',
      based_on_role_id: source.based_on_role_id ?? null,
      permissions: source.permissions as Permission[],
    },
    actor
  )
}

/** Refuses when any of `roleIds` grants FULL_ACCESS and the actor lacks it. */
async function assertMayAssign(
  roleIds: readonly string[],
  actor: User
): Promise<Result<string, null>> {
  if (mayTouchFullAccess(actor)) return ok(null)
  const graph = await RoleRepository.getRoleGraph()
  if (isErr(graph)) return graph
  if (roleIds.some((id) => roleGrantsFullAccess(id, graph.data))) {
    return err(FULL_ACCESS_GRANT_REFUSED)
  }
  return ok(null)
}

/**
 * Deletes a role, refusing while anything still depends on it so the admin
 * sees why instead of a foreign-key error.
 */
export async function deleteRole(
  roleId: string
): Promise<Result<string, null>> {
  const usageResult = await getRoleUsage()
  if (isErr(usageResult)) return usageResult
  const usage = usageResult.data[roleId]
  if (isNil(usage)) return err('Role not found')

  if (usage.dependentRoleIds.length > 0) {
    return err(
      `${usage.dependentRoleIds.length} other ${
        usage.dependentRoleIds.length === 1 ? 'role is' : 'roles are'
      } based on this role. Change what they are based on first.`
    )
  }
  if (usage.userCount > 0) {
    return err(
      `${usage.userCount} ${
        usage.userCount === 1 ? 'person holds' : 'people hold'
      } this role. Remove it from them on the People page first.`
    )
  }

  return await RoleRepository.deleteRole(roleId)
}

export async function updateUserRoles(
  userId: string,
  roleIds: string[],
  actor: User
): Promise<Result<string, Array<Tables<'user_roles'>>>> {
  const allowed = await assertMayAssign(roleIds, actor)
  if (isErr(allowed)) return allowed
  const result = await RoleRepository.updateUserRoles(userId, roleIds)
  if (isErr(result)) {
    return result
  }
  return ok(result.data ?? [])
}

export async function removeAllUserRoles(
  userId: string
): Promise<Result<string, null>> {
  return await RoleRepository.removeAllUserRoles(userId)
}

/**
 * Sets the complete list of users assigned to a role.
 * For COMMITTEE roles, this replaces all current members with the new list.
 */
export async function setRoleMembers(
  roleId: string,
  userIds: string[],
  actor: User
): Promise<Result<string, Array<Tables<'user_roles'>>>> {
  const allowed = await assertMayAssign([roleId], actor)
  if (isErr(allowed)) return allowed
  const result = await RoleRepository.setRoleMembers(roleId, userIds)
  if (isErr(result)) {
    return result
  }
  return ok(result.data ?? [])
}
