'use server'

import { updateTag } from 'next/cache'
import { isNil } from 'lodash'
import { authorizedAction } from '@/lib/actions/authorized-action'
import { TAGS } from '@/lib/cache/tags'
import { Permission, userHasPermission } from '@/lib/security'
import { logger } from '@/lib/logger'
import * as EventsService from '@/services/events/events-service'
import type {
  WeekendStatusValue,
  WeekendGroupWithId,
  CreateWeekendGroupInput,
  UpdateWeekendGroupInput,
} from '@/lib/weekend/types'
import type { WeekendSidebarPayload } from './types'
import * as WeekendService from './weekend-service'
import { getGroupMemberByRosterId } from '@/services/weekend-group-member/repository'
import { err, isErr } from '@/lib/results'
import { canImpersonate } from '@/lib/actions/guards'
import type { Tables } from '@/database.types'
import type { PaymentTransactionRow } from '@/services/payment/types'

// Re-export types for convenience
export type { LeadershipTeamData, LeadershipTeamMember } from './types'

/**
 * Fetches all users, for the impersonation dialog's target picker. Guarded by
 * `canImpersonate` rather than a plain FULL_ACCESS check so an admin who is
 * already impersonating someone can still switch targets.
 */
export const getAllUsers = authorizedAction<[], Array<Tables<'users'>>>(
  (user) => canImpersonate(user),
  async () => WeekendService.getAllUsers()
)

/**
 * Records a manual (cash/check) team-fee payment, bridging from weekendRosterId
 * to groupMemberId internally. The weekend leadership team
 * (`READ_WRITE_TEAM_PAYMENTS` via CHA role) and anyone who can record payments
 * in admin (`WRITE_PAYMENTS`) may do this; it mirrors the "+ Payment" button
 * on the hub team tab.
 */
export const recordManualPayment = authorizedAction<
  [string, number, 'cash' | 'check', string, string | undefined],
  PaymentTransactionRow
>(
  [Permission.READ_WRITE_TEAM_PAYMENTS, Permission.WRITE_PAYMENTS],
  async (
    _user,
    weekendRosterId,
    paymentAmount,
    paymentMethod,
    paymentOwner,
    notes
  ) => {
    const groupMemberResult = await getGroupMemberByRosterId(weekendRosterId)
    if (isErr(groupMemberResult)) {
      return err(
        `Failed to find group member for roster: ${groupMemberResult.error}`
      )
    }
    return WeekendService.recordManualPayment(
      groupMemberResult.data.id,
      paymentAmount,
      paymentMethod,
      paymentOwner,
      notes
    )
  }
)

// ============================================================================
// Protected Actions (Authorization Required)
// ============================================================================

/**
 * Drops every cached weekend read after a write to `weekends` /
 * `weekend_groups`. Activating a group changes the previously active one
 * too, so the table-wide tag always goes with the group's own.
 */
function invalidateWeekends(groupId?: string | null) {
  updateTag(TAGS.weekends)
  if (!isNil(groupId)) updateTag(TAGS.weekendGroup(groupId))
}

type GetWeekendGroupsByStatusRequest = {
  statuses?: WeekendStatusValue[]
}

/**
 * Fetches all weekend groups, optionally filtered by statuses.
 * Requires READ_WEEKENDS permission.
 */
export const getWeekendGroupsByStatus = authorizedAction<
  [GetWeekendGroupsByStatusRequest],
  WeekendGroupWithId[]
>(Permission.READ_WEEKENDS, async (_user, { statuses }) => {
  return WeekendService.getWeekendGroupsByStatus(statuses)
})

type SetActiveWeekendGroupRequest = {
  groupId: string
}

/**
 * Sets a weekend group as active.
 * Requires WRITE_WEEKENDS permission.
 */
export const setActiveWeekendGroup = authorizedAction<
  [SetActiveWeekendGroupRequest],
  WeekendGroupWithId
>(Permission.WRITE_WEEKENDS, async (_user, { groupId }) => {
  const result = await WeekendService.setActiveWeekendGroup(groupId)
  if (!isErr(result)) invalidateWeekends(groupId)
  return result
})

