import { isNil } from 'lodash'

// Helpers for the time field: times are "HH:mm" (24-hour) strings, shown to
// people as "7:30 PM".

/** "19:30" → "7:30 PM". */
export function formatTimeOfDay(value: string): string {
  const [hours, minutes] = value.split(':').map(Number)
  const period = hours < 12 ? 'AM' : 'PM'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`
}

const toValue = (hours: number, minutes: number) =>
  `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

/**
 * Reads what someone typed into a time field. Forgiving the way calendar
 * apps are: "7", "7p", "7pm", "7:30 pm", "730p", "1930", "19:30", "noon".
 * Without AM/PM, 1–7 read as PM and 8–11 as AM, since events rarely start
 * at 3 AM or 9 PM.
 * Returns "HH:mm", or null when it can't be read as a time.
 */
export function parseTimeOfDay(input: string): string | null {
  const text = input.trim().toLowerCase().replace(/\s+/g, '').replace(/\./g, '')
  if (text === '') return null
  if (text === 'noon') return '12:00'
  if (text === 'midnight') return '00:00'

  const match = /^(\d{1,4})(?::(\d{1,2}))?(a|am|p|pm)?$/.exec(text)
  if (isNil(match)) return null
  const [, digits, colonMinutes, periodText] = match

  let hours: number
  let minutes: number
  if (!isNil(colonMinutes)) {
    if (digits.length > 2) return null
    hours = Number(digits)
    minutes = Number(colonMinutes)
  } else if (digits.length <= 2) {
    hours = Number(digits)
    minutes = 0
  } else {
    // "730" → 7:30, "1930" → 19:30
    hours = Number(digits.slice(0, -2))
    minutes = Number(digits.slice(-2))
  }

  if (minutes > 59) return null
  const period = periodText?.[0] as 'a' | 'p' | undefined

  if (!isNil(period)) {
    if (hours < 1 || hours > 12) return null
    if (period === 'a') return toValue(hours === 12 ? 0 : hours, minutes)
    return toValue(hours === 12 ? 12 : hours + 12, minutes)
  }

  if (hours > 23) return null
  // No AM/PM on a 12-hour-looking value ("7", "4:30"): 1–7 are afternoon or
  // evening, 8–11 morning — how DTTD's events actually fall
  const looksTwelveHour = digits.length <= 2 || !isNil(colonMinutes)
  if (looksTwelveHour && hours >= 1 && hours <= 7) {
    return toValue(hours + 12, minutes)
  }
  return toValue(hours, minutes)
}

/** Every time of day in `stepMinutes` steps: "00:00", "00:15", … */
export function timeOfDayOptions(stepMinutes = 15): string[] {
  const options: string[] = []
  for (let minute = 0; minute < 24 * 60; minute += stepMinutes) {
    options.push(toValue(Math.floor(minute / 60), minute % 60))
  }
  return options
}

const toMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

/** "30 min", "1 hr", "1.5 hrs" from `start` to `end` (same day), or null. */
export function formatDuration(start: string, end: string): string | null {
  const minutes = toMinutes(end) - toMinutes(start)
  if (minutes <= 0) return null
  if (minutes < 60) return `${minutes} min`
  const hours = minutes / 60
  const rounded = Number.isInteger(hours)
    ? hours
    : Math.round(hours * 100) / 100
  return `${rounded} ${rounded === 1 ? 'hr' : 'hrs'}`
}

/** The option closest to `value` at or after it, for scrolling the list. */
export function nearestOption(options: string[], value: string): string {
  const target = toMinutes(value)
  return options.find((option) => toMinutes(option) >= target) ?? options[0]
}
