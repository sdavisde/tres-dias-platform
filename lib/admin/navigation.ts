import { Permission, userHasPermission } from '@/lib/security'
import type { User } from '@/lib/users/types'
import {
  BarChart3,
  Calendar,
  Clock,
  CreditCard,
  Folder,
  HandHeart,
  Landmark,
  Receipt,
  Settings2,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'

/**
 * Sidebar sections, in order. `null` is the unlabeled top group under
 * "Back to member site" (the logo is the Dashboard link); footer items ignore
 * their section.
 */
export type AdminNavSection = null | 'Weekends' | 'Community'

export const ADMIN_NAV_SECTION_ORDER: AdminNavSection[] = [
  null,
  'Weekends',
  'Community',
]

export type AdminNavItem = {
  title: string
  href: string
  icon: LucideIcon
  section: AdminNavSection
  /** Empty means visible to anyone who cleared the admin-portal gate. */
  permissionsNeeded: Permission[]
  /** Marked "SOON" in the sidebar and rendered as a non-link. */
  soon?: boolean
  /** Rendered at the bottom of the sidebar, just above the user row. */
  footer?: boolean
}

/**
 * The single source of truth for admin navigation: order, routes, icons, and
 * required permissions. The sidebar renders exactly this list.
 */
export const adminNavItems: AdminNavItem[] = [
  {
    title: 'Weekends',
    section: 'Weekends',
    href: '/admin/weekends',
    icon: Calendar,
    permissionsNeeded: [Permission.READ_WEEKENDS],
  },
  {
    title: 'Events',
    section: 'Weekends',
    href: '/admin/events',
    icon: Clock,
    permissionsNeeded: [Permission.READ_EVENTS],
  },
  {
    title: 'Secuela',
    section: 'Weekends',
    href: '/admin/secuela',
    icon: HandHeart,
    permissionsNeeded: [Permission.READ_EVENTS],
  },
  {
    title: 'People',
    section: 'Community',
    href: '/admin/people',
    icon: Users,
    permissionsNeeded: [],
  },
  {
    title: 'Community Board',
    section: 'Community',
    href: '/admin/community-board',
    icon: Landmark,
    permissionsNeeded: [],
  },
  {
    title: 'Security',
    section: 'Community',
    href: '/admin/security',
    icon: ShieldCheck,
    permissionsNeeded: [Permission.READ_USER_ROLES],
  },
  {
    title: 'Payments',
    section: 'Community',
    href: '/admin/payments',
    icon: CreditCard,
    permissionsNeeded: [Permission.READ_PAYMENTS],
  },
  {
    title: 'Files',
    section: 'Community',
    href: '/admin/files',
    icon: Folder,
    permissionsNeeded: [],
  },
  {
    title: 'Reports',
    section: 'Community',
    href: '/admin/reports',
    icon: BarChart3,
    permissionsNeeded: [],
    soon: true,
  },
  {
    title: 'Billing',
    section: null,
    href: '/admin/billing',
    icon: Receipt,
    permissionsNeeded: [Permission.MANAGE_BILLING],
    footer: true,
  },
  {
    title: 'Site settings',
    section: null,
    href: '/admin/settings',
    icon: Settings2,
    permissionsNeeded: [Permission.FULL_ACCESS],
    footer: true,
  },
]

/**
 * Items with no required permissions are visible to anyone past the
 * admin-portal gate; otherwise the user needs at least one of the listed
 * permissions (FULL_ACCESS short-circuits inside userHasPermission).
 */
export function filterNavByPermission<
  T extends { permissionsNeeded: Permission[] },
>(items: T[], user: User): T[] {
  return items.filter((item) => {
    if (item.permissionsNeeded.length === 0) return true
    return userHasPermission(user, item.permissionsNeeded)
  })
}

/**
 * Serializable shape safe to pass from the server layout to the client
 * sidebar (icon components stay on this module; the client looks them up).
 */
export type SerializableNavItem = {
  title: string
  href: string
  section: AdminNavSection
  soon?: boolean
  footer?: boolean
}

export function getVisibleNavItems(user: User): SerializableNavItem[] {
  return filterNavByPermission(adminNavItems, user).map(
    ({ title, href, section, soon, footer }) => ({
      title,
      href,
      section,
      soon,
      footer,
    })
  )
}

export function getNavIcon(href: string): LucideIcon | undefined {
  return adminNavItems.find((item) => item.href === href)?.icon
}

/**
 * Longest-prefix active matching: `/admin` only matches exactly, so nested
 * routes highlight their own section (e.g. `/admin/weekends/123` → Weekends).
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}
