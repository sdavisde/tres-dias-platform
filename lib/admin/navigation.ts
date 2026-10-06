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
  LayoutGrid,
  Receipt,
  Settings2,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type AdminNavItem = {
  title: string
  href: string
  icon: LucideIcon
  /** Empty means visible to anyone who cleared the admin-portal gate. */
  permissionsNeeded: Permission[]
  /** Marked "SOON" in the sidebar and rendered as a non-link. */
  soon?: boolean
}

/**
 * The single source of truth for admin navigation: order, routes, icons, and
 * required permissions. The sidebar renders exactly this list.
 */
export const adminNavItems: AdminNavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutGrid,
    permissionsNeeded: [],
  },
  {
    title: 'Weekends',
    href: '/admin/weekends',
    icon: Calendar,
    permissionsNeeded: [Permission.READ_WEEKENDS],
  },
  {
    title: 'Events',
    href: '/admin/events',
    icon: Clock,
    permissionsNeeded: [Permission.READ_EVENTS],
  },
  {
    title: 'Secuela',
    href: '/admin/secuela',
    icon: HandHeart,
    permissionsNeeded: [Permission.READ_EVENTS],
  },
  {
    title: 'Payments',
    href: '/admin/payments',
    icon: CreditCard,
    permissionsNeeded: [Permission.READ_PAYMENTS],
  },
  {
    title: 'People',
    href: '/admin/people',
    icon: Users,
    permissionsNeeded: [],
  },
  {
    title: 'Community',
    href: '/admin/community-board',
    icon: Landmark,
    permissionsNeeded: [],
  },
  {
    title: 'Files',
    href: '/admin/files',
    icon: Folder,
    permissionsNeeded: [],
  },
  {
    title: 'Site settings',
    href: '/admin/settings',
    icon: Settings2,
    permissionsNeeded: [Permission.FULL_ACCESS],
  },
  {
    title: 'Billing',
    href: '/admin/billing',
    icon: Receipt,
    permissionsNeeded: [Permission.MANAGE_BILLING],
  },
  {
    title: 'Security',
    href: '/admin/security',
    icon: ShieldCheck,
    permissionsNeeded: [Permission.READ_USER_ROLES],
  },
  {
    title: 'Reports',
    href: '/admin/reports',
    icon: BarChart3,
    permissionsNeeded: [],
    soon: true,
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
  soon?: boolean
}

export function getVisibleNavItems(user: User): SerializableNavItem[] {
  return filterNavByPermission(adminNavItems, user).map(
    ({ title, href, soon }) => ({ title, href, soon })
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
