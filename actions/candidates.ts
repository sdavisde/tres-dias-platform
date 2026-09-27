'use server'

import { createClient } from '@/lib/supabase/server'
import type { Result } from '@/lib/results'
import { err, ok, isErr } from '@/lib/results'
import { isNil } from 'lodash'
import { logger } from '@/lib/logger'
import {
  sponsorFormSchema,
  type SponsorFormSchema,
} from '@/lib/candidates/sponsor-form-schema'
import type { CandidateStatus, HydratedCandidate } from '@/lib/candidates/types'
import { authorizedAction } from '@/lib/actions/authorized-action'
import { Permission } from '@/lib/security'
import * as CandidateForms from '@/services/candidates/candidate-forms'
import { WeekendStatus, WEEKEND_CANDIDATE_CAPACITY } from '@/lib/weekend/types'
import { formatWeekendLabelFor } from '@/lib/weekend'
import type { Database } from '@/database.types'
import { getCandidateCountByWeekend } from '@/services/candidates/candidate-service'
import { movePaymentsToWeekend } from '@/services/payment/payment-service'

type CandidateSponsorshipInfoUpdate =
  Database['public']['Tables']['candidate_sponsorship_info']['Update']
type CandidateInfoUpdate =
  Database['public']['Tables']['candidate_info']['Update']

/**
 * Create a new candidate with sponsorship information. Any signed-in member may
 * sponsor a candidate (the sponsor form lives on the member site). The payload
 * is re-parsed here so only the sponsor-form columns reach the table, the
 * status is fixed to `sponsored`, and the sponsor email is the session's.
 */
export const createCandidateWithSponsorshipInfo = authorizedAction<
  [SponsorFormSchema],
  HydratedCandidate
>(
  'authenticated',
  async (user, data): Promise<Result<string, HydratedCandidate>> => {
    const parsed = sponsorFormSchema.safeParse(data)
    if (!parsed.success) {
      const first = parsed.error.issues.at(0)
      return err(
        `Please check the form: ${first?.message ?? 'some fields are invalid'}`
      )
    }

    try {
      const supabase = await createClient()

      const { weekend_id, ...sponsorshipInfo } = parsed.data

      const { data: candidate, error: candidateError } = await supabase
        .from('candidates')
        .insert({ status: 'sponsored', weekend_id })
        .select()
        .single()

      if (!isNil(candidateError) || isNil(candidate)) {
        logger.error(
          { error: candidateError?.message },
          'Failed to create candidate'
        )
        return err('Failed to create candidate')
      }

      const { error: sponsorshipInfoError } = await supabase
        .from('candidate_sponsorship_info')
        .insert({
          candidate_id: candidate.id,
          ...sponsorshipInfo,
          sponsor_email: user.email,
        })

      if (!isNil(sponsorshipInfoError)) {
        logger.error(
          { error: sponsorshipInfoError.message, candidateId: candidate.id },
          'Failed to create sponsorship info'
        )
        return err('Failed to create sponsorship info')
      }

      return ok(candidate as HydratedCandidate)
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Error while creating candidate with sponsorship info'
      )
      return err('Failed to create candidate')
    }
  }
)

/**
 * Moves a candidate to a new status (reject, mark forms as sent, ...).
 * Requires WRITE_CANDIDATES permission.
 */
export const updateCandidateStatus = authorizedAction<
  [{ candidateId: string; status: CandidateStatus }],
  { success: boolean }
