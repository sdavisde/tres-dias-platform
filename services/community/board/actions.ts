import 'server-only'

import { authorizedAction } from '@/lib/actions/authorized-action'
import * as BoardService from './board-service'
import type { CommunityLeadership } from './types'

/**
 * Gets community board data.
 * Read operation - doesn't require authorizedAction since the page
 * is already protected by middleware and reading board data is safe.
 */
export const getCommunityBoardData = async () => {
  return await BoardService.getCommunityBoardData()
}

/** Board positions and committees with their holders, for any signed-in member. */
export const getCommunityLeadership = authorizedAction<[], CommunityLeadership>(
  'authenticated',
  async () => BoardService.getCommunityLeadership()
)
