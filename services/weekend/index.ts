/**
 * Weekend Service
 *
 * Public API for weekend management operations.
 * All server actions and types are exported from this file.
 */

// Actions (client-callable). Server-only reads live in `./weekend-service`
// and `./cached`; they must never be re-exported here, because client
// components value-import this barrel.
export {
  getAllUsers,
  recordManualPayment,
  getWeekendGroupsByStatus,
  setActiveWeekendGroup,
  createWeekendGroup,
  updateWeekendGroup,
  deleteWeekendGroup,
  saveWeekendGroupFromSidebar,
  addUserToWeekendRoster,
  updateWeekendRosterMember,
} from './actions'

// Service types
export type {
  WeekendRosterMember,
  TeamFormSummary,
  WeekendSidebarPayload,
  LeadershipTeamMember,
  LeadershipTeamData,
} from './types'
export type { WeekendRosterViewData } from './weekend-service'
export type { RosterAssignmentRow } from './repository'

// Re-export commonly used types from lib/weekend/types
export { WeekendType, WeekendStatus } from '@/lib/weekend/types'

export type {
  Weekend,
  WeekendGroup,
  WeekendGroupWithId,
  WeekendStatusValue,
  WeekendWriteInput,
  WeekendUpdateInput,
  CreateWeekendGroupInput,
  UpdateWeekendGroupInput,
} from '@/lib/weekend/types'
