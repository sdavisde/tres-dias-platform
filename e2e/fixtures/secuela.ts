import type { BrowserContext } from '@playwright/test'
import { isNil } from 'lodash'
import { E2E_NO_CACHE_COOKIE } from '@/lib/cache/e2e-bypass'
import { EventType } from '@/services/events/types'
import { adminClient } from './supabase'

/**
 * Arranges the active group's secuela for the home-page banner spec: when it
 * happens, whether the group is active, and whether the member signed in.
 * Everything is written with the service-role client and put back by
 * {@link restoreSecuelaWorld}.
 */

export type SecuelaWorldSnapshot = {
  groupId: string
  /** Secuela events that existed before the spec (`datetime` as found). */
  events: { id: number; datetime: string | null; end_datetime: string | null }[]
  /** Id of a secuela the spec had to create, deleted on restore. */
  createdEventId: number | null
  weekends: { id: string; status: string | null }[]
  groupMemberId: string
  attendedSecuelaAt: string | null
}

function unwrap<T>(
  result: { data: T; error: { message: string } | null },
  what: string
): NonNullable<T> {
  const { data, error } = result
  if (!isNil(error) || isNil(data)) {
    throw new Error(`secuela fixture: ${what}: ${error?.message}`)
  }
  return data as NonNullable<T>
}

export async function snapshotSecuelaWorld(
  groupId: string,
  groupMemberId: string
): Promise<SecuelaWorldSnapshot> {
  const db = adminClient()
  const events = unwrap(
    await db
      .from('events')
      .select('id, datetime, end_datetime')
      .eq('weekend_group_id', groupId)
      .eq('type', EventType.SECUELA),
    'secuela events'
  )
  const weekends = unwrap(
    await db.from('weekends').select('id, status').eq('group_id', groupId),
    'group weekends'
  )
  const member = unwrap(
    await db
      .from('weekend_group_members')
      .select('attended_secuela_at')
      .eq('id', groupMemberId)
      .single(),
    'group member'
  )
  return {
    groupId,
    events,
    createdEventId: null,
    weekends,
    groupMemberId,
    attendedSecuelaAt: member.attended_secuela_at,
  }
}

export async function restoreSecuelaWorld(
  snapshot: SecuelaWorldSnapshot
): Promise<void> {
  const db = adminClient()
  for (const event of snapshot.events) {
    await db
      .from('events')
      .update({ datetime: event.datetime, end_datetime: event.end_datetime })
      .eq('id', event.id)
  }
  if (!isNil(snapshot.createdEventId)) {
    await db.from('events').delete().eq('id', snapshot.createdEventId)
  }
  for (const weekend of snapshot.weekends) {
    await db
      .from('weekends')
      .update({ status: weekend.status })
      .eq('id', weekend.id)
  }
  await db
    .from('weekend_group_members')
    .update({ attended_secuela_at: snapshot.attendedSecuelaAt })
    .eq('id', snapshot.groupMemberId)
}

/**
 * Puts the group's secuela at `start`–`end`, creating one when the seed has
 * none (remembered on the snapshot so restore deletes it).
 */
export async function setSecuelaTime(
  snapshot: SecuelaWorldSnapshot,
  start: Date,
  end: Date
): Promise<void> {
  const db = adminClient()
  const times = {
    datetime: start.toISOString(),
    end_datetime: end.toISOString(),
  }
  if (snapshot.events.length > 0 || !isNil(snapshot.createdEventId)) {
    unwrap(
      await db
        .from('events')
        .update(times)
        .eq('weekend_group_id', snapshot.groupId)
        .eq('type', EventType.SECUELA)
        .select('id'),
      'move secuela'
    )
    return
  }
  const created = unwrap(
    await db
      .from('events')
      .insert({
        ...times,
        type: EventType.SECUELA,
        title: 'Secuela',
        weekend_group_id: snapshot.groupId,
      })
      .select('id')
      .single(),
    'create secuela'
  )
  snapshot.createdEventId = created.id
}

/** Sets every weekend of the group to `status`. */
export async function setGroupStatus(
  snapshot: SecuelaWorldSnapshot,
  status: string
): Promise<void> {
  unwrap(
    await adminClient()
      .from('weekends')
      .update({ status })
      .eq('group_id', snapshot.groupId)
      .select('id'),
    'set group status'
  )
}

export async function setSecuelaSignIn(
  snapshot: SecuelaWorldSnapshot,
  at: Date | null
): Promise<void> {
  unwrap(
    await adminClient()
      .from('weekend_group_members')
      .update({ attended_secuela_at: at?.toISOString() ?? null })
      .eq('id', snapshot.groupMemberId)
      .select('id'),
    'set secuela sign-in'
  )
}

/**
 * Makes the dev server read events and weekends around its shared cache for
 * this context, since the rows above change without an `updateTag`. (The CI
 * build bypasses the cache through `E2E_DISABLE_SERVER_CACHE` instead.)
 */
export async function bypassServerCache(
  context: BrowserContext,
  baseURL: string
): Promise<void> {
  await context.addCookies([
    { name: E2E_NO_CACHE_COOKIE, value: '1', url: baseURL },
  ])
}
