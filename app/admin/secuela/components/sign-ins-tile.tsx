'use client'

import { useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { COMMUNITY_TIMEZONE } from '@/lib/utils'
import type { SecuelaSignIn } from '@/services/secuela'

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: COMMUNITY_TIMEZONE,
}

const DAY_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  timeZone: COMMUNITY_TIMEZONE,
}

/**
 * A stat tile whose count opens a searchable list of the people behind it.
 * Attendance shows the sign-in time; volunteers show the day they signed up.
 */
export function SignInsTile({
  label,
  signIns,
  show,
}: {
  label: string
  signIns: SecuelaSignIn[]
  show: 'time' | 'day'
}) {
  const [search, setSearch] = useState('')
  const needle = search.trim().toLowerCase()
  const matches = signIns.filter((signIn) =>
    signIn.name.toLowerCase().includes(needle)
  )
  const format = show === 'time' ? TIME_FORMAT : DAY_FORMAT

  return (
    <Popover onOpenChange={(open) => !open && setSearch('')}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={signIns.length === 0}
          className="flex min-w-0 flex-col gap-1 rounded-lg border bg-card px-4.5 py-4 text-left transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-default disabled:hover:border-border data-[state=open]:border-primary"
        >
          <span className="font-serif text-[26px] leading-tight font-semibold tabular-nums">
            {signIns.length}
          </span>
          <span className="flex items-center justify-between gap-2 text-[13px] text-muted-foreground">
            {label}
            {signIns.length > 0 && (
              <span className="flex items-center gap-0.5 font-medium text-primary">
                Names
                <ChevronDown className="h-3.5 w-3.5" />
              </span>
            )}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-1.5 p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name"
            aria-label={`Search ${label.toLowerCase()}`}
            className="h-9 pl-8"
          />
        </div>
        {matches.length === 0 ? (
          <p className="px-2 py-2 text-sm text-muted-foreground">
            No one by that name
          </p>
        ) : (
          <ul className="max-h-60 overflow-y-auto">
            {matches.map((signIn) => (
              <li
                key={signIn.userId}
                className="flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm"
              >
                <span className="truncate font-medium">{signIn.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {new Date(signIn.signedInAt).toLocaleString('en-US', format)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
