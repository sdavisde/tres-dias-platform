import { isNil } from 'lodash'
import type { MeetingMinuteFile } from '@/lib/files/types'
import { formatFileSize } from '@/lib/files/upload-errors'
import { COMMUNITY_TIMEZONE } from '@/lib/utils'

const MONTH_DAY: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  timeZone: COMMUNITY_TIMEZONE,
}

const YEAR: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  timeZone: COMMUNITY_TIMEZONE,
}

const yearOf = (date: Date) => date.toLocaleDateString('en-US', YEAR)

/**
 * "Aug 20" for a file uploaded this year, "Aug 20, 2024" for an older one.
 * Returns null when the timestamp is missing or unparseable so callers can
 * drop the segment instead of printing a placeholder.
 */
export function formatMinutesDate(
  datetime?: string | null,
  now: Date = new Date()
): string | null {
  if (isNil(datetime) || datetime === '') return null

  const date = new Date(datetime)
  if (isNaN(date.getTime())) return null

  const label = date.toLocaleDateString('en-US', MONTH_DAY)
  return yearOf(date) === yearOf(now) ? label : `${label}, ${yearOf(date)}`
}

/**
 * The secondary line under a minutes file: "Aug 20 · 180 KB · Fellowship Hall".
 * Every segment is optional — storage only reports a size for files it has
 * metadata for, and location is captured at upload time.
 */
export function formatMinutesMeta(
  file: MeetingMinuteFile,
  now: Date = new Date()
): string {
  const size = file.metadata?.size

  return [
    formatMinutesDate(file.created_at, now),
    typeof size === 'number' ? formatFileSize(size) : null,
    file.location,
  ]
    .filter((segment): segment is string => !isNil(segment) && segment !== '')
    .join(' · ')
}
