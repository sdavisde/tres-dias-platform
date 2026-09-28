import 'server-only'

import * as BoardService from './board-service'

/**
 * Gets community board data.
 * Read operation - doesn't require authorizedAction since the page
 * is already protected by middleware and reading board data is safe.
 */
export const getCommunityBoardData = async () => {
  return await BoardService.getCommunityBoardData()
}
