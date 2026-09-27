import { err, isErr, isOk, ok } from '@/lib/results'
import { Permission } from '@/lib/security'
import type { User } from '@/lib/users/types'

// `server-only` is provided by Next's bundler, not an installed package.
jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('next/navigation', () => ({ unstable_rethrow: jest.fn() }))
jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}))

const getLoggedInUser = jest.fn()
jest.mock('@/services/identity/user/session', () => ({
  getLoggedInUser: () => getLoggedInUser(),
}))

import { authorizedAction } from './authorized-action'

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
    },
    teamMemberInfo: null,
    originalUser: null,
  }
}

describe('authorizedAction', () => {
  const action = jest.fn(async (_user: User, value: string) => ok(value))

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rejects an anonymous caller without running the action', async () => {
    getLoggedInUser.mockResolvedValue(err('no session'))
    const wrapped = authorizedAction(Permission.WRITE_EVENTS, action)

    const result = await wrapped('x')

    expect(isErr(result)).toBe(true)
    expect(action).not.toHaveBeenCalled()
  })

  it('rejects a caller without the permission', async () => {
    getLoggedInUser.mockResolvedValue(ok(makeUser([Permission.READ_EVENTS])))
    const wrapped = authorizedAction(Permission.WRITE_EVENTS, action)

    const result = await wrapped('x')

    expect(isErr(result)).toBe(true)
    expect(action).not.toHaveBeenCalled()
  })

  it('runs the action with the session user and the arguments', async () => {
    const user = makeUser([Permission.WRITE_EVENTS])
    getLoggedInUser.mockResolvedValue(ok(user))
    const wrapped = authorizedAction(
      [Permission.WRITE_PAYMENTS, Permission.WRITE_EVENTS],
      action
    )

    const result = await wrapped('x')

    expect(action).toHaveBeenCalledWith(user, 'x')
    expect(isOk(result) && result.data).toBe('x')
  })

  it("'authenticated' lets any signed-in user through", async () => {
    getLoggedInUser.mockResolvedValue(ok(makeUser([])))
    const wrapped = authorizedAction('authenticated', action)

    expect(isOk(await wrapped('x'))).toBe(true)
  })

  it('a predicate returning false denies the caller', async () => {
    getLoggedInUser.mockResolvedValue(ok(makeUser([])))
    const wrapped = authorizedAction(
      (user: User, value: string) => user.id === value,
      action
    )

    expect(isErr(await wrapped('someone-else'))).toBe(true)
    expect(action).not.toHaveBeenCalled()
    expect(isOk(await wrapped('user-1'))).toBe(true)
  })
})
