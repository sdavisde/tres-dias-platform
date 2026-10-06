import 'server-only'

import {
  createClient,
  readClient,
  type ReadOptions,
} from '@/lib/supabase/server'
import type { Result } from '@/lib/results'
import { err, ok } from '@/lib/results'
import { isSupabaseError } from '@/lib/supabase/utils'
import { addMonths } from 'date-fns'
import type {
  RawEventRecord,
  EventCreateInput,
  EventUpdateInput,
} from './types'
import { isNil } from 'lodash'

/**
 * Fetches all events, optionally sorted by a field.
 */
export async function findAllEvents(
  orderBy: 'datetime' | 'created_at' = 'datetime'
): Promise<Result<string, RawEventRecord[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order(orderBy, { ascending: true })

  if (isSupabaseError(error)) {
    return err(error.message)
  }

  return ok(data ?? [])
}

/**
 * Fetches a single event by ID.
 */
export async function findEventById(
  id: number
): Promise<Result<string, RawEventRecord | null>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (isSupabaseError(error)) {
    return err(error.message)
  }

  return ok(data)
}

/**
 * Fetches upcoming events (datetime >= now).
 */
export async function findUpcomingEvents(): Promise<
  Result<string, RawEventRecord[]>
> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('datetime', now)
    .order('datetime', { ascending: true })

  if (isSupabaseError(error)) {
    return err(error.message)
  }

  return ok(data ?? [])
}

/**
 * Fetches past events (datetime < now).
 */
export async function findPastEvents(): Promise<
  Result<string, RawEventRecord[]>
> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .lt('datetime', now)
    .order('datetime', { ascending: false })

  if (isSupabaseError(error)) {
    return err(error.message)
  }

  return ok(data ?? [])
}

/**
 * Fetches events within a specified future time period.
 */
export async function findEventsForPeriod(
  months: number
): Promise<Result<string, RawEventRecord[]>> {
  const supabase = await createClient()
  const now = new Date()
  const futureDate = addMonths(now, months)

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('datetime', now.toISOString())
    .lte('datetime', futureDate.toISOString())
    .order('datetime', { ascending: true })

  if (isSupabaseError(error)) {
    return err(error.message)
  }

  return ok(data ?? [])
}

/**
 * Fetches events for a specific weekend group.
 */
export async function findEventsByGroupId(
  groupId: string,
  options?: ReadOptions
): Promise<Result<string, RawEventRecord[]>> {
  const supabase = await readClient(options)

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('weekend_group_id', groupId)
    .order('datetime', { ascending: true })

  if (isSupabaseError(error)) {
    return err(error.message)
  }

  return ok(data ?? [])
}

/**
 * Fetches upcoming community events (no weekend group or weekend association).
 */
export async function findUpcomingCommunityEvents(): Promise<
  Result<string, RawEventRecord[]>
> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .is('weekend_group_id', null)
    .is('weekend_id', null)
    .gte('datetime', now)
    .order('datetime', { ascending: true })

  if (isSupabaseError(error)) {
    return err(error.message)
  }

  return ok(data ?? [])
}

/**
 * Inserts a new event.
 */
export async function insertEvent(
  data: EventCreateInput
): Promise<Result<string, RawEventRecord>> {
  const supabase = await createClient()

  const { data: event, error } = await supabase
    .from('events')
    .insert(data)
    .select()
    .single()

  if (isSupabaseError(error)) {
    return err(error.message)
  }

  if (isNil(event)) {
    return err('Event not found')
  }

  return ok(event)
}

/**
 * Inserts several events in one statement.
 */
export async function insertEvents(
  data: EventCreateInput[]
): Promise<Result<string, RawEventRecord[]>> {
  if (data.length === 0) return ok([])
  const supabase = await createClient()

  const { data: events, error } = await supabase
    .from('events')
    .insert(data)
    .select()

  if (isSupabaseError(error)) {
    return err(error.message)
  }

  return ok(events ?? [])
}

/**
 * Updates an event by ID.
 */
export async function updateEventById(
  id: number,
  data: EventUpdateInput
): Promise<Result<string, RawEventRecord>> {
  const supabase = await createClient()

  const { data: event, error } = await supabase
    .from('events')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (isSupabaseError(error)) {
    return err(error.message)
  }

  if (isNil(event)) {
    return err('Event not found')
  }

  return ok(event)
}

/**
 * Fetches the secuela event for a weekend group.
 * Returns the first secuela event found (ordered by datetime).
 */
export async function findSecuelaEventByGroupId(
  groupId: string
): Promise<Result<string, RawEventRecord | null>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('weekend_group_id', groupId)
    .eq('type', 'secuela')
    .order('datetime', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (isSupabaseError(error)) {
    return err(error.message)
  }

  return ok(data)
}

/**
 * Deletes an event by ID.
 */
export async function deleteEventById(
  id: number
): Promise<Result<string, void>> {
  const supabase = await createClient()

  const { error } = await supabase.from('events').delete().eq('id', id)

  if (isSupabaseError(error)) {
    return err(error.message)
  }

  return ok(undefined)
}
