'use server'

import { updateTag } from 'next/cache'
import { isNil } from 'lodash'
import { TAGS } from '@/lib/cache/tags'
import { isErr } from '@/lib/results'
import { authorizedAction } from '@/lib/actions/authorized-action'
import { Permission } from '@/lib/security'
import type { Event, EventCreateInput, EventUpdateInput } from './types'
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
 * Fetches past events (datetime < now). Any signed-in member may read events.
 */
export const getPastEvents = authorizedAction<[], Event[]>(
  'authenticated',
  async () => EventsService.getPastEvents()
)

/**
 * Creates a new event. Mirrors the admin events page's `canEdit` gate.
 */
export const createEvent = authorizedAction<[EventCreateInput], Event>(
  Permission.WRITE_EVENTS,
  async (_user, data) => {
    const result = await EventsService.createEvent(data)
    if (!isErr(result)) invalidateEvents(result.data.weekendGroupId)
    return result
  }
)

/**
 * Updates an event. Mirrors the admin events page's `canEdit` gate.
 */
export const updateEvent = authorizedAction<[number, EventUpdateInput], Event>(
  Permission.WRITE_EVENTS,
  async (_user, id, data) => {
    const result = await EventsService.updateEvent(id, data)
    if (!isErr(result)) {
      invalidateEvents(result.data.weekendGroupId)
      // Moving an event between groups changes both groups' schedules.
      if (!isNil(data.weekend_group_id)) invalidateEvents(data.weekend_group_id)
    }
    return result
  }
)

/**
 * Deletes an event. Mirrors the admin events page's `canEdit` gate.
 */
export const deleteEvent = authorizedAction<[number], { success: boolean }>(
  Permission.WRITE_EVENTS,
  async (_user, id) => {
    const result = await EventsService.deleteEvent(id)
    if (!isErr(result)) invalidateEvents()
    return result
  }
)
