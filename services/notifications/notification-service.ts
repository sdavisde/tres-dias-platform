import 'server-only'

import { isNil } from 'lodash'
import { endOfMonth, startOfMonth } from 'date-fns'
import type { CreateEmailResponseSuccess } from 'resend'
import { createAdminClient } from '@/lib/supabase/server'
import { formatWeekendLabelFor } from '@/lib/weekend'
import type { Result } from '@/lib/results'
import { err, isErr, ok } from '@/lib/results'
import { logger } from '@/lib/logger'
import {
  getSystemEmailFrom,
  isNotificationEnabled,
} from '@/services/settings/settings-service'
import { NOTIFY_PAYMENT_RECEIPTS_KEY } from '@/services/settings/site-settings'
import { sendEmail } from './email-client'
import * as NotificationRepository from './repository'
// TODO: This should use the candidates service public API instead of direct repository access
import * as CandidateRepository from '@/services/candidates/repository'
import type { ContactInfo, NotificationRecipient } from './types'
import type { HydratedCandidate } from '@/lib/candidates/types'
import CandidatePaymentCompletedEmail from '@/components/email/CandidatePaymentCompletedEmail'
import CandidateFormsCompletedEmail from '@/components/email/CandidateFormsCompletedEmail'
import TeamPaymentNotificationEmail from '@/components/email/TeamPaymentNotificationEmail'
import { getCandidateReviewUrl } from './review-links'

/**
 * Gets contact information by ID and transforms to DTO.
 */
export async function getContactInformation(
  contactId: string
): Promise<Result<string, ContactInfo>> {
  const result = await NotificationRepository.getContactInformation(contactId)

  if (isErr(result)) {
    return result
  }

  const data = result.data

  return ok({
    id: data.id,
    label: data.label ?? contactId,
    emailAddress: data.email_address ?? '',
  })
}

/**
 * Gets contact information for a notification recipient.
 */
export async function getRecipientContactInfo(
  recipient: NotificationRecipient
): Promise<Result<string, ContactInfo>> {
  const result = await NotificationRepository.getContactInformation(recipient)

  if (isErr(result)) {
    return result
  }

  const data = result.data

  if (isNil(data.email_address)) {
    return err(`Email address not found for recipient: ${recipient}`)
  }

  return ok({
    id: data.id,
    label: data.label ?? recipient,
    emailAddress: data.email_address,
  })
}

/**
 * Gets the pre-weekend couple's email address.
 */
export async function getPreWeekendCoupleEmail(): Promise<
  Result<string, string>
> {
  const result = await getRecipientContactInfo('preweekend-couple')

  if (isErr(result)) {
    return result
  }

  return ok(result.data.emailAddress)
}

/**
 * Gets the pre-weekend couple's email address using admin client.
 * For use in webhook contexts where there is no user session.
 */
export async function getPreWeekendCoupleEmailAdmin(): Promise<
  Result<string, string>
> {
  const result =
    await NotificationRepository.getContactInformationAdmin('preweekend-couple')

  if (isErr(result)) {
    return result
  }

  const data = result.data

  if (isNil(data.email_address)) {
    return err('Email address not found for preweekend-couple')
  }

  return ok(data.email_address)
}

/**
 * Notifies the pre-weekend couple when a candidate payment is received.
 * Uses the regular client (requires user session).
 */
export async function notifyCandidatePaymentReceived(
  candidateId: string,
  paymentAmount: number,
  paymentMethod: 'card' | 'cash' | 'check'
): Promise<Result<string, true>> {
  const candidateResult =
    await CandidateRepository.getCandidateById(candidateId)
  if (isErr(candidateResult)) {
    return err(`Failed to fetch candidate: ${candidateResult.error}`)
  }

  const preWeekendEmailResult = await getPreWeekendCoupleEmail()
  if (isErr(preWeekendEmailResult)) {
    return err(preWeekendEmailResult.error)
  }

  return sendCandidatePaymentEmail(
    candidateResult.data,
    preWeekendEmailResult.data,
    paymentAmount,
    paymentMethod
  )
}

/**
 * Notifies the pre-weekend couple when a candidate payment is received.
 * Uses admin client for webhook contexts where there is no user session.
 */
export async function notifyCandidatePaymentReceivedAdmin(
  candidateId: string,
  paymentAmount: number,
  paymentMethod: 'card' | 'cash' | 'check'
): Promise<Result<string, true>> {
  const candidateResult =
    await CandidateRepository.getCandidateByIdAdmin(candidateId)
  if (isErr(candidateResult)) {
    return err(`Failed to fetch candidate: ${candidateResult.error}`)
  }

  const preWeekendEmailResult = await getPreWeekendCoupleEmailAdmin()
  if (isErr(preWeekendEmailResult)) {
    return err(preWeekendEmailResult.error)
  }

  return sendCandidatePaymentEmail(
    candidateResult.data,
    preWeekendEmailResult.data,
    paymentAmount,
    paymentMethod
  )
}

