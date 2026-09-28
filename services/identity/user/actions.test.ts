import { isErr, isOk, ok, err } from '@/lib/results'
import type { User } from '@/lib/users/types'

// `server-only` is provided by Next's bundler, not an installed package, so mock
// it virtually to let the action -> service -> repository chain import cleanly.
jest.mock('server-only', () => ({}), { virtual: true })

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

// The session primitive `authorizedAction` reads. Each test decides who (if
// anyone) is signed in.
const getLoggedInUser = jest.fn()
jest.mock('@/services/identity/user/session', () => ({
  getLoggedInUser: () => getLoggedInUser(),
}))

// Capture what the repository writes by stubbing the server Supabase client.
type UsersUpdate = {
  profile_photo_path: string | null
  profile_photo_updated_at: string | null
}
const eqMock = jest.fn().mockResolvedValue({ data: null, error: null })
const updateMock = jest.fn((_payload: UsersUpdate) => ({ eq: eqMock }))
const fromMock = jest.fn(() => ({ update: updateMock }))
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({ from: fromMock }),
}))

import { removeUserProfilePhoto, updateUserProfilePhoto } from './actions'

const owner = { id: 'user-1', permissions: new Set() } as unknown as User
const someoneElse = { id: 'user-2', permissions: new Set() } as unknown as User

describe('profile photo actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rejects updateUserProfilePhoto when nobody is signed in and writes nothing', async () => {
    getLoggedInUser.mockResolvedValue(err('no session'))

    const result = await updateUserProfilePhoto('user-1', 'user-1.webp')

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error).toMatch(/Unauthorized/)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('rejects updateUserProfilePhoto for a different signed-in user', async () => {
    getLoggedInUser.mockResolvedValue(ok(someoneElse))

    const result = await updateUserProfilePhoto('user-1', 'user-1.webp')

    expect(isErr(result)).toBe(true)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('updateUserProfilePhoto sets the path and a fresh updated_at for the owner', async () => {
    getLoggedInUser.mockResolvedValue(ok(owner))

    const result = await updateUserProfilePhoto('user-1', 'user-1.webp')

    expect(fromMock).toHaveBeenCalledWith('users')
    expect(eqMock).toHaveBeenCalledWith('id', 'user-1')
    expect(updateMock).toHaveBeenCalledTimes(1)

    const payload = updateMock.mock.calls[0]![0]
    expect(payload.profile_photo_path).toBe('user-1.webp')
    expect(typeof payload.profile_photo_updated_at).toBe('string')
    expect(Date.parse(payload.profile_photo_updated_at ?? '')).not.toBeNaN()

    expect(isOk(result)).toBe(true)
  })

  it('removeUserProfilePhoto clears both photo columns for the owner', async () => {
    getLoggedInUser.mockResolvedValue(ok(owner))

    const result = await removeUserProfilePhoto('user-1')

    expect(eqMock).toHaveBeenCalledWith('id', 'user-1')
    expect(updateMock).toHaveBeenCalledTimes(1)

    const payload = updateMock.mock.calls[0]![0]
    expect(payload.profile_photo_path).toBeNull()
    expect(payload.profile_photo_updated_at).toBeNull()

    expect(isOk(result)).toBe(true)
  })
})
