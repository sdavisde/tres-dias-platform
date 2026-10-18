'use client'

import { Search, X } from 'lucide-react'
import { isNil } from 'lodash'
import { Input } from '@/components/ui/input'
import {
  QUEUE_FILTERS,
  queueSubtitle,
  type QueueFilter,
  type ReviewCandidate,
} from '@/lib/candidates/review'
import { cn } from '@/lib/utils'
import { ReviewStatusPill } from './review-status-pill'

type CandidateQueueProps = {
  /** Rows for the active chip after search, already sorted. */
  rows: ReviewCandidate[]
  counts: Record<QueueFilter, number>
  filter: QueueFilter
  search: string
  selectedId: string | null
  onFilterChange: (filter: QueueFilter) => void
  onSearchChange: (query: string) => void
  onSelect: (candidate: ReviewCandidate) => void
}

/**
 * The left pane of the review page: search, the Needs review / All /
 * Dropped chips, and one row per candidate. On phones this is the whole
 * page and picking a row opens the detail sheet.
 */
export function CandidateQueue({
  rows,
  counts,
  filter,
  search,
  selectedId,
  onFilterChange,
  onSearchChange,
  onSelect,
}: CandidateQueueProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-2.5 border-b border-border px-4 py-3.5">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Find a candidate…"
            aria-label="Find a candidate"
            className="h-11 bg-background pr-9 pl-9 md:h-9"
          />
          {search !== '' && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
              <span className="sr-only">Clear search</span>
            </button>
          )}
        </div>
        <div
          role="radiogroup"
          aria-label="Show"
          className="flex flex-wrap gap-1.5"
        >
          {QUEUE_FILTERS.map(({ filter: value, label }) => {
            const active = value === filter
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onFilterChange(value)}
                className={cn(
                  'inline-flex min-h-11 items-center gap-1 rounded-full border px-3 text-xs font-semibold whitespace-nowrap transition-colors md:min-h-7',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background font-medium text-nav-foreground hover:bg-muted'
                )}
              >
                {label}
                <span
                  className={cn(
                    'tabular-nums',
                    active
                      ? 'text-primary-foreground/80'
                      : 'text-muted-foreground'
                  )}
                >
                  · {counts[value]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto" aria-label="Candidates">
        {rows.length === 0 ? (
          <li className="px-4 py-6 text-sm text-muted-foreground">
            {search.trim() !== ''
              ? 'No candidates match that search.'
              : filter === 'needs-review'
                ? 'Nobody is waiting on a decision right now.'
                : filter === 'dropped'
                  ? 'No dropped candidates on this weekend.'
                  : 'No candidates on this weekend yet.'}
          </li>
        ) : (
          rows.map((candidate) => {
            const selected = candidate.id === selectedId
            return (
              <li key={candidate.id}>
                <button
                  type="button"
                  onClick={() => onSelect(candidate)}
                  aria-current={selected ? 'true' : undefined}
                  className={cn(
                    'flex w-full min-w-0 flex-col gap-1 border-b border-divider px-4 py-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset',
                    selected
                      ? 'border-l-[3px] border-l-primary bg-selected pl-[13px]'
                      : 'hover:bg-muted/60'
                  )}
                >
                  <span className="flex min-w-0 items-center justify-between gap-2">
                    <span className="truncate text-[15px] font-semibold text-foreground">
                      {candidate.name}
                    </span>
                    <ReviewStatusPill status={candidate.status} />
                  </span>
                  <span className="truncate text-[13px] text-muted-foreground">
                    {queueSubtitle(candidate)}
                  </span>
                </button>
              </li>
            )
          })
        )}
      </ul>

      <p className="border-t border-border px-4 py-3 text-[13px] text-muted-foreground">
        {filter === 'needs-review' && counts['needs-review'] > 0
          ? `${counts['needs-review'] === 1 ? 'This one needs' : `These ${counts['needs-review']} need`} a decision · switch to All for everyone`
          : filter === 'needs-review'
            ? 'Switch to All to see everyone on this weekend'
            : isNil(selectedId)
              ? 'Pick a candidate to see their details'
              : `${rows.length} of ${counts[filter]} shown`}
      </p>
    </div>
  )
}
