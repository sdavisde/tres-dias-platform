/**
 * Small, dependency-free helpers for the seed generator: a seeded PRNG (so the
 * same people land in the same roles on every run), stable UUIDs, calendar-day
 * arithmetic and SQL literal rendering.
 */
import { createHash } from 'node:crypto'

// -----------------------------------------------------------------------------
// Random
// -----------------------------------------------------------------------------

export type Rng = {
  next: () => number
  int: (min: number, max: number) => number
  pick: <T>(items: readonly T[]) => T
  chance: (probability: number) => boolean
  shuffle: <T>(items: readonly T[]) => T[]
}

/** mulberry32 — tiny, fast and good enough for fixture data. */
export function createRng(seed: string): Rng {
  let state = createHash('sha1').update(seed).digest().readUInt32LE(0)

  const next = () => {
    state = (state + 0x6d2b79f5) | 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const int = (min: number, max: number) =>
    min + Math.floor(next() * (max - min + 1))

  return {
    next,
    int,
    pick: (items) => items[int(0, items.length - 1)],
    chance: (probability) => next() < probability,
    shuffle: (items) => {
      const copy = [...items]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = int(0, i)
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
      }
      return copy
    },
  }
}

/** A UUID derived from `key`, so ids (and therefore URLs) survive reseeds. */
export function stableId(key: string): string {
  const hex = createHash('sha1').update(`dttd-seed:${key}`).digest('hex')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    `${((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-')
}

// -----------------------------------------------------------------------------
// Calendar days (UTC midnight, no time-of-day drift)
// -----------------------------------------------------------------------------

export type Day = Date

const THURSDAY = 4

export function parseDay(value: string): Day {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function today(): Day {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

export function addDays(day: Day, days: number): Day {
  return new Date(day.getTime() + days * 86_400_000)
}

export function daysBetween(from: Day, to: Day): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

export function thursdayOnOrAfter(day: Day): Day {
  return addDays(day, (THURSDAY - day.getUTCDay() + 7) % 7)
}

export function thursdayOnOrBefore(day: Day): Day {
  return addDays(day, -((day.getUTCDay() - THURSDAY + 7) % 7))
}

/** `YYYY-MM-DD` */
export function iso(day: Day): string {
  return day.toISOString().slice(0, 10)
}

// -----------------------------------------------------------------------------
// SQL rendering
// -----------------------------------------------------------------------------

/** A value rendered verbatim (an expression rather than a literal). */
export type Raw = { raw: string }

export const raw = (sql: string): Raw => ({ raw: sql })

export type SqlValue = string | number | boolean | null | Raw | string[]

export type Row = Record<string, SqlValue>

export const COMMUNITY_TIMEZONE = 'America/Chicago'

/** A wall-clock time in the community's timezone, as a timestamptz. */
export function localTime(day: Day, time: string): Raw {
  return raw(
    `('${iso(day)} ${time}'::timestamp AT TIME ZONE '${COMMUNITY_TIMEZONE}')`
  )
}

/** A timestamptz at noon community time — for created_at-style columns. */
export function stamp(day: Day, time = '12:00'): Raw {
  return localTime(day, time)
}

function literal(value: SqlValue): string {
  if (value === null) return 'NULL'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (Array.isArray(value)) {
    return value.length === 0
      ? 'ARRAY[]::text[]'
      : `ARRAY[${value.map(literal).join(', ')}]`
  }
  if (typeof value === 'object') return value.raw
  return `'${value.replaceAll("'", "''")}'`
}

/** Multi-row INSERTs, chunked so no single statement gets unwieldy. */
export function insert(table: string, rows: Row[]): string {
  if (rows.length === 0) return `-- ${table}: no rows\n`

  const columns = Object.keys(rows[0])
  const statements: string[] = []

  for (let i = 0; i < rows.length; i += 200) {
    const values = rows
      .slice(i, i + 200)
      .map((row) => `  (${columns.map((c) => literal(row[c])).join(', ')})`)
      .join(',\n')
    statements.push(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES\n${values};`
    )
  }

  return `${statements.join('\n')}\n`
}
