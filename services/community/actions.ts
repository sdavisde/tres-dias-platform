'use server'

import { authorizedAction } from '@/lib/actions/authorized-action'
import * as CommunityService from './community-service'
import { Permission } from '@/lib/security'
import type { CommunityEncouragement } from './types'

type UpdateCommunityEncouragementRequest = {
  messageId: string
  message: string
}

/**
 * Updates the community encouragement with the string provided
 * @returns the newly updated community encouragement data.
 */
export const updateCommunityEncouragement = authorizedAction<
  [UpdateCommunityEncouragementRequest],
  CommunityEncouragement | null
>(
  Permission.WRITE_COMMUNITY_ENCOURAGEMENT,
  async (_user, { messageId, message }) => {
    return await CommunityService.updateCommunityEncouragement(
      messageId,
      message
    )
  }
)
