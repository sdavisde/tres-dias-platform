'use client'

import { useState } from 'react'
import Link from 'next/link'
import { isNil } from 'lodash'
import {
  CalendarHeart,
  CalendarPlus,
  CheckCircle2,
  Clock,
  HandHeart,
  Lock,
  MapPin,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { StatTile } from '@/components/ui/stat-tile'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  EventSidebar,
  type EventFormPrefill,
  type WeekendOption,
} from '@/components/events/EventSidebar'
import { formatDateTime } from '@/lib/utils'
import { formatWeekendGroupTitle } from '@/lib/weekend'
import type { SecuelaOverview, SecuelaSummary } from '@/services/secuela'
import { SecuelaQrCode } from './secuela-qr-code'

interface SecuelaClientProps {
  /** Null when the overview failed to load. */
  overview: SecuelaOverview | null
  canEdit: boolean
  signInUrl: string
  weekendOptions: WeekendOption[]
}

function formatWhen(datetime: string): string {
  const formatted = formatDateTime(datetime)
  return typeof formatted === 'string'
    ? formatted
    : `${formatted.dateStr} at ${formatted.timeStr}`
}

function formatTime(datetime: string): string {
  const formatted = formatDateTime(datetime)
  return typeof formatted === 'string' ? formatted : formatted.timeStr
}

type WindowState = 'upcoming' | 'open' | 'ended'

function getWindowState(secuela: SecuelaSummary, now: number): WindowState {
  if (now < new Date(secuela.windowOpensAt).getTime()) return 'upcoming'
  if (now <= new Date(secuela.windowClosesAt).getTime()) return 'open'
  return 'ended'
}

const WINDOW_BADGES: Record<
  WindowState,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  upcoming: { label: 'Upcoming', variant: 'secondary' },
  open: { label: 'Sign-ins open', variant: 'default' },
  ended: { label: 'Ended', variant: 'outline' },
}

