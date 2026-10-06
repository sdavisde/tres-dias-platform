import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { isNil } from 'lodash'
import { COMMUNITY_TIMEZONE } from '@/lib/utils'

// Converts between stored event instants and the community-time date/time
// inputs the Weekends page's quick editor uses.

/** "2026-12-03" and "19:00" for an instant, in community time. */
export function toCommunityParts(iso: string): { date: string; time: string } {
  return {
    date: formatInTimeZone(iso, COMMUNITY_TIMEZONE, 'yyyy-MM-dd'),
    time: formatInTimeZone(iso, COMMUNITY_TIMEZONE, 'HH:mm'),
  }
}

/** The instant for a community-time date ("2026-12-03") and time ("19:00"). */
export function fromCommunityParts(date: string, time: string): string {
  return fromZonedTime(`${date}T${time}:00`, COMMUNITY_TIMEZONE).toISOString()
}

/**
 * Compact schedule text for a weekend card row: "Thu, Dec 3 · 7:00 PM", or
 * "Thu, Dec 3 7:00 PM → Sun 5:00 PM" when the event ends on a later day.
 */
export function formatEventWhen(
  datetime: string,
  endDatetime: string | null
): string {
  const start = formatInTimeZone(datetime, COMMUNITY_TIMEZONE, 'EEE, MMM d')
  const startTime = formatInTimeZone(datetime, COMMUNITY_TIMEZONE, 'h:mm a')
  if (isNil(endDatetime)) return `${start} · ${startTime}`

  const sameDay =
    toCommunityParts(datetime).date === toCommunityParts(endDatetime).date
  const endTime = formatInTimeZone(endDatetime, COMMUNITY_TIMEZONE, 'h:mm a')
  if (sameDay) return `${start} · ${startTime}–${endTime}`

  const endDay = formatInTimeZone(endDatetime, COMMUNITY_TIMEZONE, 'EEE')
  return `${start} ${startTime} → ${endDay} ${endTime}`
}
