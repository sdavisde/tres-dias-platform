import { Permission, userHasPermission } from '@/lib/security'
import type { User } from '@/lib/users/types'
import {
  getEffectivePermissions,
  type RoleNode,
} from '@/services/identity/roles/inheritance'

function makeUser(permissions: Iterable<string>): User {
  return {
    id: 'user-1',
    firstName: 'Test',
    lastName: 'User',
    gender: null,
    email: 'test@example.com',
    phoneNumber: null,
    address: null,
    profilePhotoPath: null,
    profilePhotoUpdatedAt: null,
    roles: [],
    permissions: new Set(permissions),
    communityInformation: {
      churchAffiliation: null,
      weekendAttended: null,
      essentialsTrainingDate: null,
      specialGiftsAndSkills: null,
      isClergy: false,
    },
    teamMemberInfo: null,
    originalUser: null,
  }
}

describe('userHasPermission', () => {
  it('grants when any required permission is held', () => {
    const user = makeUser([Permission.READ_PAYMENTS])
    expect(userHasPermission(user, [Permission.READ_PAYMENTS])).toBe(true)
    expect(
      userHasPermission(user, [
        Permission.WRITE_PAYMENTS,
        Permission.READ_PAYMENTS,
      ])
    ).toBe(true)
    expect(userHasPermission(user, [Permission.WRITE_PAYMENTS])).toBe(false)
  })

  it('FULL_ACCESS short-circuits everything', () => {
    const user = makeUser([Permission.FULL_ACCESS])
    expect(userHasPermission(user, [Permission.WRITE_SETTINGS])).toBe(true)
  })

  it('sees inherited permissions once the user carries the expanded set', () => {
    // Treasurer is based on Board Member, which is based on Member. The user
    // service expands the chain before building `user.permissions`, so this
    // check needs no knowledge of inheritance.
    const graph: RoleNode[] = [
      {
        id: 'member',
        permissions: [Permission.READ_ADMIN_PORTAL],
        based_on_role_id: null,
      },
      {
        id: 'board',
        permissions: [Permission.READ_PAYMENTS],
        based_on_role_id: 'member',
      },
      {
        id: 'treasurer',
        permissions: [Permission.WRITE_PAYMENTS],
        based_on_role_id: 'board',
      },
    ]
    const user = makeUser(getEffectivePermissions('treasurer', graph))

    expect(userHasPermission(user, [Permission.WRITE_PAYMENTS])).toBe(true)
    expect(userHasPermission(user, [Permission.READ_PAYMENTS])).toBe(true)
    expect(userHasPermission(user, [Permission.READ_ADMIN_PORTAL])).toBe(true)
    expect(userHasPermission(user, [Permission.WRITE_USER_ROLES])).toBe(false)
  })
})