/**
 * Internal helper to send candidate payment email.
 */
async function sendCandidatePaymentEmail(
  rawCandidate: NonNullable<
    Awaited<ReturnType<typeof CandidateRepository.getCandidateById>>['data']
  >,
  recipientEmail: string,
  paymentAmount: number,
  paymentMethod: 'card' | 'cash' | 'check'
): Promise<Result<string, true>> {
  if (!(await isNotificationEnabled(NOTIFY_PAYMENT_RECEIPTS_KEY))) {
    logger.info(
      `Skipped candidate payment notification for candidate ${rawCandidate.id}: payment receipts & reminders are switched off in site settings`
    )
    return ok(true)
  }

  const candidateInfo = rawCandidate.candidate_info?.at(0)
  const sponsorshipInfo = rawCandidate.candidate_sponsorship_info?.at(0)

  const candidateName =
    !isNil(candidateInfo?.first_name) && !isNil(candidateInfo?.last_name)
      ? `${candidateInfo.first_name} ${candidateInfo.last_name}`
      : (sponsorshipInfo?.candidate_name ?? 'Candidate')

  const paymentOwner = (sponsorshipInfo?.payment_owner ?? 'candidate') as
    'candidate' | 'sponsor'

  // Build hydrated candidate shape for email template
  const candidate = {
    ...rawCandidate,
    candidate_info: candidateInfo,
    candidate_sponsorship_info: sponsorshipInfo,
  } as HydratedCandidate

  const sendResult = await sendEmail('candidate-payment-completed', {
    from: await getSystemEmailFrom(),
    to: [recipientEmail],
    subject: `Candidate Payment Received - ${candidateName}`,
    react: CandidatePaymentCompletedEmail({
      candidate,
      paymentAmount,
      paymentMethod,
      paymentOwner,
      reviewUrl: await getCandidateReviewUrl(candidate),
    }),
  })

  if (isErr(sendResult)) {
    logger.error(
      `Failed to send candidate payment notification email for ${candidateName}: ${sendResult.error}`
    )
    return err(`Failed to send email: ${sendResult.error}`)
  }

  logger.info(
    `Candidate payment notification email sent successfully for ${candidateName}`
  )
  return ok(true)
}

/**
 * Counts the emails successfully sent so far in the current calendar month.
 *
 * Counts send attempts (one row per `sendEmail()` call), not individual
 * recipient addresses -- that is the unit the email provider bills on. The
 * `recipient_count` column is there if we ever need the finer number.
 */
export async function getEmailsSentThisMonth(): Promise<
  Result<string, number>
> {
  const now = new Date()

  return NotificationRepository.countSentEmailsBetween(
    startOfMonth(now),
    endOfMonth(now)
  )
}

/**
 * Updates contact information email address.
 */
export async function updateContactInformation(
  contactId: string,
  emailAddress: string
): Promise<Result<string, ContactInfo>> {
  const result = await NotificationRepository.updateContactInformation(
    contactId,
    emailAddress
  )

  if (isErr(result)) {
    return result
  }

  const data = result.data

  return ok({
    id: data.id,
    label: data.label ?? contactId,
    emailAddress: data.email_address ?? '',
  })
}

/**
 * Sends an email to the assistant head CHA informing them that team fees have been paid.
 */
