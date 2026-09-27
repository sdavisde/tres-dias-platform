import 'server-only'

import { isNil } from 'lodash'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import type { Result } from '@/lib/results'
import { err, isErr, ok } from '@/lib/results'
import { logger } from '@/lib/logger'
import { calculateAge } from '@/lib/utils'
import type { CandidateFormData, CandidateStatus } from '@/lib/candidates/types'
import {
  CANDIDATE_FORMS_OPEN_STATUSES,
  candidateFormsSchema,
  type CandidateFormsValues,
} from '@/lib/candidates/candidate-forms-schema'
import { sendCandidateFormsCompletedEmail } from '@/services/notifications/notification-service'

/**
 * The public candidate-forms flow. The candidate is not logged in, so these run
 * on the admin client behind explicit validation: the link carries an
 * unguessable UUID, the status must still allow forms, and exactly one
 * `candidate_info` row may exist per candidate (unique index).
 *
 * Nothing from `candidate_info` is ever returned to the browser from here.
 */

export type CandidateFormsContext = {
  candidateName: string | null
  sponsorName: string | null
  status: CandidateStatus
  /** A `candidate_info` row already exists for this candidate. */
  formsSubmitted: boolean
}

export const CANDIDATE_FORMS_ALREADY_SUBMITTED =
  'These forms have already been submitted.'

const candidateIdSchema = z.uuid()

function isFormsOpen(status: CandidateStatus): boolean {
  return (CANDIDATE_FORMS_OPEN_STATUSES as readonly string[]).includes(status)
}

/** Whether the page should render the form for this context. */
export function canFillCandidateForms(context: CandidateFormsContext): boolean {
  return isFormsOpen(context.status) && !context.formsSubmitted
}

/**
 * What the forms page needs to greet the candidate and decide whether to show
 * the form. Returns an error for an invalid or unknown id.
 */
export async function getCandidateFormsContext(
  candidateId: string
): Promise<Result<string, CandidateFormsContext>> {
  const parsedId = candidateIdSchema.safeParse(candidateId)
  if (!parsedId.success) {
    return err('Invalid candidate id')
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('candidates')
      .select(
        'id, status, candidate_sponsorship_info(candidate_name, sponsor_name), candidate_info(id)'
      )
      .eq('id', parsedId.data)
      .maybeSingle()

    if (!isNil(error)) {
      return err(`Failed to load candidate: ${error.message}`)
    }
    if (isNil(data)) {
      return err('Candidate not found')
    }

    const sponsorship = data.candidate_sponsorship_info.at(0)
    return ok({
      candidateName: sponsorship?.candidate_name ?? null,
      sponsorName: sponsorship?.sponsor_name ?? null,
      status: data.status as CandidateStatus,
      formsSubmitted: data.candidate_info.length > 0,
    })
  } catch (error) {
    return err(
      `Error while loading candidate: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/** Maps the form's values to the `candidate_info` columns. */
function toCandidateInfo(values: CandidateFormsValues): CandidateFormData {
  return {
    address_line_1: values.addressLine1,
    address_line_2: values.addressLine2 ?? null,
    city: values.city,
    state: values.state,
    zip: values.zip,
    phone: values.phone,
    first_name: values.firstName,
    last_name: values.lastName,
    email: values.email,
    date_of_birth: values.dateOfBirth,
    shirt_size: values.shirtSize,
    marital_status: values.maritalStatus ?? null,
    has_spouse_attended_weekend: values.hasSpouseAttendedWeekend ?? null,
    spouse_weekend_location: values.spouseWeekendLocation ?? null,
    spouse_name: values.spouseName ?? null,
    has_friends_attending_weekend: values.hasFriendsAttendingWeekend ?? null,
    is_christian: values.isChristian ?? null,
    church: values.church ?? null,
    member_of_clergy: values.memberOfClergy ?? null,
    reason_for_attending: values.reasonForAttending ?? null,
    emergency_contact_name: values.emergencyContactName,
    emergency_contact_phone: values.emergencyContactPhone,
    medical_conditions: values.medicalConditions ?? null,
    camp_waiver_signed_at: new Date().toISOString(),
    age: calculateAge(values.dateOfBirth),
  }
}

/**
 * Records a candidate's completed forms and moves them to `pending_approval`.
 *
 * Order matters: the info row is inserted first (the unique index rejects a
 * second submission), then the status flips only if the candidate is still in
 * a forms-open state. If that conditional update touches no row, the insert is
 * undone so a candidate never carries forms without the matching status.
 */
export async function submitCandidateForms(
  candidateId: string,
  values: unknown
): Promise<Result<string, true>> {
  const parsedId = candidateIdSchema.safeParse(candidateId)
  if (!parsedId.success) {
    return err('Invalid candidate id')
  }

  const parsedValues = candidateFormsSchema.safeParse(values)
  if (!parsedValues.success) {
    const first = parsedValues.error.issues.at(0)
    return err(
      `Please check the form: ${first?.message ?? 'some fields are invalid'}`
    )
  }

  const id = parsedId.data

  try {
    const supabase = createAdminClient()

    const { data: inserted, error: insertError } = await supabase
      .from('candidate_info')
      .insert({ candidate_id: id, ...toCandidateInfo(parsedValues.data) })
      .select('id')
      .single()

    if (!isNil(insertError) || isNil(inserted)) {
      // 23505 = unique_violation: a candidate_info row already exists.
      if (insertError?.code === '23505') {
        return err(CANDIDATE_FORMS_ALREADY_SUBMITTED)
      }
      return err(
        `Failed to save candidate forms: ${insertError?.message ?? 'no row returned'}`
      )
    }

    const { data: updated, error: statusError } = await supabase
      .from('candidates')
      .update({ status: 'pending_approval' })
      .eq('id', id)
      .in('status', [...CANDIDATE_FORMS_OPEN_STATUSES])
      .select('id')

    if (!isNil(statusError) || isNil(updated) || updated.length === 0) {
      await supabase.from('candidate_info').delete().eq('id', inserted.id)
      if (!isNil(statusError)) {
        return err(`Failed to update candidate status: ${statusError.message}`)
      }
      return err('This candidate is no longer accepting forms.')
    }

    // Notify the pre-weekend couple; a failed email must not fail the submission.
    const emailResult = await sendCandidateFormsCompletedEmail(id)
    if (isErr(emailResult)) {
      logger.error(
        `Failed to send forms completed email for candidate ${id}: ${emailResult.error}`
      )
    }

    return ok(true)
  } catch (error) {
    return err(
      `Error while submitting candidate forms: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
