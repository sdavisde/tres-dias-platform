import 'server-only'

import { isNil } from 'lodash'
import type { HydratedCandidate } from '@/lib/candidates/types'
import { reviewQueuePath } from '@/lib/candidates/review'
import { isErr } from '@/lib/results'
import { getUrl } from '@/lib/url'
import type { ReadOptions } from '@/lib/supabase/server'
import * as WeekendService from '@/services/weekend/weekend-service'

/**
 * The absolute link an email uses to open a candidate in the review queue:
 * the candidate's weekend decides which hub the queue lives under. Falls back
 * to the weekends index when the weekend can't be resolved, so a notification
 * still lands somewhere useful.
 */
export async function getCandidateReviewUrl(
  candidate: Pick<HydratedCandidate, 'id' | 'weekend_id'>,
  options?: ReadOptions
): Promise<string> {
  if (isNil(candidate.weekend_id)) return getUrl('/weekends')

  const weekendResult = await WeekendService.getWeekendById(
    candidate.weekend_id,
    options
  )
  if (isErr(weekendResult) || isNil(weekendResult.data.groupId)) {
    return getUrl('/weekends')
  }

  const { groupId, type } = weekendResult.data
  return getUrl(reviewQueuePath(groupId, type, candidate.id))
}
