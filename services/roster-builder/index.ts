/**
 * Roster Builder Service
 *
 * Public API for the roster builder feature — community data with eligibility,
 * draft roster management, and finalization.
 */

// Actions (client-callable). `getRosterBuilderCommunityData` is server-only
// and lives in `./roster-builder-service`; the board's page imports it there.
export {
  // Draft roster
  addDraftRosterMember,
  removeDraftRosterMember,
  finalizeDraftRosterMember,
  // Finalized roster
  dropFinalizedRosterMember,
  removeFinalizedRosterMember,
} from './actions'

// Types
export type {
  RosterBuilderCommunityMember,
  AssignmentStatus,
  EligibilityResult,
  VolunteerStatus,
  DraftRosterMember,
} from './types'

// Eligibility utilities
export { getRolesWithEligibilityChecks } from './eligibility'
