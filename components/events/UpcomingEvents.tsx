import { Calendar } from 'lucide-react'
import { isNil } from 'lodash'
import { getUpcomingEvents } from '@/services/events/events-service'
import {
  EVENT_TYPE_COLORS,
  EVENT_TYPE_LABELS,
  type Event,
} from '@/services/events'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Typography } from '@/components/ui/typography'
import { isErr, Results } from '@/lib/results'
import { logger } from '@/lib/logger'
import { cn } from '@/lib/utils'

const MAX_EVENTS = 5
const EVENT_TIME_ZONE = 'America/Chicago'

/**
 * Compact vertical list of upcoming events, designed for the homepage
 * sidebar. Each row shows a date block, title, time/location, and a
 * colored event-type badge.
 */
export async function UpcomingEvents() {
  const eventResult = await getUpcomingEvents()

  if (isErr(eventResult)) {
    logger.error(eventResult.error)
  }

  const events = Results.unwrapOr(eventResult, []).slice(0, MAX_EVENTS)

  return (
    <section className="w-full">
      <div className="mb-3">
        <Typography variant="h3">Upcoming Events</Typography>
        <Separator className="mt-2 w-12 bg-primary" />
      </div>

      {events.length === 0 ? (
        <div className="flex items-start gap-3 rounded-xl border bg-muted/50 p-5">
          <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">No Upcoming Events</p>
            <p className="text-sm text-muted-foreground">
              There are currently no upcoming events scheduled.
            </p>
          </div>
        </div>
      ) : (
        <div className="divide-y rounded-xl border bg-card shadow-sm">
          {events.map((event) => (
            <EventListRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  )
}

function EventListRow({ event }: { event: Event }) {
  const date = parseEventDate(event.datetime)

  return (
    <div className="flex items-start gap-3 p-4">
      {/* Date block */}
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
        {isNil(date) ? (
          <Calendar className="h-5 w-5" />
        ) : (
          <>
            <span className="text-[10px] font-semibold uppercase leading-none tracking-wide">
              {date.toLocaleDateString('en-US', {
                month: 'short',
                timeZone: EVENT_TIME_ZONE,
              })}
            </span>
            <span className="text-lg font-bold leading-tight">
              {date.toLocaleDateString('en-US', {
                day: 'numeric',
                timeZone: EVENT_TIME_ZONE,
              })}
            </span>
          </>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-snug">
            {event.title ?? 'Untitled Event'}
          </p>
          {!isNil(event.type) && (
            <Badge
              className={cn(
                'shrink-0 border-transparent text-white',
                EVENT_TYPE_COLORS[event.type]
              )}
            >
              {EVENT_TYPE_LABELS[event.type]}
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {formatEventTime(date)}
          {!isNil(event.location) &&
            event.location !== '' &&
            ` · ${event.location}`}
        </p>
      </div>
    </div>
  )
}

function parseEventDate(datetime: string | null): Date | null {
  if (isNil(datetime) || datetime === '') return null

  const date = new Date(datetime)
  return isNaN(date.getTime()) ? null : date
}

function formatEventTime(date: Date | null): string {
  if (isNil(date)) return 'Date TBD'

  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: EVENT_TIME_ZONE,
  })
  return `${time} CT`
}
