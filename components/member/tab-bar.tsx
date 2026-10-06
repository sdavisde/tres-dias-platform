'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isNil } from 'lodash'
import {
  activeMemberNavKey,
  getMemberNavIcon,
  type SerializableMemberNavItem,
} from '@/lib/member/navigation'
import { cn } from '@/lib/utils'

/**
 * Labeled bottom tab bar for phones (Main board). Navigation never disappears
 * behind a hamburger: the five primary destinations are always on screen.
 * The background runs past the bottom edge so Safari's collapsing toolbar
 * never shows the page through the gap beneath the bar.
 */
export function TabBar({ items }: { items: SerializableMemberNavItem[] }) {
  const pathname = usePathname()
  const activeKey = activeMemberNavKey(items, pathname)
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] after:absolute after:inset-x-0 after:top-full after:h-24 after:bg-card md:hidden"
    >
      <ul className="flex items-stretch px-1 pt-1.5 pb-2">
        {items.map((item) => {
          const Icon = getMemberNavIcon(item.key)
          const isActive = item.key === activeKey
          return (
            <li key={item.key} className="min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 flex-col items-center justify-center gap-1 rounded-md px-1 py-1 text-[11.5px] leading-none',
                  isActive
                    ? 'font-semibold text-primary'
                    : 'font-medium text-muted-foreground'
                )}
              >
                {!isNil(Icon) && (
                  <Icon
                    className="size-[22px]"
                    strokeWidth={isActive ? 2 : 1.8}
                    aria-hidden
                  />
                )}
                <span className="truncate">{item.title}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
