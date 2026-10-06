'use client'

import { useState } from 'react'
import { isNil } from 'lodash'
import { ChevronDown, Pencil, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatEventWhen } from '@/lib/weekend/event-times'
import {
  STANDARD_WEEKEND_EVENTS,
  standardEventTitle,
  suggestStandardEventTimes,
} from '@/lib/weekend/standard-events'
import type { Weekend } from '@/lib/weekend/types'
import type { Event } from '@/services/events'
import {
  EVENT_TYPE_COLORS,
  EVENT_TYPE_LABELS,
  EventType,
  type EventTypeValue,
} from '@/services/events/types'
import { EventQuickEditPopover, type QuickEditTarget } from './event-quick-edit'

/** Earliest first; events with no date go last. */
const byStart = (a: Event, b: Event) =>
  (a.datetime ?? '￿').localeCompare(b.datetime ?? '￿')

interface ScheduleRowProps {
  label: string
  /** Colors the row's dot to match the Events page calendar. */
  type: EventTypeValue
  /** The event on the calendar, or null when this slot is still open. */
  event: Event | null
  /** What a click creates when the slot is open. */
  createTarget: QuickEditTarget | null
  canEdit: boolean
}

/** Small colored dot for an event type; faded while the slot is empty. */
export function EventTypeDot({
  type,
  muted = false,
}: {
  type: EventTypeValue
  muted?: boolean
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'h-2 w-2 shrink-0 rounded-full',
        EVENT_TYPE_COLORS[type],
        muted && 'opacity-30'
      )}
    />
  )
}

// 44px touch targets on phones, denser rows on desktop
const ROW_CLASSES = 'flex min-h-11 items-center gap-2 px-2 text-sm md:min-h-9'

/** One line of the schedule: label, when (or "Not scheduled"), and the editor. */
function ScheduleRow({
  label,
  type,
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
      <EventTypeDot type={type} muted={isNil(event)} />
      <span className="w-32 shrink-0 truncate font-medium" title={label}>
        {label}
      </span>
      <span className="min-w-0 flex-1 truncate text-muted-foreground">
        {isNil(event) ? 'Not scheduled' : (when ?? 'No date')}
      </span>
      {/* Hover-only on desktop; always shown on touch, where there's no hover */}
      {canEdit &&
        (isNil(event) ? (
          <span className="flex shrink-0 items-center gap-0.5 font-semibold text-primary transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
            <Plus className="h-3.5 w-3.5" />
            Add
          </span>
        ) : (
          <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100" />
        ))}
    </>
  )

  const target: QuickEditTarget | null = isNil(event)
    ? createTarget
    : { mode: 'edit', event }

  if (!canEdit || isNil(target)) {
    return <div className={ROW_CLASSES}>{content}</div>
  }

  return (
    <EventQuickEditPopover target={target}>
      <button
        type="button"
        className={cn(
          ROW_CLASSES,
          'group w-full cursor-pointer rounded-md text-left hover:bg-muted'
        )}
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
              type={standard.type}
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
  const [showMeetings, setShowMeetings] = useState(false)

  return (
    <div className="grid items-start gap-x-6 gap-y-1 rounded-lg border bg-card px-3 py-2 md:grid-cols-2">
      <ScheduleRow
        label="Secuela"
        type={EventType.SECUELA}
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
      {/* Meetings keep to the right column, list included, so the space
          under secuela stays empty on desktop */}
      <div>
        <div className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 px-2 text-sm md:min-h-9">
          <EventTypeDot
            type={EventType.MEETING}
            muted={meetings.length === 0}
          />
          <span className="w-32 shrink-0 font-medium">Team meetings</span>
          <span className="text-muted-foreground">
            {meetings.length === 0
              ? 'None yet'
              : `${meetings.length} scheduled`}
          </span>
          {meetings.length > 0 && (
            <button
              type="button"
              onClick={() => setShowMeetings((shown) => !shown)}
              aria-expanded={showMeetings}
              className="flex min-h-11 cursor-pointer items-center gap-0.5 rounded-md px-1 text-xs md:min-h-9 font-semibold text-primary hover:text-primary-hover"
            >
              {showMeetings ? 'Hide' : 'Show'}
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 transition-transform',
                  showMeetings && 'rotate-180'
                )}
              />
            </button>
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
                className="ml-auto flex min-h-11 cursor-pointer items-center gap-1 rounded-md px-2 font-semibold md:min-h-9 text-primary hover:bg-muted"
              >
                <Plus className="h-3.5 w-3.5" />
                Meeting
              </button>
            </EventQuickEditPopover>
          )}
        </div>
        {showMeetings && meetings.length > 0 && (
          <div className="divide-y divide-divider border-t border-divider">
            {meetings.map((meeting) => (
              <ScheduleRow
                key={meeting.id}
                label={meeting.title ?? 'Team meeting'}
                type={EventType.MEETING}
                event={meeting}
                createTarget={null}
                canEdit={canEdit}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
