/**
 * Events Service
 *
 * Public API for event management operations.
 * All server actions and types are exported from this file.
 */

// Actions (client-callable). Server-only reads live in `./events-service`
// and `./cached`; they must never be re-exported here, because client
// components value-import this barrel.
export { getPastEvents, createEvent, updateEvent, deleteEvent } from './actions'

// Types
export type { Event, EventCreateInput, EventUpdateInput } from './actions'

export {
  EventType,
  EVENT_TYPE_VALUES,
  EVENT_TYPE_COLORS,
  EVENT_TYPE_BORDER_COLORS,
  EVENT_TYPE_LABELS,
  SINGLETON_EVENT_TYPES,
  GROUP_EVENT_TYPES,
} from './types'

export type { EventTypeValue } from './types'