export default function SecuelaClient({
  overview,
  canEdit,
  signInUrl,
  weekendOptions,
}: SecuelaClientProps) {
  const [prefill, setPrefill] = useState<EventFormPrefill | undefined>()
  // Captured once so the badge doesn't change between renders
  const [now] = useState(() => Date.now())

  if (isNil(overview)) {
    return (
      <>
        <PageHeader title="Secuela" />
        <p className="text-muted-foreground">
          Secuela details couldn&apos;t be loaded. Please refresh the page.
        </p>
      </>
    )
  }

  const { activeGroup, active, previous } = overview
  const groupTitle = formatWeekendGroupTitle(activeGroup?.groupNumber ?? null)

  const handleCreate = () => {
    if (isNil(activeGroup)) return
    setPrefill({
      type: 'secuela',
      weekendGroupId: activeGroup.groupId,
      title: `${groupTitle} Secuela`,
      // Secuelas usually start mid-morning
      time: '10:00',
    })
  }

  return (
    <div>
      <PageHeader
        title="Secuela"
        description="Members sign in by scanning the QR code at secuela. Sign-ins count as attendance from 30 minutes before the start until it ends."
      />

      <HowSecuelaWorks secuela={active} />

      {isNil(activeGroup) ? (
        <Card>
          <CardHeader>
            <CardTitle>No active weekend</CardTitle>
            <CardDescription>
              Secuela sign-ins are recorded against the active weekend group.
              Activate a weekend to schedule its secuela.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : isNil(active) ? (
        <Card>
          <CardHeader>
            <CardTitle>{groupTitle} has no secuela yet</CardTitle>
            <CardDescription>
              Schedule it so members can sign in and the roster builder can tell
              who attended.
            </CardDescription>
          </CardHeader>
          {canEdit && (
            <CardContent>
              <Button onClick={handleCreate}>
                <CalendarPlus className="mr-2 h-4 w-4" />
                Create secuela
              </Button>
            </CardContent>
          )}
        </Card>
      ) : (
        <ActiveSecuela
          secuela={active}
          groupTitle={groupTitle}
          signInUrl={signInUrl}
          windowState={getWindowState(active, now)}
        />
      )}

      <PreviousSecuelas secuelas={previous} />

      <EventSidebar
        isOpen={!isNil(prefill)}
        onClose={() => setPrefill(undefined)}
        weekendOptions={weekendOptions}
        prefill={prefill}
      />
    </div>
  )
}

function ActiveSecuela({
  secuela,
  groupTitle,
  signInUrl,
  windowState,
}: {
  secuela: SecuelaSummary
  groupTitle: string
  signInUrl: string
  windowState: WindowState
}) {
  const badge = WINDOW_BADGES[windowState]

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{groupTitle} Secuela</CardTitle>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <CardDescription>
          <Link href="/admin/events" className="underline underline-offset-4">
            Edit it on the Events page
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-6">
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <CalendarHeart className="h-4 w-4 shrink-0 text-primary" />
              {formatWhen(secuela.startsAt)}
              {!isNil(secuela.endsAt) && ` – ${formatTime(secuela.endsAt)}`}
            </p>
            {!isNil(secuela.location) && secuela.location !== '' && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                {secuela.location}
              </p>
            )}
            <p className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              Sign-ins count from {formatTime(secuela.windowOpensAt)} to{' '}
              {formatTime(secuela.windowClosesAt)}
            </p>
            {isNil(secuela.endsAt) && (
              <p className="text-muted-foreground">
                No end time is set, so attendance closes 3 hours after the
                start. Add an end time on the Events page to change that.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatTile value={secuela.attendedCount} label="Attended" />
            <StatTile value={secuela.wantsToServeCount} label="Want to serve" />
          </div>
        </div>

        <SecuelaQrCode
          signInUrl={signInUrl}
          label={`${groupTitle} Secuela`}
          when={formatWhen(secuela.startsAt)}
          location={secuela.location}
        />
      </CardContent>
    </Card>
  )
}

/**
 * Plain-language rules for admins, filled in with the active secuela's times
 * when there is one. Mirrors `lib/secuela/attendance-window.ts`.
 */
function HowSecuelaWorks({ secuela }: { secuela: SecuelaSummary | null }) {
  // Generic wording until a secuela is scheduled
  const openTime = isNil(secuela)
    ? '30 minutes before it starts'
    : `${formatTime(secuela.windowOpensAt)} (30 minutes before it starts)`
  const closeTime = isNil(secuela)
    ? 'it ends'
    : formatTime(secuela.windowClosesAt)

  const stages: Array<{ icon: LucideIcon; title: string; body: string }> = [
    {
      icon: Lock,
      title: 'Before secuela',
      body: `The QR code and sign-in link show "Registration hasn't started yet" with the start time. Nothing is recorded until ${openTime}.`,
    },
    {
      icon: CheckCircle2,
      title: 'During secuela',
      body: `From ${openTime} until ${closeTime}, members who confirm are marked "Attended Secuela". The roster builder shows a badge and lists them first.`,
    },
    {
      icon: HandHeart,
      title: 'After secuela',
      body: 'The link keeps working. Members who confirm later are marked "Wants to Serve" instead. Someone who already signed in at secuela stays "Attended" even if they use the link again.',
    },
  ]

  return (
    <section className="mb-8 space-y-4">
      <h2 className="font-serif text-2xl font-semibold tracking-tight">
        How secuela sign-in works
      </h2>
      <div className="grid gap-3 md:grid-cols-3">
        {stages.map(({ icon: Icon, title, body }) => (
          <div key={title} className="space-y-2 rounded-lg border bg-card p-4">
            <p className="flex items-center gap-2 font-medium">
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              {title}
            </p>
            <p className="text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          Members sign in with their account, or create one, before confirming.
        </li>
        <li>
          Sign-ins always go to the active weekend, so the same QR code works
          for every secuela.
        </li>
        <li>
          If a secuela has no end time, sign-ins count as attendance for 3 hours
          after it starts.
        </li>
        <li>
          The &ldquo;Sign Up to Serve&rdquo; card on the member home page uses
          the same link and follows the same rules.
        </li>
      </ul>
    </section>
  )
}

function PreviousSecuelas({ secuelas }: { secuelas: SecuelaSummary[] }) {
  return (
    <section className="mt-10 space-y-4">
      <h2 className="font-serif text-2xl font-semibold tracking-tight">
        Previous secuelas
      </h2>

      {secuelas.length === 0 ? (
        <p className="text-muted-foreground">No previous secuelas yet.</p>
      ) : (
        <>
          {/* Desktop Table - Hidden on mobile */}
          <div className="relative hidden rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Weekend</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Attended</TableHead>
                  <TableHead className="text-right">Want to serve</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {secuelas.map((secuela) => (
                  <TableRow key={secuela.eventId}>
                    <TableCell className="font-medium">
                      {formatWeekendGroupTitle(secuela.groupNumber)}
                    </TableCell>
                    <TableCell>{formatWhen(secuela.startsAt)}</TableCell>
                    <TableCell>{secuela.location ?? '-'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {secuela.attendedCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {secuela.wantsToServeCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card Layout - Shown only on mobile */}
          <div className="space-y-3 md:hidden">
            {secuelas.map((secuela) => (
              <div
                key={secuela.eventId}
                className="space-y-3 rounded-lg border bg-card p-4"
              >
                <p className="text-lg font-medium">
                  {formatWeekendGroupTitle(secuela.groupNumber)}
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <span className="w-24 shrink-0 text-muted-foreground">
                      Date
                    </span>
                    <span>{formatWhen(secuela.startsAt)}</span>
                  </div>
                  {!isNil(secuela.location) && (
                    <div className="flex gap-2">
                      <span className="w-24 shrink-0 text-muted-foreground">
                        Location
                      </span>
                      <span>{secuela.location}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {secuela.attendedCount} attended
                  </Badge>
                  <Badge variant="outline">
                    {secuela.wantsToServeCount} want to serve
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