export async function notifyAssistantHeadForTeamPayment(
  teamUserId: string | null,
  weekendId: string | null,
  paymentAmount: number
): Promise<Result<string, true>> {
  if (isNil(teamUserId) || isNil(weekendId)) {
    return err('Team user ID or weekend ID is null')
  }

  try {
    if (!(await isNotificationEnabled(NOTIFY_PAYMENT_RECEIPTS_KEY))) {
      logger.info(
        `Skipped team payment notification for weekend ${weekendId}: payment receipts & reminders are switched off in site settings`
      )
      return ok(true)
    }

    // Runs inside the Stripe webhook, where there is no user session: the
    // session client would be anonymous and read nothing.
    const supabase = createAdminClient()

    // Get all weekend roster data and weekend details in parallel
    const [teamMemberResult, weekendResult, assistantHeadResult] =
      await Promise.all([
        // Get team member details
        supabase
          .from('weekend_roster')
          .select(
            `
          *,
          users!inner(email, first_name, last_name)
        `
          )
          .eq('user_id', teamUserId)
          .eq('weekend_id', weekendId)
          .single(),

        // Get weekend details
        supabase
          .from('weekends')
          .select('*, weekend_groups(number)')
          .eq('id', weekendId)
          .single(),

        // Find Assistant Head for this weekend
        supabase
          .from('weekend_roster')
          .select(
            `
          *,
          users!inner(email, first_name, last_name)
        `
          )
          .eq('weekend_id', weekendId)
          .eq('cha_role', 'Assistant Head')
          .limit(1)
          .single(),
      ])

    const { data: teamMember, error: teamMemberError } = teamMemberResult
    const { data: weekend, error: weekendError } = weekendResult
    const { data: assistantHead, error: assistantHeadError } =
      assistantHeadResult

    if (!isNil(teamMemberError) || isNil(teamMember)) {
      return err(
        `Failed to fetch team member details: ${teamMemberError?.message ?? 'Team member not found'}`
      )
    }

    if (!isNil(weekendError) || isNil(weekend)) {
      return err(
        `Failed to fetch weekend details: ${weekendError?.message ?? 'Weekend not found'}`
      )
    }

    if (!isNil(assistantHeadError) || isNil(assistantHead)) {
      return err(
        `Failed to fetch assistant head for weekend ${weekendId}: ${assistantHeadError?.message ?? 'Assistant Head not found'}`
      )
    }

    if (isNil(assistantHead.users.email)) {
      return err(`Assistant head email not found for weekend ${weekendId}`)
    }

    // Send email to assistant head
    const sendResult = await sendEmail('team-payment-notification', {
      from: await getSystemEmailFrom(),
      to: [assistantHead.users.email],
      subject: `Team Fee Received - ${teamMember.users.first_name} ${teamMember.users.last_name}`,
      react: TeamPaymentNotificationEmail({
        teamMemberName: `${teamMember.users.first_name} ${teamMember.users.last_name}`,
        teamMemberEmail: teamMember.users.email,
        weekendName: formatWeekendLabelFor({
          number: weekend.weekend_groups?.number,
          gender: weekend.type,
        }),
        paymentAmount,
      }),
    })

    if (isErr(sendResult)) {
      logger.error(
        `Failed to send team payment notification email to assistant head for ${teamMember.users.first_name} ${teamMember.users.last_name}: ${sendResult.error}`
      )
      return err(`Failed to send email: ${sendResult.error}`)
    }

    logger.info(
      `Team payment notification email sent successfully to assistant head for ${teamMember.users.first_name} ${teamMember.users.last_name}`
    )
    return ok(true)
  } catch (error) {
    return err(
      `Error while sending team payment notification email: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Notify pre-weekend couple when a candidate completes their forms
 */
export async function sendCandidateFormsCompletedEmail(
  candidateId: string
): Promise<Result<string, { data: CreateEmailResponseSuccess | null }>> {
  try {
    // The candidate submitting forms is not logged in, so every read here
    // goes through the admin client (the session client would be anonymous).
    const candidateResult =
      await CandidateRepository.getCandidateByIdAdmin(candidateId)

    if (isErr(candidateResult)) {
      return err(`Failed to fetch candidate: ${candidateResult.error}`)
    }

    const rawCandidate = candidateResult.data

    if (isNil(rawCandidate)) {
      return err('Candidate not found')
    }

    const candidate = {
      ...rawCandidate,
      candidate_info: rawCandidate.candidate_info?.at(0),
      candidate_sponsorship_info:
        rawCandidate.candidate_sponsorship_info?.at(0),
    } as HydratedCandidate

    const preWeekendEmailResult = await getPreWeekendCoupleEmailAdmin()
    if (isErr(preWeekendEmailResult)) {
      return err(preWeekendEmailResult.error)
    }

    const candidateName =
      !isNil(candidate.candidate_info?.first_name) &&
      !isNil(candidate.candidate_info?.last_name)
        ? `${candidate.candidate_info.first_name} ${candidate.candidate_info.last_name}`
        : (candidate.candidate_sponsorship_info?.candidate_name ?? 'Candidate')

    // Send email using Resend
    const sendResult = await sendEmail('candidate-forms-completed', {
      from: await getSystemEmailFrom(),
      to: [preWeekendEmailResult.data],
      subject: `Candidate Forms Completed - ${candidateName}`,
      react: CandidateFormsCompletedEmail({
        ...candidate,
        reviewUrl: await getCandidateReviewUrl(candidate, {
          client: createAdminClient(),
        }),
      }),
    })

    if (isErr(sendResult)) {
      logger.error(
        `Failed to send candidate forms completed email for ${candidateName}: ${sendResult.error}`
      )
      return err(`Failed to send email: ${sendResult.error}`)
    }

    logger.info(
      `Candidate forms completed email sent successfully for ${candidateName}`
    )
    return ok({ data: sendResult.data })
  } catch (error) {
    return err(
      `Error while sending candidate forms completed email: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
