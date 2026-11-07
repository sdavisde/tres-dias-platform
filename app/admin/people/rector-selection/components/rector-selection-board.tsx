'use client'

import type { ReactNode } from 'react'
import { isNil } from 'lodash'
import { Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { UserAvatar } from '@/components/user-avatar'
import { useQueryParam } from '@/hooks/url-state'
import { stringMarshaller } from '@/lib/marshallers'
import { cn } from '@/lib/utils'
import type { RectorCriterion } from '@/lib/users/experience/rector-selection'
import {
  rowMatchesSearch,
  type RectorSelection,
  type RectorSelectionRow,
} from '../../lib/rector-selection'

const CRITERIA: Array<{ key: RectorCriterion; letter: string; label: string }> =
  [
    { key: 'head', letter: 'H', label: 'Head / Asst Head' },
    { key: 'teamHead', letter: 'S', label: 'Section head' },
    { key: 'rollos', letter: 'R', label: '2 rollos' },
    { key: 'dining', letter: 'D', label: 'Dining' },
  ]

const NEEDS_LABEL: Record<RectorCriterion, string> = {
  head: 'Head or Asst Head',
  teamHead: 'Section-head role',
  rollos: 'rollos',
  dining: 'Dining',
}

const MET_STYLE = {
  background: 'var(--experience-level-3)',
  color: 'var(--experience-level-3-fg)',
}
const PARTIAL_STYLE = {
  background: 'var(--experience-level-1)',
  color: 'var(--experience-level-1-fg)',
}
const NEEDS_STYLE = { color: 'var(--experience-level-1-fg)' }

function Dot({
  letter,
  state,
  tip,
}: {
  letter: string
  state: 'met' | 'partial' | 'missing'
  tip: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={tip}
          style={
            state === 'met'
              ? MET_STYLE
              : state === 'partial'
                ? PARTIAL_STYLE
                : {}
          }
          className={cn(
            'inline-flex size-6 items-center justify-center rounded-full text-[11px] font-bold',
            state === 'missing' && 'border border-dashed text-muted-foreground'
          )}
        >
          {letter}
        </span>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  )
}

function Progress({ row }: { row: RectorSelectionRow }) {
  return (
    <span className="inline-flex gap-1">
      {CRITERIA.map(({ key, letter, label }) => {
        const missing = row.gap.missing.includes(key)
        const partial = key === 'rollos' && missing && row.gap.rollosGiven > 0
        return (
          <Dot
            key={key}
            letter={partial ? String(row.gap.rollosGiven) : letter}
            state={partial ? 'partial' : missing ? 'missing' : 'met'}
            tip={`${label} · ${
              partial
                ? `${row.gap.rollosGiven} of 2 given`
                : missing
                  ? 'still needed'
                  : 'met'
            }`}
          />
        )
      })}
    </span>
  )
}

function stillNeeds(row: RectorSelectionRow): string {
  return row.gap.missing
    .map((c) =>
      c === 'rollos'
        ? `${2 - row.gap.rollosGiven} more ${row.gap.rollosGiven === 1 ? 'rollo' : 'rollos'}`
        : NEEDS_LABEL[c]
    )
    .join(', ')
}

function Needs({ row }: { row: RectorSelectionRow }) {
  if (row.gap.weekendsAway === 0) {
    return (
      <Badge className="rounded-full font-semibold" style={MET_STYLE}>
        Ready
      </Badge>
    )
  }
  return (
    <span className="font-semibold" style={NEEDS_STYLE}>
      {stillNeeds(row)}
    </span>
  )
}

function Finishes({ row }: { row: RectorSelectionRow }) {
  if (row.gap.weekendsAway === 0) {
    return <span className="text-muted-foreground">—</span>
  }
  if (isNil(row.gap.finishingRole)) {
    return (
      <span className="text-muted-foreground">
        No single role · {row.gap.narrative}
      </span>
    )
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Badge variant="secondary" className="rounded-full font-semibold">
        {row.gap.finishingRole}
      </Badge>
      {!isNil(row.gap.finishingNote) && (
        <span className="text-xs text-muted-foreground">
          {row.gap.finishingNote}
        </span>
      )}
    </span>
  )
}

function Who({ row }: { row: RectorSelectionRow }) {
  const { member } = row
  return (
    <div className="flex items-center gap-2.5">
      <UserAvatar
        user={{
          id: member.id,
          first_name: member.firstName,
          last_name: member.lastName,
          email: member.email,
          profilePhoto: member.profilePhoto,
        }}
        size={30}
      />
      <div className="min-w-0">
        <div className="font-semibold">{row.name}</div>
        <div className="truncate text-[12.5px] text-muted-foreground">
          {[row.church, row.leadership]
            .filter((part): part is string => !isNil(part))
            .join(' · ')}
        </div>
      </div>
    </div>
  )
}

function lastServed(row: RectorSelectionRow): string {
  return isNil(row.lastServed) ? '—' : `DTTD #${row.lastServed}`
}

type Column = {
  header: string
  cell: (row: RectorSelectionRow) => ReactNode
  className?: string
}

type Group = {
  label: string
  detail: string
  rows: RectorSelectionRow[]
  columns: Column[]
  /** Which optional parts the mobile card shows (Who, Weekends, Last always show). */
  card: { progress: boolean; needs: boolean; finishes: boolean }
  aside?: ReactNode
}

const NAME: Column = { header: 'Name', cell: (r) => <Who row={r} /> }
const PROGRESS: Column = {
  header: 'Progress',
  cell: (r) => <Progress row={r} />,
}
const NEEDS: Column = { header: 'Still needs', cell: (r) => <Needs row={r} /> }
const FINISHES: Column = {
  header: 'One role that finishes it',
  cell: (r) => <Finishes row={r} />,
}
const PATH: Column = { header: 'Path', cell: (r) => <Finishes row={r} /> }
const WEEKENDS: Column = {
  header: 'Weekends',
  cell: (r) => r.weekends,
  className: 'tabular-nums',
}
const LAST: Column = {
  header: 'Last served',
  cell: lastServed,
  className: 'text-muted-foreground',
}

function ProgressKey() {
  return (
    <ul
      aria-label="Progress key"
      className="hidden items-center gap-3 text-[12.5px] text-muted-foreground md:flex"
    >
      {CRITERIA.map(({ key, letter, label }) => (
        <li key={key} className="flex items-center gap-1.5">
          <Dot letter={letter} state="met" tip={label} />
          {label}
        </li>
      ))}
    </ul>
  )
}

function Tile({
  figure,
  caption,
  highlight = false,
}: {
  figure: number
  caption: string
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-lg border px-4.5 py-3.5',
        highlight
          ? 'border-secondary-border bg-secondary text-secondary-foreground'
          : 'bg-card'
      )}
    >
      <p className="font-serif text-2xl font-semibold tabular-nums">{figure}</p>
      <p
        className={cn(
          'text-[13px]',
          highlight ? 'text-secondary-foreground' : 'text-muted-foreground'
        )}
      >
        {caption}
      </p>
    </div>
  )
}

