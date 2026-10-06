import { addDays, format, parseISO } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import { isNil } from 'lodash'
import { COMMUNITY_TIMEZONE } from '@/lib/utils'
import {
  EVENT_TYPE_LABELS,
  EventType,
  type EventTypeValue,
} from '@/services/events/types'
import { formatWeekendGender } from './labels'
import type { WeekendType } from './types'

// Pure helpers for the events every weekend needs. No server imports, so the
// Weekends page, the group-creation flow and tests can all share them.

/** A time on a day of the weekend, counted from its Thursday start. */
type WeekendTime = { dayOffset: number; time: string }

export type StandardWeekendEvent = {
  type: EventTypeValue
  start: WeekendTime
  end: WeekendTime | null
}

/**
 * The events every weekend has, in the order they happen, with the times they
 * usually run (community time). Offsets count from the weekend's Thursday.
 */
export const STANDARD_WEEKEND_EVENTS: StandardWeekendEvent[] = [
  {
    type: EventType.SENDOFF,
    start: { dayOffset: 0, time: '19:00' },
    end: { dayOffset: 0, time: '20:00' },
  },
  {
    type: EventType.WEEKEND,
    start: { dayOffset: 0, time: '19:00' },
    end: { dayOffset: 3, time: '17:00' },
  },
  {
    type: EventType.SERENADE_PRACTICE,
    start: { dayOffset: 2, time: '16:30' },
    end: null,
  },
  {
    type: EventType.SERENADE,
    start: { dayOffset: 2, time: '19:00' },
    end: null,
  },
  {
    type: EventType.CLOSING,
    start: { dayOffset: 3, time: '17:00' },
    end: null,
  },
]

/** "Men's Serenade #13" — the title the Events page gives a weekend slot. */
export function standardEventTitle(
  type: EventTypeValue,
  weekendType: WeekendType | null,
  groupNumber: number | null
): string {
  const gender = formatWeekendGender(weekendType, 'possessive')
  const parts = [gender, EVENT_TYPE_LABELS[type]].filter(
    (part): part is string => !isNil(part)
  )
  const suffix = isNil(groupNumber) ? '' : ` #${groupNumber}`
  return `${parts.join(' ')}${suffix}`
}

/** UTC ISO string for a community-time wall clock on a weekend day. */
function toInstant(weekendStart: string, at: WeekendTime): string {
  const day = format(
    addDays(parseISO(weekendStart), at.dayOffset),
    'yyyy-MM-dd'
  )
  return fromZonedTime(`${day}T${at.time}:00`, COMMUNITY_TIMEZONE).toISOString()
}

/** Suggested start/end for one standard event on a weekend. */
export function suggestStandardEventTimes(
  standard: StandardWeekendEvent,
  weekendStart: string
): { datetime: string; endDatetime: string | null } {
  return {
    datetime: toInstant(weekendStart, standard.start),
    endDatetime: isNil(standard.end)
      ? null
      : toInstant(weekendStart, standard.end),
  }
}

export type StandardEventDraft = {
  title: string
  type: EventTypeValue
  datetime: string
  endDatetime: string | null
  weekendId: string
  weekendGroupId: string
}

/**
 * Every standard event for one weekend, at its usual time. Used when a new
 * weekend group is created.
 */
export function buildStandardWeekendEvents(
  weekend: {
    id: string
    type: WeekendType | null
    startDate: string
    groupId: string
  },
  groupNumber: number | null
): StandardEventDraft[] {
  return STANDARD_WEEKEND_EVENTS.map((standard) => ({
    title: standardEventTitle(standard.type, weekend.type, groupNumber),
    type: standard.type,
    ...suggestStandardEventTimes(standard, weekend.startDate),
    weekendId: weekend.id,
    weekendGroupId: weekend.groupId,
  }))
}
