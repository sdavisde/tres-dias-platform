'use client'

import Link from 'next/link'
import { isNil } from 'lodash'
import { Pencil, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatEventWhen } from '@/lib/weekend/event-times'
import {
  STANDARD_WEEKEND_EVENTS,
  standardEventTitle,
  suggestStandardEventTimes,
} from '@/lib/weekend/standard-events'
import type { Weekend } from '@/lib/weekend/types'
import type { Event } from '@/services/events'
import { EVENT_TYPE_LABELS, EventType } from '@/services/events/types'
import { EventQuickEditPopover, type QuickEditTarget } from './event-quick-edit'

/** Earliest first; events with no date go last. */
const byStart = (a: Event, b: Event) =>
  (a.datetime ?? '￿').localeCompare(b.datetime ?? '￿')

interface ScheduleRowProps {
  label: string
  /** The event on the calendar, or null when this slot is still open. */
  event: Event | null
  /** What a click creates when the slot is open. */
  createTarget: QuickEditTarget | null
  canEdit: boolean
}

/** One line of the schedule: label, when (or "Add"), and the editor. */
function ScheduleRow({
  label,
  event,
  createTarget,
  canEdit,
}: ScheduleRowProps) {
  const when =
    isNil(event) || isNil(event.datetime)
      ? null
      : formatEventWhen(event.datetime, event.endDatetime)

  const content = (
    <>
      <span className="w-32 shrink-0 font-medium">{label}</span>
      {isNil(event) ? (
        <span
          className={cn(
            'flex items-center gap-1',
            canEdit ? 'font-semibold text-primary' : 'text-muted-foreground'
          )}
        >
          {canEdit && <Plus className="h-3.5 w-3.5" />}
          {canEdit ? 'Add' : 'Not scheduled'}
        </span>
      ) : (
        <span className="min-w-0 flex-1 truncate text-muted-foreground">
          {when ?? 'No date'}
        </span>
      )}
      {canEdit && !isNil(event) && (
        <Pencil className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}
    </>
  )

  const target: QuickEditTarget | null = isNil(event)
    ? createTarget
    : { mode: 'edit', event }

  if (!canEdit || isNil(target)) {
    return (
      <div className="flex min-h-11 items-center gap-2 px-2 text-sm">
        {content}
      </div>
    )
  }

  return (
    <EventQuickEditPopover target={target}>
      <button
        type="button"
        className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-muted"
      >
        {content}
      </button>
    </EventQuickEditPopover>
  )
}

interface WeekendEventsListProps {
  weekend: Weekend
  groupNumber: number | null
  /** The group's events; this list picks out the weekend's own. */
  events: Event[]
  canEdit: boolean
}

/**
 * The standard events of one weekend (sendoff through closing) with their
 * times, each editable in place. Open slots suggest their usual time.
 */
export function WeekendEventsList({
  weekend,
  groupNumber,
  events,
  canEdit,
}: WeekendEventsListProps) {
  return (
    <div className="space-y-1">
      <p className="px-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Events
      </p>
      <div className="divide-y divide-divider">
        {STANDARD_WEEKEND_EVENTS.map((standard) => {
          const event =
            events
              .filter(
                (e) => e.weekendId === weekend.id && e.type === standard.type
              )
              .sort(byStart)[0] ?? null
          const suggested = suggestStandardEventTimes(
            standard,
            weekend.start_date
          )
          return (
            <ScheduleRow
              key={standard.type}
              label={EVENT_TYPE_LABELS[standard.type]}
              event={event}
              canEdit={canEdit}
              createTarget={{
                mode: 'create',
                draft: {
                  title: standardEventTitle(
                    standard.type,
                    weekend.type,
                    groupNumber
                  ),
                  type: standard.type,
                  weekendGroupId: weekend.groupId ?? '',
                  weekendId: weekend.id,
                  ...suggested,
                },
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

interface GroupEventsStripProps {
  groupId: string
  groupNumber: number | null
  events: Event[]
  canEdit: boolean
}

/**
 * The group-wide events: secuela and team meetings. Their dates vary, so
 * nothing is suggested beyond secuela's usual 10 AM start.
 */
export function GroupEventsStrip({
  groupId,
  groupNumber,
  events,
  canEdit,
}: GroupEventsStripProps) {
  const suffix = isNil(groupNumber) ? '' : ` #${groupNumber}`
  const groupPrefix = isNil(groupNumber) ? '' : `DTTD #${groupNumber} `
  const secuela =
    events.filter((e) => e.type === EventType.SECUELA).sort(byStart)[0] ?? null
  const meetings = events
    .filter((e) => e.type === EventType.MEETING)
    .sort(byStart)

  return (
    <div className="grid gap-x-6 gap-y-1 rounded-lg border bg-card px-3 py-2 md:grid-cols-2">
      <ScheduleRow
        label="Secuela"
        event={secuela}
        canEdit={canEdit}
        createTarget={{
          mode: 'create',
          draft: {
            title: `${groupPrefix}Secuela`,
            type: EventType.SECUELA,
            weekendGroupId: groupId,
            weekendId: null,
            datetime: null,
            endDatetime: null,
            // Secuelas usually start mid-morning
            defaultTime: '10:00',
          },
        }}
      />
      <div className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 px-2 text-sm">
        <span className="w-32 shrink-0 font-medium">Team meetings</span>
        <span className="text-muted-foreground">
          {meetings.length === 0 ? 'None yet' : `${meetings.length} scheduled`}
        </span>
        {meetings.length > 0 && (
          <Link
            href="/admin/events"
            className="text-xs text-muted-foreground underline underline-offset-4"
          >
            View
          </Link>
        )}
        {canEdit && (
          <EventQuickEditPopover
            target={{
              mode: 'create',
              draft: {
                title: `Team Meeting ${meetings.length + 1}${suffix}`,
                type: EventType.MEETING,
                weekendGroupId: groupId,
                weekendId: null,
                datetime: null,
                endDatetime: null,
              },
            }}
          >
            <button
              type="button"
              className="ml-auto flex min-h-11 cursor-pointer items-center gap-1 rounded-md px-2 font-semibold text-primary hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" />
              Meeting
            </button>
          </EventQuickEditPopover>
        )}
      </div>
    </div>
  )
}
