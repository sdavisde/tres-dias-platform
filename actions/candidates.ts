'use server'

import { createClient } from '@/lib/supabase/server'
import type { Result } from '@/lib/results'
import { err, ok, isErr } from '@/lib/results'
import { isNil } from 'lodash'
import type { SponsorFormSchema } from '@/app/(member)/sponsor/SponsorForm'
import type {
  CandidateStatus,
  HydratedCandidate,
  CandidateFormData,
} from '@/lib/candidates/types'
import { authorizedAction } from '@/lib/actions/authorized-action'
import { Permission } from '@/lib/security'
import { sendCandidateFormsCompletedEmail } from '@/services/notifications/notification-service'
import { logger } from '@/lib/logger'
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
 * sponsor a candidate (the sponsor form lives on the member site).
 */
export const createCandidateWithSponsorshipInfo = authorizedAction<
  [SponsorFormSchema],
  HydratedCandidate
>(
  'authenticated',
  async (_user, data): Promise<Result<string, HydratedCandidate>> => {
    try {
      const supabase = await createClient()

      const { weekend_id, ...sponsorshipInfo } = data

      // Upsert the candidate record
      const { data: candidate, error: candidateError } = await supabase
        .from('candidates')
        .insert({ status: 'sponsored', weekend_id })
        .select()
        .single()

      if (!isNil(candidateError) || isNil(candidate)) {
        return err(
          `Failed to create candidate: ${candidateError?.message ?? 'No data returned'}`
        )
      }

      // Create the sponsorship info record
      const { error: sponsorshipInfoError } = await supabase
        .from('candidate_sponsorship_info')
        .insert({
          candidate_id: candidate.id,
          ...sponsorshipInfo,
        })

      if (!isNil(sponsorshipInfoError)) {
        return err(
          `Failed to create sponsorship info: ${sponsorshipInfoError.message}`
        )
      }

      return ok(candidate as HydratedCandidate)
    } catch (error) {
      return err(
        `Error while creating candidate with sponsorship info: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
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
// carries an unguessable candidate UUID. Hardened (status check, admin client,
// unique candidate_info row) in Unit 5 of docs/specs/19-spec-security-remediation.
/**
 * Add Candidate Info when a user submits their candidate forms
 * Also updates the candidate status to 'pending_approval'
 */
export async function addCandidateInfo(
  candidateId: string,
  data: CandidateFormData
): Promise<Result<string, true>> {
  try {
    const supabase = await createClient()

    const { error: candidateInfoError } = await supabase
      .from('candidate_info')
      .insert({
        candidate_id: candidateId,
        ...data,
      })

    if (!isNil(candidateInfoError)) {
      return err(`Failed to add candidate info: ${candidateInfoError.message}`)
    }

    // Update candidate status to pending_approval after forms are completed
    const { error: statusError } = await supabase
      .from('candidates')
      .update({ status: 'pending_approval' })
      .eq('id', candidateId)

    if (!isNil(statusError)) {
      return err(`Failed to update candidate status: ${statusError.message}`)
    }

    // Send email notification to pre-weekend couple (don't fail if email fails)
    const emailResult = await sendCandidateFormsCompletedEmail(candidateId)
    if (isErr(emailResult)) {
      logger.error(
        `Failed to send forms completed email for candidate ${candidateId}: ${emailResult.error}`
      )
    }

    return ok(true)
  } catch (error) {
    return err(
      `Error while adding candidate info: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
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
