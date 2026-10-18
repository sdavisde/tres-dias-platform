import { isNil } from 'lodash'
import { Permission } from '@/lib/security'
import type { User } from '@/lib/users/types'
import { CHARole } from '@/lib/weekend/types'
import { canSendToAudience } from './audience-access'

const MENS = 'mens-weekend'
const WOMENS = 'womens-weekend'
const GROUP = 'group-11'

function sender({
  rolePermissions = [],
  chaRole = null,
}: {
  rolePermissions?: Permission[]
  chaRole?: CHARole | null
}): User {
  return {
    roles: [{ id: 'r', label: 'Role', permissions: rolePermissions }],
    permissions: new Set(rolePermissions),
    teamMemberInfo: isNil(chaRole)
      ? null
      : {
          groupMemberId: 'gm',
          groupId: GROUP,
          groupNumber: 11,
          weekendAssignments: [
            {
              rosterId: 'roster',
              weekendId: MENS,
              weekendType: 'MENS',
              chaRole,
              rollo: null,
              additionalChaRole: null,
            },
          ],
        },
  } as unknown as User
}

describe('canSendToAudience', () => {
  const mensTeam = { type: 'weekend_team', weekendId: MENS } as const
  const womensTeam = { type: 'weekend_team', weekendId: WOMENS } as const
  const bothTeams = { type: 'group_team', groupId: GROUP } as const
  const pescadores = { type: 'group_pescadores', groupId: GROUP } as const
  const community = { type: 'community' } as const

  it("lets a weekend's Head email only their own team", () => {
    const head = sender({ chaRole: CHARole.HEAD })
    expect(canSendToAudience(head, mensTeam)).toBe(true)
    expect(canSendToAudience(head, womensTeam)).toBe(false)
    expect(canSendToAudience(head, bothTeams)).toBe(false)
    expect(canSendToAudience(head, pescadores)).toBe(false)
    expect(canSendToAudience(head, community)).toBe(false)
  })

  it('gives non-leadership CHA roles nothing', () => {
    expect(canSendToAudience(sender({ chaRole: CHARole.TECH }), mensTeam)).toBe(
      false
    )
  })

  it('lets a role with SEND_WEEKEND_EMAIL reach any group, but not everyone', () => {
    const admin = sender({ rolePermissions: [Permission.SEND_WEEKEND_EMAIL] })
    expect(canSendToAudience(admin, womensTeam)).toBe(true)
    expect(canSendToAudience(admin, bothTeams)).toBe(true)
    expect(canSendToAudience(admin, pescadores)).toBe(true)
    expect(canSendToAudience(admin, community)).toBe(false)
  })

  it('lets SEND_COMMUNITY_EMAIL reach everyone', () => {
    const board = sender({ rolePermissions: [Permission.SEND_COMMUNITY_EMAIL] })
    expect(canSendToAudience(board, community)).toBe(true)
    expect(canSendToAudience(board, pescadores)).toBe(true)
  })
})
