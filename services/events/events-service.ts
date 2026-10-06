import 'server-only'

import { isNil } from 'lodash'
import type { Result } from '@/lib/results'
import { err, ok, isErr } from '@/lib/results'
import type {
  Event,
  RawEventRecord,
  EventCreateInput,
  EventUpdateInput,
} from './types'
import * as EventsRepository from './repository'
import { buildStandardWeekendEvents } from '@/lib/weekend/standard-events'
import type { WeekendGroupWithId } from '@/lib/weekend/types'
import type { ReadOptions } from '@/lib/supabase/server'

// ============================================================================
// Helper Functions (Private)
// ============================================================================

/**
 * Normalizes a raw event record into the application Event type.
 */
function normalizeEvent(raw: RawEventRecord): Event {
  return {
    id: raw.id,
    title: raw.title,
    datetime: raw.datetime,
    location: raw.location,
    endDatetime: raw.end_datetime ?? null,
    weekendGroupId: raw.weekend_group_id ?? null,
    weekendId: raw.weekend_id ?? null,
    type: raw.type ?? null,
    createdAt: raw.created_at,
  }
}

// ============================================================================
// Service Functions (Exported)
// ============================================================================

/**
 * Fetches all events, optionally sorted by a field.
 */
export async function getEvents(
  orderBy: 'datetime' | 'created_at' = 'datetime'
): Promise<Result<string, Event[]>> {
  const result = await EventsRepository.findAllEvents(orderBy)

  if (isErr(result)) {
    return result
  }

  return ok(result.data.map(normalizeEvent))
}

/**
 * Fetches a single event by ID.
 */
export async function getEvent(id: number): Promise<Result<string, Event>> {
  const result = await EventsRepository.findEventById(id)

  if (isErr(result)) {
    return result
  }

  if (isNil(result.data)) {
    return err('Event not found')
  }

  return ok(normalizeEvent(result.data))
}

/**
 * Fetches upcoming events (datetime >= now).
 */
export async function getUpcomingEvents(): Promise<Result<string, Event[]>> {
  const result = await EventsRepository.findUpcomingEvents()

  if (isErr(result)) {
    return result
  }

  return ok(result.data.map(normalizeEvent))
}

/**
 * Fetches past events (datetime < now).
 */
export async function getPastEvents(): Promise<Result<string, Event[]>> {
  const result = await EventsRepository.findPastEvents()

  if (isErr(result)) {
    return result
  }

  return ok(result.data.map(normalizeEvent))
}

/**
 * Fetches events within a specified future time period.
 * @param months - Number of months into the future to fetch events for
 */
export async function getUpcomingEventsForPeriod(
  months: number
): Promise<Result<string, Event[]>> {
  const result = await EventsRepository.findEventsForPeriod(months)

  if (isErr(result)) {
    return result
  }

  return ok(result.data.map(normalizeEvent))
}

/**
 * Fetches all events for a weekend group.
 * @param groupId - The weekend group ID
 */
export async function getEventsForWeekendGroup(
  groupId: string,
  options?: ReadOptions
): Promise<Result<string, Event[]>> {
  const result = await EventsRepository.findEventsByGroupId(groupId, options)

  if (isErr(result)) {
    return err(`Failed to get events for weekend group: ${result.error}`)
  }

  return ok(result.data.map(normalizeEvent))
}

/**
 * Creates a new event.
 */
export async function createEvent(
  data: EventCreateInput
): Promise<Result<string, Event>> {
  const result = await EventsRepository.insertEvent(data)

  if (isErr(result)) {
    return err(`Failed to create event: ${result.error}`)
  }

  return ok(normalizeEvent(result.data))
}

/**
 * Creates every standard event (sendoff, weekend, serenade practice, serenade,
 * closing) for both weekends of a group, at their usual times.
 */
export async function createStandardEventsForGroup(
  group: WeekendGroupWithId
): Promise<Result<string, Event[]>> {
  const weekends = Object.values(group.weekends)
  const groupNumber = weekends.find((w) => !isNil(w.number))?.number ?? null
  const drafts = weekends.flatMap((weekend) =>
    buildStandardWeekendEvents(
      {
        id: weekend.id,
        type: weekend.type,
        startDate: weekend.start_date,
        groupId: group.groupId,
      },
      groupNumber
    )
  )

  const result = await EventsRepository.insertEvents(
    drafts.map((draft) => ({
      title: draft.title,
      type: draft.type,
      datetime: draft.datetime,
      end_datetime: draft.endDatetime,
      weekend_id: draft.weekendId,
      weekend_group_id: draft.weekendGroupId,
    }))
  )

  if (isErr(result)) {
    return err(`Failed to create standard events: ${result.error}`)
  }

  return ok(result.data.map(normalizeEvent))
}

/**
 * Updates an event.
 */
export async function updateEvent(
  id: number,
  data: EventUpdateInput
): Promise<Result<string, Event>> {
  const result = await EventsRepository.updateEventById(id, data)

  if (isErr(result)) {
    return err(`Failed to update event: ${result.error}`)
  }

  return ok(normalizeEvent(result.data))
}

/**
 * Gets the secuela event date for a weekend group.
 * Returns the datetime string if a secuela event exists, null otherwise.
 */
export async function getSecuelaDateForGroup(
  groupId: string
): Promise<Result<string, string | null>> {
  const result = await EventsRepository.findSecuelaEventByGroupId(groupId)

  if (isErr(result)) {
    return err(`Failed to get secuela date: ${result.error}`)
  }

  return ok(result.data?.datetime ?? null)
}

/**
 * Fetches upcoming community events (not associated with any weekend group).
 */
export async function getCommunityEvents(): Promise<Result<string, Event[]>> {
  const result = await EventsRepository.findUpcomingCommunityEvents()

  if (isErr(result)) {
    return err(`Failed to get community events: ${result.error}`)
  }

  return ok(result.data.map(normalizeEvent))
}

/**
 * Deletes an event.
 */
export async function deleteEvent(
  id: number
): Promise<Result<string, { success: boolean }>> {
  const result = await EventsRepository.deleteEventById(id)

  if (isErr(result)) {
    return err(`Failed to delete event: ${result.error}`)
  }

  return ok({ success: true })
}
