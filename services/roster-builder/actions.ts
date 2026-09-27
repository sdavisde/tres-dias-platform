'use server'

import * as RosterBuilderService from './roster-builder-service'
import { authorizedAction } from '@/lib/actions/authorized-action'
import { Permission } from '@/lib/security'

// Re-export types for convenience
export type {
  RosterBuilderCommunityMember,
  AssignmentStatus,
  EligibilityResult,
  DraftRosterMember,
} from './types'

// ============================================================================
// Draft Roster Management
// ============================================================================

/**
 * Every mutation below requires WRITE_TEAM_ROSTER: the Rector (via CHA role on
 * the active weekend) and the Leaders Committee hold it, matching who can open
 * the roster builder. The page's READ_TEAM_ROSTER_BUILDER check only gates
 * rendering; these actions gate the writes themselves.
 */

/**
 * Adds a community member to the draft roster for a weekend. The draft row is
 * attributed to the session user, never to an id the client supplies.
 */
export const addDraftRosterMember = authorizedAction<
  [string, string, string, string | undefined],
  string
>(
  Permission.WRITE_TEAM_ROSTER,
  async (user, weekendId, userId, chaRole, rollo) =>
    RosterBuilderService.addDraftRosterMember(
      weekendId,
      userId,
      chaRole,
      user.id,
      rollo
    )
)

/**
 * Removes a draft roster entry.
 */
export const removeDraftRosterMember = authorizedAction<[string], void>(
  Permission.WRITE_TEAM_ROSTER,
  async (_user, draftId) =>
    RosterBuilderService.removeDraftRosterMember(draftId)
)

/**
 * Finalizes a draft roster entry: creates weekend_roster + weekend_group_members
 * rows and archives the draft.
 */
export const finalizeDraftRosterMember = authorizedAction<[string], string>(
  Permission.WRITE_TEAM_ROSTER,
  async (_user, draftId) =>
    RosterBuilderService.finalizeDraftRosterMember(draftId)
)

// ============================================================================
// Finalized Roster Management
// ============================================================================

/**
 * Drops a finalized roster member (sets status to 'drop').
 * The member returns to the community pool.
 */
export const dropFinalizedRosterMember = authorizedAction<[string], void>(
  Permission.WRITE_TEAM_ROSTER,
  async (_user, rosterId) =>
    RosterBuilderService.dropFinalizedRosterMember(rosterId)
)

/**
 * Removes a finalized roster member entirely (hard delete).
 * The member returns to the community pool.
 */
export const removeFinalizedRosterMember = authorizedAction<[string], void>(
  Permission.WRITE_TEAM_ROSTER,
  async (_user, rosterId) =>
    RosterBuilderService.removeFinalizedRosterMember(rosterId)
)
