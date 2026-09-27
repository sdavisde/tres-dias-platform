'use server'

import * as RosterBuilderService from './roster-builder-service'
import type { Result } from '@/lib/results'

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
 * Adds a community member to the draft roster for a weekend.
 */
export async function addDraftRosterMember(
  weekendId: string,
  userId: string,
  chaRole: string,
  createdBy: string,
  rollo?: string
): Promise<Result<string, string>> {
  return RosterBuilderService.addDraftRosterMember(
    weekendId,
    userId,
    chaRole,
    createdBy,
    rollo
  )
}

/**
 * Removes a draft roster entry.
 */
export async function removeDraftRosterMember(
  draftId: string
): Promise<Result<string, void>> {
  return RosterBuilderService.removeDraftRosterMember(draftId)
}

/**
 * Finalizes a draft roster entry: creates weekend_roster + weekend_group_members
 * rows and archives the draft.
 */
export async function finalizeDraftRosterMember(
  draftId: string
): Promise<Result<string, string>> {
  return RosterBuilderService.finalizeDraftRosterMember(draftId)
}

// ============================================================================
// Finalized Roster Management
// ============================================================================

/**
 * Drops a finalized roster member (sets status to 'drop').
 * The member returns to the community pool.
 */
export async function dropFinalizedRosterMember(
  rosterId: string
): Promise<Result<string, void>> {
  return RosterBuilderService.dropFinalizedRosterMember(rosterId)
}

/**
 * Removes a finalized roster member entirely (hard delete).
 * The member returns to the community pool.
 */
export async function removeFinalizedRosterMember(
  rosterId: string
): Promise<Result<string, void>> {
  return RosterBuilderService.removeFinalizedRosterMember(rosterId)
}
