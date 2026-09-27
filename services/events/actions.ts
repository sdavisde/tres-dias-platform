'use server'

import { updateTag } from 'next/cache'
import { isNil } from 'lodash'
import { TAGS } from '@/lib/cache/tags'
import { isErr } from '@/lib/results'
import type { EventCreateInput, EventUpdateInput } from './types'
import * as EventsService from './events-service'

/**
 * Drops the cached event reads after a write. An update or delete may not
 * name the group, so the table-wide tag always goes along.
 */
function invalidateEvents(groupId?: string | null) {
  updateTag(TAGS.events)
  if (!isNil(groupId)) updateTag(TAGS.eventsForGroup(groupId))
}

// Re-export types for convenience
export type { Event, EventCreateInput, EventUpdateInput } from './types'

/**
 * Fetches past events (datetime < now).
 * Public - events are visible to all authenticated users.
 */
export async function getPastEvents() {
  return EventsService.getPastEvents()
}

/**
 * Creates a new event.
 * Public - relies on RLS for authorization.
 */
export async function createEvent(data: EventCreateInput) {
  const result = await EventsService.createEvent(data)
  if (!isErr(result)) invalidateEvents(result.data.weekendGroupId)
  return result
}

/**
 * Updates an event.
 * Public - relies on RLS for authorization.
 */
export async function updateEvent(id: number, data: EventUpdateInput) {
  const result = await EventsService.updateEvent(id, data)
  if (!isErr(result)) {
    invalidateEvents(result.data.weekendGroupId)
    // Moving an event between groups changes both groups' schedules.
    if (!isNil(data.weekend_group_id)) invalidateEvents(data.weekend_group_id)
  }
  return result
}

/**
 * Deletes an event.
 * Public - relies on RLS for authorization.
 */
export async function deleteEvent(id: number) {
  const result = await EventsService.deleteEvent(id)
  if (!isErr(result)) invalidateEvents()
  return result
}
