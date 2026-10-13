import {
  adminNavItems,
  filterNavByPermission,
  getNavIcon,
  getVisibleNavItems,
  isNavItemActive,
  type AdminNavSection,
} from '@/lib/admin/navigation'
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

describe('adminNavItems', () => {
  it('lists the final IA in order', () => {
    expect(adminNavItems.map((item) => item.title)).toEqual([
      'Weekends',
      'Events',
      'Secuela',
      'People',
      'Community Board',
      'Security',
      'Payments',
      'Files',
      'Reports',
      'Billing',
      'Site settings',
    ])
  })

  it('routes to the expected hrefs', () => {
    expect(
      Object.fromEntries(adminNavItems.map((item) => [item.title, item.href]))
    ).toEqual({
      Weekends: '/admin/weekends',
      Events: '/admin/events',
      Secuela: '/admin/secuela',
      Payments: '/admin/payments',
      People: '/admin/people',
      'Community Board': '/admin/community-board',
      Files: '/admin/files',
      'Site settings': '/admin/settings',
      Billing: '/admin/billing',
      Security: '/admin/security',
      Reports: '/admin/reports',
    })
  })

  it('groups items into sidebar sections', () => {
    const titlesIn = (section: AdminNavSection) =>
      adminNavItems
        .filter((item) => item.footer !== true && item.section === section)
        .map((item) => item.title)
    expect(titlesIn(null)).toEqual([])
    expect(titlesIn('Weekends')).toEqual(['Weekends', 'Events', 'Secuela'])
    expect(titlesIn('Community')).toEqual([
      'People',
      'Community Board',
      'Security',
      'Payments',
      'Files',
      'Reports',
    ])
  })

  it('pins Billing and Site settings to the footer', () => {
    expect(
      adminNavItems
        .filter((item) => item.footer === true)
        .map((item) => item.title)
    ).toEqual(['Billing', 'Site settings'])
  })

  it('marks only Reports as SOON', () => {
    expect(
      adminNavItems
        .filter((item) => item.soon === true)
        .map((item) => item.title)
    ).toEqual(['Reports'])
  })

  it('uses the icons the design board calls for', () => {
    const iconName = (href: string) => getNavIcon(href)?.displayName
    expect(iconName('/admin/weekends')).toBe('Calendar')
    expect(iconName('/admin/events')).toBe('Clock')
    expect(iconName('/admin/payments')).toBe('CreditCard')
    expect(iconName('/admin/billing')).toBe('Receipt')
  })

  it('has an icon for every item, exposed via getNavIcon', () => {
    for (const item of adminNavItems) {
      expect(getNavIcon(item.href)).toBe(item.icon)
    }
    expect(getNavIcon('/nowhere')).toBeUndefined()
  })
})

describe('filterNavByPermission', () => {
  it('keeps permissionless items for any user', () => {
    const user = makeUser([])
    const titles = filterNavByPermission(adminNavItems, user).map(
      (item) => item.title
    )
    expect(titles).toEqual(['People', 'Community Board', 'Files', 'Reports'])
  })

  it('restricts Site settings to FULL_ACCESS', () => {
    const titles = (permissions: Permission[]) =>
      filterNavByPermission(adminNavItems, makeUser(permissions)).map(
        (item) => item.title
      )
    expect(titles([Permission.READ_WEEKENDS])).not.toContain('Site settings')
    expect(titles([Permission.FULL_ACCESS])).toContain('Site settings')
  })

  it('shows Billing only with MANAGE_BILLING or FULL_ACCESS', () => {
    const titles = (permissions: Permission[]) =>
      filterNavByPermission(adminNavItems, makeUser(permissions)).map(
        (item) => item.title
      )
    expect(titles([])).not.toContain('Billing')
    expect(
      titles([Permission.READ_PAYMENTS, Permission.WRITE_SETTINGS])
    ).not.toContain('Billing')
    expect(titles([Permission.MANAGE_BILLING])).toContain('Billing')
    expect(titles([Permission.FULL_ACCESS])).toContain('Billing')
  })

  it('shows gated items when the user holds the permission', () => {
    const user = makeUser([Permission.READ_WEEKENDS, Permission.READ_PAYMENTS])
    const titles = filterNavByPermission(adminNavItems, user).map(
      (item) => item.title
    )
    expect(titles).toContain('Weekends')
    expect(titles).toContain('Payments')
    expect(titles).not.toContain('Events')
    expect(titles).not.toContain('Security')
  })

  it('shows everything for FULL_ACCESS', () => {
    const user = makeUser([Permission.FULL_ACCESS])
    expect(filterNavByPermission(adminNavItems, user)).toHaveLength(
      adminNavItems.length
    )
  })
})

describe('getVisibleNavItems', () => {
  it('returns serializable items without icon components', () => {
    const user = makeUser([Permission.FULL_ACCESS])
    for (const item of getVisibleNavItems(user)) {
      expect(Object.keys(item).sort()).toEqual([
        'footer',
        'href',
        'section',
        'soon',
        'title',
      ])
      expect(typeof item.title).toBe('string')
      expect(typeof item.href).toBe('string')
    }
  })
})

describe('isNavItemActive', () => {
  it('matches /admin exactly only', () => {
    expect(isNavItemActive('/admin', '/admin')).toBe(true)
    expect(isNavItemActive('/admin', '/admin/weekends')).toBe(false)
  })

  it('matches section prefixes for nested routes', () => {
    expect(isNavItemActive('/admin/weekends', '/admin/weekends')).toBe(true)
    expect(isNavItemActive('/admin/weekends', '/admin/weekends/abc-123')).toBe(
      true
    )
    expect(isNavItemActive('/admin/payments', '/admin/payments/summary')).toBe(
      true
    )
    expect(isNavItemActive('/admin/weekends', '/admin/payments')).toBe(false)
  })

  it('does not match sibling routes sharing a prefix string', () => {
    expect(isNavItemActive('/admin/events', '/admin/events-archive')).toBe(
      false
    )
  })
})
