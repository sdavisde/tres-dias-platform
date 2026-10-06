import {
  activeMemberNavKey,
  filterMemberNav,
  getMemberNav,
  getMemberNavIcon,
  getTabBarItems,
  memberFooterNavItems,
  memberNavItems,
  resolveMemberNavHref,
  type MemberNavContext,
} from '@/lib/member/navigation'
import { Permission } from '@/lib/security'
import type { User } from '@/lib/users/types'
import type { TeamMemberInfo } from '@/lib/weekend/types'

function makeUser(
  permissions: Permission[],
  teamMemberInfo: TeamMemberInfo | null = null
): User {
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
    teamMemberInfo,
    originalUser: null,
  }
}

const onTeam: TeamMemberInfo = {
  groupMemberId: 'gm-1',
  groupId: 'group-1',
  groupNumber: 12,
  weekendAssignments: [],
}

describe('memberNavItems', () => {
  it('names the menu after member tasks, in board order', () => {
    expect(memberNavItems.map((item) => item.title)).toEqual([
      'Home',
      'Sponsor a candidate',
      'My forms',
      'Online payment',
      'The weekend',
      'Documents',
      'Review candidates',
      'Roster builder',
    ])
    expect(memberFooterNavItems.map((item) => item.title)).toEqual([
      'My account',
      'Admin',
    ])
  })

  it('groups items into the board sections', () => {
    const sections = Object.fromEntries(
      memberNavItems.map((item) => [item.title, item.section])
    )
    expect(sections).toEqual({
      Home: null,
      'Sponsor a candidate': 'Do something',
      'My forms': 'Do something',
      'Online payment': 'Do something',
      'The weekend': 'Find',
      Documents: 'Find',
      'Review candidates': 'Role tools',
      'Roster builder': 'Role tools',
    })
  })

  it('resolves an icon for every item', () => {
    for (const item of [...memberNavItems, ...memberFooterNavItems]) {
      expect(getMemberNavIcon(item.key)).toBe(item.icon)
    }
  })

  it('points the weekend items at the hub', () => {
    const hrefs = Object.fromEntries(
      memberNavItems.map((item) => [item.key, item.href])
    )
    expect(hrefs.weekends).toBe('/weekends')
  })
})

describe('filterMemberNav', () => {
  it('hides team-only items from people not on the active team', () => {
    const titles = filterMemberNav(memberNavItems, makeUser([])).map(
      (item) => item.title
    )
    expect(titles).not.toContain('My forms')
    expect(titles).toContain('Online payment')
  })

  it('shows team-only items to team members', () => {
    const titles = filterMemberNav(memberNavItems, makeUser([], onTeam)).map(
      (item) => item.title
    )
    expect(titles).toContain('My forms')
    expect(titles).toContain('Online payment')
  })

  it('shows role tools only with their permission and an active group', () => {
    const active: MemberNavContext = { activeGroupId: 'g12' }
    const titles = (permissions: Permission[], context = active) =>
      getMemberNav(makeUser(permissions), context).main.map((i) => i.title)

    expect(titles([])).not.toContain('Review candidates')
    expect(titles([])).not.toContain('Roster builder')
    expect(titles([Permission.READ_CANDIDATES])).toContain('Review candidates')
    expect(titles([Permission.READ_TEAM_ROSTER_BUILDER])).toContain(
      'Roster builder'
    )
    expect(
      titles([Permission.READ_CANDIDATES], { activeGroupId: null })
    ).not.toContain('Review candidates')
  })

  it('shows Admin only with the admin-portal permission', () => {
    expect(getMemberNav(makeUser([])).footer.map((i) => i.title)).toEqual([
      'My account',
    ])
    expect(
      getMemberNav(makeUser([Permission.READ_ADMIN_PORTAL])).footer.map(
        (i) => i.title
      )
    ).toEqual(['My account', 'Admin'])
    expect(
      getMemberNav(makeUser([Permission.FULL_ACCESS])).footer.map(
        (i) => i.title
      )
    ).toEqual(['My account', 'Admin'])
  })

  it('serializes without icon components', () => {
    const nav = getMemberNav(makeUser([]))
    for (const item of [...nav.main, ...nav.footer]) {
      expect(Object.keys(item).sort()).toEqual(
        [
          'href',
          'key',
          'matchHref',
          'section',
          'tab',
          'tabLabel',
          'tabOrder',
          'title',
        ].sort()
      )
    }
  })
})

