import { Permission, userHasPermission } from '@/lib/security'
import type { User } from '@/lib/users/types'
import { hubPath, resolveWeekendType } from '@/lib/weekend/hub'
import { isNil } from 'lodash'
import {
  Calendar,
  ClipboardCheck,
  CircleUser,
  CreditCard,
  FileText,
  FolderOpen,
  HeartHandshake,
  Home,
  Users,
  LayoutGrid,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

/**
 * Sidebar sections, in order. `null` renders as the top-level (unlabeled)
 * group; 'Do something' and 'Find' are the task-named groups from the design
 * board; 'Role tools' holds the links only some roles see, rendered as an
 * unlabeled group of its own.
 */
export type MemberNavSection = null | 'Do something' | 'Find' | 'Role tools'

/** Stable identity for an item, independent of where its link points today. */
export type MemberNavKey =
  | 'home'
  | 'sponsor'
  | 'my-forms'
  | 'online-payment'
  | 'weekends'
  | 'community'
  | 'documents'
  | 'review-candidates'
  | 'roster-builder'
  | 'account'
  | 'admin'

export type MemberNavItem = {
  key: MemberNavKey
  title: string
  href: string
  icon: LucideIcon
  section: MemberNavSection
  /** Empty means visible to every signed-in member. */
  permissionsNeeded: Permission[]
  /** Only shown to people on the active weekend team. */
  requiresTeamMembership?: boolean
  /** Only shown when there is an active weekend group to point at. */
  requiresActiveGroup?: boolean
  /** Appears in the phone tab bar (at most five). */
  tab?: boolean
  /** Shorter label for the tab bar, when the sidebar title is too long. */
  tabLabel?: string
  /** Position in the tab bar (Main board order); lower comes first. */
  tabOrder?: number
  /**
   * Highlight the item for everything under this path, when `href` is more
   * specific than the section it stands for.
   */
  matchHref?: string
}

/**
 * The single source of truth for member navigation: order, routes, icons,
 * sections, and who sees what. The sidebar, the phone tab bar and the search
 * palette all render from this list.
 */
export const memberNavItems: MemberNavItem[] = [
  {
    key: 'home',
    title: 'Home',
    href: '/home',
    icon: Home,
    section: null,
    permissionsNeeded: [],
    tab: true,
    tabOrder: 0,
  },
  {
    key: 'sponsor',
    title: 'Sponsor a candidate',
    href: '/sponsor',
    icon: HeartHandshake,
    section: 'Do something',
    permissionsNeeded: [],
  },
  {
    key: 'my-forms',
    title: 'My forms',
    href: '/team-forms',
    icon: FileText,
    section: 'Do something',
    permissionsNeeded: [],
    requiresTeamMembership: true,
  },
  {
    key: 'online-payment',
    title: 'Online payment',
    href: '/payment',
    icon: CreditCard,
    section: 'Do something',
    permissionsNeeded: [],
    tab: true,
    tabLabel: 'Payments',
    tabOrder: 3,
  },
  {
    key: 'weekends',
    title: 'The weekend',
    // Opens the active weekend matching the viewer's gender (see
    // `resolveMemberNavHref`); the index when nothing is active.
    href: '/weekends',
    matchHref: '/weekends',
    icon: Calendar,
    section: 'Find',
    permissionsNeeded: [],
    tab: true,
    tabLabel: 'Weekend',
    tabOrder: 1,
  },
  {
    key: 'community',
    title: 'Community',
    href: '/community',
    icon: Users,
    section: 'Find',
    permissionsNeeded: [],
  },
  {
    key: 'documents',
    title: 'Documents',
    href: '/files',
    icon: FolderOpen,
    section: 'Find',
    permissionsNeeded: [],
    tab: true,
    tabOrder: 2,
  },
  {
    key: 'review-candidates',
    title: 'Review candidates',
    // Points at the active group's queue (see `resolveMemberNavHref`).
    href: '/weekends',
    icon: ClipboardCheck,
    section: 'Role tools',
    permissionsNeeded: [Permission.READ_CANDIDATES],
    requiresActiveGroup: true,
  },
  {
    key: 'roster-builder',
    title: 'Roster builder',
    href: '/roster-builder',
    icon: LayoutGrid,
    section: 'Role tools',
    permissionsNeeded: [Permission.READ_TEAM_ROSTER_BUILDER],
  },
]

/** Footer items: account first, then the admin link for those who have it. */
export const memberFooterNavItems: MemberNavItem[] = [
  {
    key: 'account',
    title: 'My account',
    href: '/profile',
    icon: CircleUser,
    section: null,
    permissionsNeeded: [],
    tab: true,
    tabOrder: 4,
  },
  {
    key: 'admin',
    title: 'Admin',
    href: '/admin',
    icon: ShieldCheck,
    section: null,
    permissionsNeeded: [Permission.READ_ADMIN_PORTAL],
  },
]

const allItems = [...memberNavItems, ...memberFooterNavItems]

export function filterMemberNav(
  items: MemberNavItem[],
  user: User,
  context: MemberNavContext = { activeGroupId: null }
) {
  return items.filter((item) => {
    if (item.requiresTeamMembership === true && isNil(user.teamMemberInfo)) {
      return false
    }
    if (item.requiresActiveGroup === true && isNil(context.activeGroupId)) {
      return false
    }
    if (item.permissionsNeeded.length === 0) return true
    return userHasPermission(user, item.permissionsNeeded)
  })
}

/**
 * Serializable shape safe to pass from the server layout to client chrome
 * (icon components stay on this module; the client looks them up by href).
 */
export type SerializableMemberNavItem = {
  key: MemberNavKey
  title: string
  href: string
  section: MemberNavSection
  tab?: boolean
  tabLabel?: string
  tabOrder?: number
  matchHref?: string
}

export type MemberNavContext = {
  /** The ACTIVE weekend group, when there is one. */
  activeGroupId: string | null
  /** The viewer's gender, to open their own weekend (Men's or Women's). */
  gender?: string | null
}

/**
 * Where an item points for this visit. The weekend and the review queue live
 * on each weekend's hub, so they open the active group's page for the
 * viewer's own weekend; without an active group they keep their fallback.
 */
export function resolveMemberNavHref(
  item: Pick<MemberNavItem, 'key' | 'href'>,
  context: MemberNavContext
): string {
  const { activeGroupId } = context
  if (isNil(activeGroupId)) return item.href
  const weekendType = resolveWeekendType(null, context.gender)
  if (item.key === 'weekends') {
    return hubPath(activeGroupId, 'overview', weekendType)
  }
  if (item.key === 'review-candidates') {
    return hubPath(activeGroupId, 'review-candidates', weekendType)
  }
  return item.href
}

function serialize(
  items: MemberNavItem[],
  context: MemberNavContext
): SerializableMemberNavItem[] {
  return items.map(
    ({ key, title, href, section, tab, tabLabel, tabOrder, matchHref }) => ({
      key,
      title,
      href: resolveMemberNavHref({ key, href }, context),
      section,
      tab,
      tabLabel,
      tabOrder,
      matchHref,
    })
  )
}

export type MemberNav = {
  main: SerializableMemberNavItem[]
  footer: SerializableMemberNavItem[]
}

export function getMemberNav(
  user: User,
  context: MemberNavContext = { activeGroupId: null }
): MemberNav {
  const withGender = { gender: user.gender, ...context }
  return {
    main: serialize(
      filterMemberNav(memberNavItems, user, withGender),
      withGender
    ),
    footer: serialize(
      filterMemberNav(memberFooterNavItems, user, withGender),
      withGender
    ),
  }
}

/**
 * The phone tab bar: every visible item flagged `tab`, in the Main board's
 * order (Home · Weekend · Documents · Payments · My account), with the short
 * tab label standing in for the sidebar title.
 */
export function getTabBarItems(nav: MemberNav): SerializableMemberNavItem[] {
  return [...nav.main, ...nav.footer]
    .filter((item) => item.tab === true)
    .sort((a, b) => (a.tabOrder ?? 99) - (b.tabOrder ?? 99))
    .map((item) => ({ ...item, title: item.tabLabel ?? item.title }))
}

export function getMemberNavIcon(key: MemberNavKey): LucideIcon | undefined {
  return allItems.find((item) => item.key === key)?.icon
}

/** Hub URLs differ only by weekend; either one lights up the same item. */
function normalizeWeekend(path: string) {
  return path.replace(/^(\/weekends\/[^/]+)\/(mens|womens)(?=\/|$)/, '$1/*')
}

function matchesPath(href: string, pathname: string) {
  const target = normalizeWeekend(href)
  const path = normalizeWeekend(pathname)
  return path === target || path.startsWith(`${target}/`)
}

/**
 * The one item to highlight for a path: the longest matching href wins, so
 * the review queue lights up Review candidates rather than The weekend,
 * while every other hub page (and `/files/handbook`,
 * `/team-forms/camp-waiver`) still highlights its section. An item's
 * `matchHref` stands in for its href here.
 */
export function activeMemberNavKey(
  items: Pick<SerializableMemberNavItem, 'key' | 'href' | 'matchHref'>[],
  pathname: string
): MemberNavKey | null {
  let best: { key: MemberNavKey; href: string } | null = null
  for (const item of items) {
    const href = item.matchHref ?? item.href
    if (!matchesPath(href, pathname)) continue
    if (isNil(best) || href.length >= best.href.length) {
      best = { key: item.key, href }
    }
  }
  return best?.key ?? null
}
