import { Permission } from '@/lib/security'
import {
  computeFullAccessImpact,
  expandRoleGraph,
  getAncestorIds,
  getDescendantIds,
  getEffectivePermissions,
  getInheritedPermissions,
  indexRoles,
  inputGrantsFullAccess,
  roleGrantsFullAccess,
  wouldCreateCycle,
  type RoleNode,
} from './inheritance'

const member: RoleNode = {
  id: 'member',
  permissions: [Permission.READ_ADMIN_PORTAL],
  based_on_role_id: null,
}
const board: RoleNode = {
  id: 'board',
  permissions: [Permission.READ_PAYMENTS, Permission.READ_WEEKENDS],
  based_on_role_id: 'member',
}
const president: RoleNode = {
  id: 'president',
  permissions: [Permission.WRITE_WEEKENDS, Permission.READ_PAYMENTS],
  based_on_role_id: 'board',
}
const treasurer: RoleNode = {
  id: 'treasurer',
  permissions: [Permission.WRITE_PAYMENTS],
  based_on_role_id: 'board',
}
const fullAccess: RoleNode = {
  id: 'full',
  permissions: [Permission.FULL_ACCESS],
  based_on_role_id: null,
}
const roles = [member, board, president, treasurer, fullAccess]

describe('getAncestorIds', () => {
  it('walks the chain nearest first', () => {
    expect(getAncestorIds('president', indexRoles(roles))).toEqual([
      'board',
      'member',
    ])
    expect(getAncestorIds('member', indexRoles(roles))).toEqual([])
  })

  it('stops on a pre-existing loop instead of spinning', () => {
    const looped: RoleNode[] = [
      { id: 'a', permissions: [], based_on_role_id: 'b' },
      { id: 'b', permissions: [], based_on_role_id: 'a' },
    ]
    expect(getAncestorIds('a', indexRoles(looped))).toEqual(['b'])
  })
})

describe('effective permissions', () => {
  it('unions own with every ancestor', () => {
    expect([...getEffectivePermissions('president', roles)].sort()).toEqual(
      [
        Permission.READ_ADMIN_PORTAL,
        Permission.READ_PAYMENTS,
        Permission.READ_WEEKENDS,
        Permission.WRITE_WEEKENDS,
      ].sort()
    )
  })

  it('separates inherited from own', () => {
    expect([...getInheritedPermissions('treasurer', roles)].sort()).toEqual(
      [
        Permission.READ_ADMIN_PORTAL,
        Permission.READ_PAYMENTS,
        Permission.READ_WEEKENDS,
      ].sort()
    )
  })

  it('never subtracts: a child cannot drop what the parent grants', () => {
    const child: RoleNode = {
      id: 'child',
      permissions: [],
      based_on_role_id: 'board',
    }
    const effective = getEffectivePermissions('child', [...roles, child])
    expect(effective.has(Permission.READ_PAYMENTS)).toBe(true)
    expect(effective.has(Permission.READ_ADMIN_PORTAL)).toBe(true)
  })

  it('expands the whole graph', () => {
    const expanded = expandRoleGraph(roles)
    expect(expanded.get('member')).toEqual(
      new Set([Permission.READ_ADMIN_PORTAL])
    )
    expect(expanded.get('treasurer')?.has(Permission.WRITE_PAYMENTS)).toBe(true)
    expect(expanded.get('treasurer')?.has(Permission.READ_ADMIN_PORTAL)).toBe(
      true
    )
    expect(expanded.get('full')).toEqual(new Set([Permission.FULL_ACCESS]))
  })
})

describe('wouldCreateCycle', () => {
  it('rejects self-reference and any loop through ancestors', () => {
    expect(wouldCreateCycle('board', 'board', roles)).toBe(true)
    expect(wouldCreateCycle('member', 'president', roles)).toBe(true)
    expect(wouldCreateCycle('board', 'treasurer', roles)).toBe(true)
  })

  it('allows a fresh edge and clearing the parent', () => {
    expect(wouldCreateCycle('full', 'president', roles)).toBe(false)
    expect(wouldCreateCycle('president', null, roles)).toBe(false)
    expect(wouldCreateCycle('treasurer', 'president', roles)).toBe(false)
  })
})

describe('getDescendantIds', () => {
  it('lists every role that transitively depends on a role', () => {
    expect(getDescendantIds('member', roles).sort()).toEqual([
      'board',
      'president',
      'treasurer',
    ])
    expect(getDescendantIds('board', roles).sort()).toEqual([
      'president',
      'treasurer',
    ])
    expect(getDescendantIds('full', roles)).toEqual([])
  })
})

describe('computeFullAccessImpact', () => {
  const superAdmin: RoleNode = {
    id: 'super',
    permissions: [],
    based_on_role_id: 'full',
  }
  const graph = [...roles, superAdmin]

  it('counts distinct holders through inheritance', () => {
    const impact = computeFullAccessImpact(graph, [
      { user_id: 'u1', role_id: 'full' },
      { user_id: 'u1', role_id: 'board' },
      { user_id: 'u2', role_id: 'super' },
      { user_id: 'u3', role_id: 'board' },
    ])
    expect(impact.totalHolders).toBe(2)
  })

  it('reports how many would lose it if a role dropped FULL_ACCESS', () => {
    const impact = computeFullAccessImpact(graph, [
      { user_id: 'u1', role_id: 'full' },
      { user_id: 'u2', role_id: 'super' },
      { user_id: 'u3', role_id: 'board' },
    ])
    // Removing it from `full` also strips `super`, which only inherits it.
    expect(impact.holdersLostIfRemoved.full).toBe(2)
    expect(impact.holdersLostIfRemoved.board).toBe(0)
  })

  it('does not count a user who keeps it through another role', () => {
    const backup: RoleNode = {
      id: 'backup',
      permissions: [Permission.FULL_ACCESS],
      based_on_role_id: null,
    }
    const impact = computeFullAccessImpact(
      [...graph, backup],
      [
        { user_id: 'u1', role_id: 'full' },
        { user_id: 'u1', role_id: 'backup' },
        { user_id: 'u2', role_id: 'full' },
      ]
    )
    expect(impact.totalHolders).toBe(2)
    expect(impact.holdersLostIfRemoved.full).toBe(1)
    expect(impact.holdersLostIfRemoved.backup).toBe(0)
  })
})

describe('FULL_ACCESS grant detection', () => {
  const fullAccess: RoleNode = {
    id: 'full-access',
    permissions: [Permission.FULL_ACCESS],
    based_on_role_id: null,
  }
  const inheritsFullAccess: RoleNode = {
    id: 'inherits',
    permissions: [],
    based_on_role_id: 'full-access',
  }
  const graph = [member, board, fullAccess, inheritsFullAccess]

  it('flags roles that grant FULL_ACCESS directly or through a parent', () => {
    expect(roleGrantsFullAccess('full-access', graph)).toBe(true)
    expect(roleGrantsFullAccess('inherits', graph)).toBe(true)
    expect(roleGrantsFullAccess('board', graph)).toBe(false)
  })

  it('flags role inputs that would grant FULL_ACCESS', () => {
    expect(
      inputGrantsFullAccess(
        { permissions: [Permission.FULL_ACCESS], based_on_role_id: null },
        graph
      )
    ).toBe(true)
    expect(
      inputGrantsFullAccess(
        { permissions: [], based_on_role_id: 'inherits' },
        graph
      )
    ).toBe(true)
    expect(
      inputGrantsFullAccess(
        {
          permissions: [Permission.WRITE_USER_ROLES],
          based_on_role_id: 'board',
        },
        graph
      )
    ).toBe(false)
  })
})
