import 'server-only'

import { isNil } from 'lodash'
import { createClient } from '@/lib/supabase/server'
import type { Result } from '@/lib/results'
import { err, ok, isErr, unwrapOr } from '@/lib/results'
import { logger } from '@/lib/logger'
import type { HydratedCandidate, PaymentRecord } from '@/lib/candidates/types'
import type { WeekendType } from '@/lib/weekend/types'
import { getPaymentsForTargets } from '@/services/payment/payment-service'
import { getTrackedGroups } from '@/services/fees/fees-service'
import { getPaymentSummary } from '@/lib/payments/utils'

/**
 * Candidate reads that return the raw rows with their sponsorship and form
 * info attached. Server-only: the pages and emails that need the full record
 * call these directly; nothing here is a public endpoint.
 */

/**
 * Gets a candidate with all related information
 */
export async function getHydratedCandidate(
  candidateId: string
): Promise<Result<string, HydratedCandidate>> {
  try {
    const supabase = await createClient()

    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select(
        `
        *,
        candidate_sponsorship_info(*),
        candidate_info(*)
      `
      )
      .eq('id', candidateId)
      .single()

    if (!isNil(candidateError) || isNil(candidate)) {
      return err(
        `Failed to get candidate with details: ${candidateError?.message ?? 'No data returned'}`
      )
    }

    const hydratedCandidate: HydratedCandidate = {
      ...candidate,
      candidate_sponsorship_info: candidate.candidate_sponsorship_info.at(0),
      candidate_info: candidate.candidate_info.at(0),
    } as HydratedCandidate

    return ok(hydratedCandidate)
  } catch (error) {
    return err(
      `Error while getting candidate with details: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

export type CandidateFilterOptions = {
  weekendGroupId?: string
  weekendType?: WeekendType
}

/**
 * Gets all candidates with their related information.
 * Payments are fetched from the payment_transaction table.
 */
export async function getAllCandidatesWithDetails(
  options: CandidateFilterOptions = {}
): Promise<Result<string, Array<HydratedCandidate>>> {
  try {
    const supabase = await createClient()

    // Determine if we need to filter by weekend (requires inner join)
    const needsWeekendFilter =
      !isNil(options.weekendGroupId) || !isNil(options.weekendType)
    const weekendJoinType = needsWeekendFilter ? '!inner' : ''

    // Query candidates (payments are fetched separately from payment_transaction)
    let query = supabase.from('candidates').select(`
        *,
        candidate_sponsorship_info(*),
        candidate_info(*),
        weekends${weekendJoinType} (
          id,
          title,
          group_id,
          type
        )
      `)

    if (!isNil(options.weekendGroupId)) {
      query = query.eq('weekends.group_id', options.weekendGroupId)
    }

    if (!isNil(options.weekendType)) {
      query = query.eq('weekends.type', options.weekendType)
    }

    const { data: candidates, error: candidatesError } = await query

    if (!isNil(candidatesError) || isNil(candidates)) {
      return err(
        `Failed to get candidates with details: ${candidatesError?.message ?? 'No data returned'}`
      )
    }

    // Fetch every candidate's payments (one query) and the tracked groups'
    // fees in parallel
    const [paymentsResult, trackedGroupsResult] = await Promise.all([
      getPaymentsForTargets(
        'candidate',
        candidates.map((candidate) => candidate.id)
      ),
      getTrackedGroups(),
    ])

    // Each candidate is priced from their own group. A fee we can't read is
    // not a fee of $0 — log it and show "Not owed" rather than guess.
    if (isErr(trackedGroupsResult)) {
      logger.error({
        error: trackedGroupsResult.error,
        msg: 'Group fee lookup failed; candidate payment summaries show no fee',
      })
    }
    const candidateFeeByGroup = new Map(
      unwrapOr(trackedGroupsResult, []).map((g) => [
        g.groupId,
        g.fees.candidateFee,
      ])
    )

    // Candidate ID to payments; a failed read leaves every list empty, as a
    // failed per-candidate read did.
    const paymentsMap: Map<string, PaymentRecord[]> = unwrapOr(
      paymentsResult,
      new Map<string, PaymentRecord[]>()
    )

    return ok(
      candidates.map((candidate) => {
        const payments = paymentsMap.get(candidate.id) ?? []
        return {
          ...candidate,
          candidate_sponsorship_info:
            candidate.candidate_sponsorship_info.at(0),
          candidate_info: candidate.candidate_info.at(0),
          payments,
          paymentSummary: getPaymentSummary(
            payments,
            candidateFeeByGroup.get(candidate.weekends?.group_id ?? '') ?? null
          ),
        }
      }) as HydratedCandidate[]
    )
  } catch (error) {
    return err(
      `Error while getting candidates with details: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