/**
 * Creates a new weekend group.
 * Requires WRITE_WEEKENDS permission.
 */
export const createWeekendGroup = authorizedAction<
  [CreateWeekendGroupInput],
  WeekendGroupWithId
>(Permission.WRITE_WEEKENDS, async (_user, input) => {
  const result = await WeekendService.createWeekendGroup(input)
  if (!isErr(result)) invalidateWeekends(result.data.groupId)
  return result
})

type UpdateWeekendGroupRequest = {
  groupId: string
  updates: UpdateWeekendGroupInput
}

/**
 * Updates an existing weekend group.
 * Requires WRITE_WEEKENDS permission.
 */
export const updateWeekendGroup = authorizedAction<
  [UpdateWeekendGroupRequest],
  WeekendGroupWithId
>(Permission.WRITE_WEEKENDS, async (_user, { groupId, updates }) => {
  const result = await WeekendService.updateWeekendGroup(groupId, updates)
  if (!isErr(result)) invalidateWeekends(groupId)
  return result
})

type DeleteWeekendGroupRequest = {
  groupId: string
}

/**
 * Deletes a weekend group.
 * Requires WRITE_WEEKENDS permission.
 */
export const deleteWeekendGroup = authorizedAction<
  [DeleteWeekendGroupRequest],
  { success: boolean }
>(Permission.WRITE_WEEKENDS, async (_user, { groupId }) => {
  const result = await WeekendService.deleteWeekendGroup(groupId)
  if (!isErr(result)) invalidateWeekends(groupId)
  return result
})

/**
 * Saves a weekend group from the sidebar UI.
 * Requires WRITE_WEEKENDS permission.
 */
export const saveWeekendGroupFromSidebar = authorizedAction<
  [WeekendSidebarPayload],
  WeekendGroupWithId
>(Permission.WRITE_WEEKENDS, async (user, payload) => {
  const result = await WeekendService.saveWeekendGroupFromSidebar(payload)
  if (!isErr(result)) {
    invalidateWeekends(result.data.groupId)
    // A new group starts with fees, which the sidebar sets alongside it.
    if (!isNil(payload.fees)) updateTag(TAGS.groupFees)

    // A new group starts with each weekend's standard events at their usual
    // times. Event writes need WRITE_EVENTS; without it (or if the insert
    // fails) the group still saves and the events can be added later.
    const isNewGroup = isNil(payload.groupId)
    if (isNewGroup && userHasPermission(user, [Permission.WRITE_EVENTS])) {
      const eventsResult = await EventsService.createStandardEventsForGroup(
        result.data
      )
      if (isErr(eventsResult)) {
        logger.error(
          { error: eventsResult.error, groupId: result.data.groupId },
          'Failed to create standard events for new weekend group'
        )
      } else {
        updateTag(TAGS.events)
        updateTag(TAGS.eventsForGroup(result.data.groupId))
      }
    }
  }
  return result
})

type AddUserToWeekendRosterRequest = {
  weekendId: string
  userId: string
  role: string
  rollo?: string
}

/**
 * Adds a user to a weekend roster.
 * Requires WRITE_TEAM_ROSTER permission.
 */
export const addUserToWeekendRoster = authorizedAction<
  [AddUserToWeekendRosterRequest],
  void
>(
  Permission.WRITE_TEAM_ROSTER,
  async (_user, { weekendId, userId, role, rollo }) => {
    return WeekendService.addUserToWeekendRoster(weekendId, userId, role, rollo)
  }
)

type UpdateWeekendRosterMemberRequest = {
  rosterId: string
  updates: {
    status?: string
    cha_role?: string
    rollo?: string | null
  }
}

/**
 * Updates a weekend roster member's status, role, and rollo. The member's
 * payments auto-follow their roster placement after the edit.
 * Requires WRITE_TEAM_ROSTER permission.
 */
export const updateWeekendRosterMember = authorizedAction<
  [UpdateWeekendRosterMemberRequest],
  void
>(Permission.WRITE_TEAM_ROSTER, async (_user, { rosterId, updates }) => {
  return WeekendService.updateWeekendRosterMember(rosterId, updates)
})
