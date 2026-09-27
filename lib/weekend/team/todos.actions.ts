import 'server-only'

import { isNil } from 'lodash'
import { isErr } from '@/lib/results'
import { getLoggedInUser } from '@/services/identity/user'
import { teamTodoItems } from './todos.config'
import {
  getTodoUrl,
  getCompletionState,
  areAllTodosComplete,
} from './todos.helpers'
import type { TeamMemberUser } from '@/lib/users/types'

export type TeamTodoData = {
  urls: Record<string, string | null>
  completionState: Record<string, boolean>
  allComplete: boolean
  items: typeof teamTodoItems
  groupMemberId: string
}

/**
 * Fetches and prepares team TODO data for the signed-in member's active
 * weekend. Returns null when the viewer is not on a team, or has no group
 * membership to key the todos on.
 * Uses groupMemberId (not weekendId) as the storage key since todos are group-scoped.
 */
export async function getTeamTodoData(): Promise<TeamTodoData | null> {
  const userResult = await getLoggedInUser()
  if (isErr(userResult)) {
    return null
  }

  const sessionUser = userResult.data
  if (isNil(sessionUser.teamMemberInfo)) {
    return null
  }

  const user: TeamMemberUser = {
    ...sessionUser,
    teamMemberInfo: sessionUser.teamMemberInfo,
  }
  const { groupMemberId } = user.teamMemberInfo

  if (isNil(groupMemberId)) {
    return null
  }

  const context = { user }

  const urls: Record<string, string | null> = {}
  for (const item of teamTodoItems) {
    urls[item.id] = getTodoUrl(item, context)
  }

  const completionState = await getCompletionState(teamTodoItems, context)
  const allComplete = areAllTodosComplete(teamTodoItems, completionState)

  return {
    urls,
    completionState,
    allComplete,
    items: teamTodoItems,
    groupMemberId,
  }
}