describe('resolveMemberNavHref', () => {
  it("sends The weekend to the viewer's own active weekend", () => {
    const weekends = memberNavItems.find((item) => item.key === 'weekends')!
    expect(resolveMemberNavHref(weekends, { activeGroupId: 'g12' })).toBe(
      '/weekends/g12/mens'
    )
    expect(
      resolveMemberNavHref(weekends, { activeGroupId: 'g12', gender: 'female' })
    ).toBe('/weekends/g12/womens')
  })

  it('falls back to the weekends index without an active group', () => {
    const weekends = memberNavItems.find((item) => item.key === 'weekends')!
    expect(resolveMemberNavHref(weekends, { activeGroupId: null })).toBe(
      '/weekends'
    )
  })

  it("sends Review candidates to the active group's queue", () => {
    const review = memberNavItems.find(
      (item) => item.key === 'review-candidates'
    )!
    expect(resolveMemberNavHref(review, { activeGroupId: 'g12' })).toBe(
      '/weekends/g12/mens/review-candidates'
    )
  })

  it('leaves every other item alone', () => {
    const nav = getMemberNav(makeUser([], onTeam), { activeGroupId: 'g12' })
    const hrefs = Object.fromEntries(nav.main.map((i) => [i.key, i.href]))
    expect(hrefs).toEqual({
      home: '/home',
      sponsor: '/sponsor',
      'my-forms': '/team-forms',
      'online-payment': '/payment',
      weekends: '/weekends/g12/mens',
      documents: '/files',
    })
  })
})

describe('getTabBarItems', () => {
  it('lists the phone tabs in order', () => {
    const tabs = getTabBarItems(getMemberNav(makeUser([], onTeam)))
    expect(tabs.map((item) => item.title)).toEqual([
      'Home',
      'Weekend',
      'Documents',
      'Payments',
      'My account',
    ])
  })

  it('keeps the sidebar title on the item itself', () => {
    const nav = getMemberNav(makeUser([], onTeam))
    expect(nav.main.find((item) => item.key === 'weekends')?.title).toBe(
      'The weekend'
    )
  })
})

describe('activeMemberNavKey', () => {
  const nav = getMemberNav(makeUser([], onTeam), { activeGroupId: 'g12' })
  const items = [...nav.main, ...nav.footer]

  it('matches the route and its children only', () => {
    expect(activeMemberNavKey(items, '/files')).toBe('documents')
    expect(activeMemberNavKey(items, '/files/handbook')).toBe('documents')
    expect(activeMemberNavKey(items, '/filesystem')).toBeNull()
    expect(activeMemberNavKey(items, '/')).toBeNull()
  })

  it('lights up The weekend on every weekend page', () => {
    expect(activeMemberNavKey(items, '/weekends')).toBe('weekends')
    expect(activeMemberNavKey(items, '/weekends/g12/mens')).toBe('weekends')
    expect(activeMemberNavKey(items, '/weekends/g12/womens/team')).toBe(
      'weekends'
    )
    // Another group's pages still belong to the weekends section.
    expect(activeMemberNavKey(items, '/weekends/g11/mens/team')).toBe(
      'weekends'
    )
  })

  it('lets the review queue win over The weekend', () => {
    const nav = getMemberNav(makeUser([Permission.READ_CANDIDATES]), {
      activeGroupId: 'g12',
    })
    const all = [...nav.main, ...nav.footer]
    expect(
      activeMemberNavKey(all, '/weekends/g12/womens/review-candidates')
    ).toBe('review-candidates')
  })
})