/**
 * Board A of the Rector Selection canvas: tiles, a search, and one table
 * grouped by weekends away. Information only — nothing here changes a roster.
 */
export function RectorSelectionBoard({
  selection,
}: {
  selection: RectorSelection
}) {
  const [search, setSearch] = useQueryParam('search', {
    ...stringMarshaller(''),
    history: 'replace',
  })

  const groups: Group[] = [
    {
      label: 'Rector Ready',
      detail: `${selection.ready.length} people`,
      rows: selection.ready,
      columns: [NAME, WEEKENDS, LAST],
      card: { progress: false, needs: false, finishes: false },
    },
    {
      label: 'One weekend away',
      detail: `${selection.oneAway.length} people · one role on the next weekend finishes it`,
      rows: selection.oneAway,
      columns: [NAME, NEEDS, FINISHES, WEEKENDS, LAST],
      card: { progress: false, needs: true, finishes: true },
    },
    {
      label: 'Two or more away',
      detail: `${selection.further.length} people`,
      rows: selection.further,
      columns: [NAME, PROGRESS, PATH, WEEKENDS, LAST],
      card: { progress: true, needs: true, finishes: true },
      aside: <ProgressKey />,
    },
  ].map((g) => ({
    ...g,
    rows: g.rows.filter((r) => rowMatchesSearch(r, search)),
  }))

  return (
    <>
      <p className="-mt-2 mb-5 max-w-2xl text-muted-foreground">
        How close each member is to rector readiness and which role would get
        them there. For the board&apos;s conversations with the rector; nothing
        here changes a roster.
      </p>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile figure={selection.ready.length} caption="Rector Ready" />
        <Tile
          figure={selection.oneAway.length}
          caption="One weekend away"
          highlight
        />
        <Tile
          figure={selection.further.length}
          caption="Two or more weekends away"
        />
        <Tile
          figure={selection.servedCount}
          caption="Have served or are serving as rector"
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a person…"
            aria-label="Find a person"
            className="pr-10 pl-10"
          />
          {search !== '' && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
              <span className="sr-only">Clear search</span>
            </button>
          )}
        </div>
      </div>

      {/* Desktop tables */}
      <div className="hidden space-y-6 md:block">
        {groups.map((group) => (
          <GroupTable key={group.label} group={group} search={search} />
        ))}
      </div>

      {/* Mobile cards */}
      <div className="space-y-5 md:hidden">
        {groups.map((group) => (
          <section key={group.label} aria-label={group.label}>
            <h2 className="mb-2 text-sm font-semibold">
              {group.label}{' '}
              <span className="font-normal text-muted-foreground">
                · {group.rows.length}
              </span>
            </h2>
            {group.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No one here.</p>
            ) : (
              <div className="space-y-3">
                {group.rows.map((row) => (
                  <div
                    key={row.member.id}
                    className="space-y-3 rounded-lg border bg-card p-4"
                  >
                    <Who row={row} />
                    {(group.card.progress || group.card.needs) && (
                      <div className="flex flex-wrap items-center gap-2">
                        {group.card.progress && <Progress row={row} />}
                        {group.card.needs && <Needs row={row} />}
                      </div>
                    )}
                    <div className="grid grid-cols-[4.5rem_1fr] gap-y-2 text-sm">
                      {group.card.finishes && (
                        <>
                          <span className="text-muted-foreground">
                            Finishes
                          </span>
                          <span>
                            <Finishes row={row} />
                          </span>
                        </>
                      )}
                      <span className="text-muted-foreground">Weekends</span>
                      <span className="tabular-nums">{row.weekends}</span>
                      <span className="text-muted-foreground">Last</span>
                      <span>{lastServed(row)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <p className="mt-3 text-[13px] text-muted-foreground">
        Ready = Head or Assistant Head · a section-head role · two rollos ·
        Dining. A rollo is given as Table Leader, its own job, so each missing
        rollo is a separate weekend.
      </p>
    </>
  )
}

function GroupTable({ group, search }: { group: Group; search: string }) {
  const headingId = `group-${group.label.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <section aria-labelledby={headingId}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex items-baseline gap-2">
          <h2 id={headingId} className="font-serif text-lg font-semibold">
            {group.label}
          </h2>
          <span className="text-[13px] text-muted-foreground">
            {group.detail}
          </span>
        </div>
        {group.aside}
      </div>
      {group.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {search !== '' ? 'No one matches your search.' : 'No one here.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                {group.columns.map((c) => (
                  <TableHead
                    key={c.header}
                    className="h-auto px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                  >
                    {c.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.rows.map((row) => (
                <TableRow key={row.member.id} className="border-divider">
                  {group.columns.map((c) => (
                    <TableCell
                      key={c.header}
                      className={cn('p-3', c.className)}
                    >
                      {c.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}
