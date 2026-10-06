import { evaluatePageGuard } from '@/lib/admin/page-guard'
import { Errors } from '@/lib/error'
import { Permission } from '@/lib/security'
import type { User } from '@/lib/users/types'

function makeUser(permissions: Permission[]): User {
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

describe('evaluatePageGuard', () => {
  it('denies when no user is present', () => {
    const decision = evaluatePageGuard(null, {
      required: [Permission.READ_WEEKENDS],
    })
    expect(decision).toEqual({
      allowed: false,
      reason: Errors.NOT_LOGGED_IN.toString(),
    })
  })

  it('denies when the user lacks the required permission', () => {
    const decision = evaluatePageGuard(makeUser([]), {
      required: [Permission.READ_WEEKENDS],
    })
    expect(decision).toEqual({
      allowed: false,
      reason: Errors.INSUFFICIENT_PERMISSIONS.toString(),
    })
  })

  it('grants when the user holds a required permission', () => {
    const decision = evaluatePageGuard(makeUser([Permission.READ_WEEKENDS]), {
      required: [Permission.READ_WEEKENDS],
    })
    expect(decision).toEqual({ allowed: true, canEdit: false })
  })

  it('grants with no required permissions (portal gate only)', () => {
    expect(evaluatePageGuard(makeUser([]), {})).toEqual({
      allowed: true,
      canEdit: false,
    })
  })

  it('derives canEdit from the edit permissions', () => {
    const user = makeUser([Permission.READ_WEEKENDS, Permission.WRITE_WEEKENDS])
    expect(
      evaluatePageGuard(user, {
        required: [Permission.READ_WEEKENDS],
        edit: [Permission.WRITE_WEEKENDS],
      })
    ).toEqual({ allowed: true, canEdit: true })
    expect(
      evaluatePageGuard(makeUser([Permission.READ_WEEKENDS]), {
        required: [Permission.READ_WEEKENDS],
        edit: [Permission.WRITE_WEEKENDS],
      })
    ).toEqual({ allowed: true, canEdit: false })
  })

  it('grants everything to FULL_ACCESS', () => {
    const decision = evaluatePageGuard(makeUser([Permission.FULL_ACCESS]), {
      required: [Permission.READ_USER_ROLES],
      edit: [Permission.WRITE_USER_ROLES],
    })
    expect(decision).toEqual({ allowed: true, canEdit: true })
  })
})
