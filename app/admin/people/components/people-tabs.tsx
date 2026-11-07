'use client'

import { usePathname } from 'next/navigation'
import { IntentLink } from '@/components/ui/intent-link'
import { cn } from '@/lib/utils'

export const RECTOR_SELECTION_PATH = '/admin/people/rector-selection'

type PeopleTabsProps = {
  /** Rector Selection reads experience, so it hides with the Level column. */
  canViewExperience: boolean
}

/** Directory · Rector Selection, in the weekend hub's tab style. */
export function PeopleTabs({ canViewExperience }: PeopleTabsProps) {
  const pathname = usePathname()
  const tabs = [
    { href: '/admin/people', label: 'Directory' },
    ...(canViewExperience
      ? [{ href: RECTOR_SELECTION_PATH, label: 'Rector Selection' }]
      : []),
  ]
  return (
    <nav aria-label="People views" className="mb-8">
      <ul className="flex gap-6 border-b border-border md:gap-7">
        {tabs.map(({ href, label }) => {
          const isActive = pathname === href
          return (
            <li key={href}>
              <IntentLink
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  '-mb-px flex min-h-11 items-center border-b-2 px-0.5 text-sm transition-colors',
                  isActive
                    ? 'border-primary font-semibold text-foreground'
                    : 'border-transparent font-medium text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </IntentLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