>(Permission.WRITE_CANDIDATES, async (_user, { candidateId, status }) => {
  try {
    const supabase = await createClient()

    const { error: updateError } = await supabase
      .from('candidates')
      .update({ status })
      .eq('id', candidateId)

    if (!isNil(updateError)) {
      return err(`Failed to update candidate status: ${updateError.message}`)
    }

    return ok({ success: true })
  } catch (error) {
    return err(
      `Error while updating candidate status: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
})

// publicAction: the candidate filling in their forms is not logged in; the link
// carries an unguessable candidate UUID. The service validates the id and the
// payload, writes through the admin client, and only flips the status while the
// candidate is still in a forms-open state (Unit 5 of
// docs/specs/19-spec-security-remediation).
/**
 * Records a candidate's completed registration forms and moves them to
 * `pending_approval`. Replaces `addCandidateInfo`.
 */
export async function submitCandidateForms(
  candidateId: string,
  values: unknown
): Promise<Result<string, true>> {
  return await CandidateForms.submitCandidateForms(candidateId, values)
}

/**
 * Update the payment owner for a candidate. Mirrors the review page's `canEdit`
 * (WRITE_CANDIDATES) gate, since the payer is edited as part of approval.
 */
export const updateCandidatePaymentOwner = authorizedAction<
  [string, string],
  { success: boolean }
>(Permission.WRITE_CANDIDATES, async (_user, candidateId, paymentOwner) => {
  try {
    const supabase = await createClient()

    const { error: updateError } = await supabase
      .from('candidate_sponsorship_info')
      .update({ payment_owner: paymentOwner })
      .eq('candidate_id', candidateId)

    if (!isNil(updateError)) {
      return err(`Failed to update payment owner: ${updateError.message}`)
    }

    return ok({ success: true })
  } catch (error) {
    return err(
      `Error while updating payment owner: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
})

/**
 * Update a single field in the candidate_sponsorship_info table
 * Requires WRITE_CANDIDATES permission
 */
export const updateCandidateSponsorshipField = authorizedAction<
  [
    {
      candidateId: string
      field: keyof CandidateSponsorshipInfoUpdate
      value: string | null
    },
  ],
  { success: boolean }
>(Permission.WRITE_CANDIDATES, async (_user, { candidateId, field, value }) => {
  try {
    const supabase = await createClient()

    const { error: updateError } = await supabase
      .from('candidate_sponsorship_info')
      .update({ [field]: value } as CandidateSponsorshipInfoUpdate)
      .eq('candidate_id', candidateId)

    if (!isNil(updateError)) {
      return err(`Failed to update ${field}: ${updateError.message}`)
    }

    return ok({ success: true })
  } catch (error) {
    return err(
      `Error while updating ${field}: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
})

/**
 * Update a single field in the candidate_info table
 * Requires WRITE_CANDIDATES permission
 */
export const updateCandidateInfoField = authorizedAction<
  [
    {
      candidateId: string
      field: keyof CandidateInfoUpdate
      value: string | number | boolean | null
    },
  ],
  { success: boolean }
>(Permission.WRITE_CANDIDATES, async (_user, { candidateId, field, value }) => {
  try {
    const supabase = await createClient()

    const { error: updateError } = await supabase
      .from('candidate_info')
      .update({ [field]: value } as CandidateInfoUpdate)
      .eq('candidate_id', candidateId)

    if (!isNil(updateError)) {
      return err(`Failed to update ${field}: ${updateError.message}`)
    }

    return ok({ success: true })
  } catch (error) {
    return err(
      `Error while updating ${field}: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
})

/**
 * Update the candidate status field
 * Requires WRITE_CANDIDATES permission
 */
export const updateCandidateStatusField = authorizedAction<
  [{ candidateId: string; status: CandidateStatus }],
  { success: boolean }
>(Permission.WRITE_CANDIDATES, async (_user, { candidateId, status }) => {
  try {
    const supabase = await createClient()

    const { error: updateError } = await supabase
      .from('candidates')
      .update({ status })
      .eq('id', candidateId)

    if (!isNil(updateError)) {
      return err(`Failed to update status: ${updateError.message}`)
    }

    return ok({ success: true })
  } catch (error) {
    return err(
      `Error while updating status: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
})

/**
 * A weekend a candidate can be moved to, with a live capacity hint.
 */
export interface MoveWeekendOption {
  weekendId: string
  label: string
  count: number
  capacity: number
  isFull: boolean
}

/**
 * Gets the weekends a candidate can be moved to.
 * Only weekends of the same gender (type) that are not finished are eligible,
 * and the candidate's current weekend is excluded. Each option includes a live
 * candidate count so callers can show a capacity hint.
 */
export const getMoveWeekendOptions = authorizedAction<
  [string],
  MoveWeekendOption[]
>(Permission.WRITE_CANDIDATES, async (_user, candidateId) => {
  try {
    const supabase = await createClient()

    // Load the candidate's current weekend to determine gender and exclude it
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('weekend_id')
      .eq('id', candidateId)
      .single()

    if (!isNil(candidateError) || isNil(candidate)) {
      return err(
        `Failed to load candidate: ${candidateError?.message ?? 'No data returned'}`
      )
    }

    if (isNil(candidate.weekend_id)) {
      return err('Candidate is not assigned to a weekend')
    }

    const { data: currentWeekend, error: currentWeekendError } = await supabase
      .from('weekends')
      .select('id, type')
      .eq('id', candidate.weekend_id)
      .single()

    if (!isNil(currentWeekendError) || isNil(currentWeekend)) {
      return err(
        `Failed to load current weekend: ${currentWeekendError?.message ?? 'No data returned'}`
      )
    }

    // Eligible targets: same gender, not finished, excluding the current weekend
    const { data: weekends, error: weekendsError } = await supabase
      .from('weekends')
      .select('id, type, title, start_date, weekend_groups(number)')
      .eq('type', currentWeekend.type)
      .neq('id', currentWeekend.id)
      .in('status', [WeekendStatus.PLANNING, WeekendStatus.ACTIVE])
      .order('start_date', { ascending: true })

    if (!isNil(weekendsError) || isNil(weekends)) {
      return err(
        `Failed to load weekends: ${weekendsError?.message ?? 'No data returned'}`
      )
    }

    const options = await Promise.all(
      weekends.map(async (weekend) => {
        const countResult = await getCandidateCountByWeekend(weekend.id)
        const count = isErr(countResult) ? 0 : countResult.data
        return {
          weekendId: weekend.id,
          label: formatWeekendLabelFor({
            number: weekend.weekend_groups?.number,
            gender: weekend.type,
          }),
          count,
          capacity: WEEKEND_CANDIDATE_CAPACITY,
          isFull: count >= WEEKEND_CANDIDATE_CAPACITY,
        }
      })
    )

    return ok(options)
  } catch (error) {
    return err(
      `Error while loading move weekend options: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
})

/**
 * Moves a candidate to a different weekend.
 * The candidate's forms (candidate_info) and sponsorship info travel
 * automatically via candidate_id; their payments are reassigned to the new
 * weekend so financials follow them. Requires WRITE_CANDIDATES permission.
 */
export const moveCandidateToWeekend = authorizedAction<
  [{ candidateId: string; targetWeekendId: string }],
  { success: boolean }
>(
  Permission.WRITE_CANDIDATES,
  async (_user, { candidateId, targetWeekendId }) => {
    try {
      const supabase = await createClient()

      const { error: updateError } = await supabase
        .from('candidates')
        .update({ weekend_id: targetWeekendId })
        .eq('id', candidateId)

      if (!isNil(updateError)) {
        return err(`Failed to move candidate: ${updateError.message}`)
      }

      // Reassign the candidate's payments to the new weekend. This runs with
      // RLS bypassed because it is a system-level consequence of the candidate
      // move authorized above, not a user-initiated payment edit — payment
      // writes now require WRITE_PAYMENTS, which a WRITE_CANDIDATES holder need
      // not have. Without the bypass the update would match zero rows and
      // report success, leaving the payments on the old weekend.
      const paymentsResult = await movePaymentsToWeekend(
        'candidate',
        candidateId,
        targetWeekendId,
        { dangerouslyBypassRLS: true }
      )

      if (isErr(paymentsResult)) {
        return err(`Failed to move candidate payments: ${paymentsResult.error}`)
      }

      return ok({ success: true })
    } catch (error) {
      return err(
        `Error while moving candidate: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
)
