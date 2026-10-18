import 'server-only'
import { checkoutFeeTypeFromMetadata } from '@/lib/payments/checkout-price'

import type Stripe from 'stripe'
import { ok, isErr, Results } from '@/lib/results'
import { logger } from '@/lib/logger'
import {
  notifyAssistantHeadForTeamPayment,
  notifyCandidatePaymentReceivedAdmin,
} from '@/services/notifications/notification-service'
import { isNil } from 'lodash'
import { getTransactionData } from '../stripe-service'
import type {
  HandlerSuccess,
  WebhookHandler,
  WebhookHandlerContext,
} from './types'
import { WebhookErrorCodes } from './types'
import { webhookErr } from '../webhook-context'
import * as PaymentService from '@/services/payment/payment-service'
import { getGroupMemberById } from '@/services/weekend-group-member/repository'

/**
 * Handler for checkout.session.completed events.
 * Processes both candidate and team payments.
 */
export const checkoutSessionCompletedHandler: WebhookHandler<Stripe.CheckoutSessionCompletedEvent> =
  {
    eventType: 'checkout.session.completed',
    handle: async (event, ctx) => {
      const session = event.data.object

      if (
        isNil(session.payment_intent) ||
        typeof session.payment_intent !== 'string'
      ) {
        return webhookErr(
          WebhookErrorCodes.MISSING_PAYMENT_INTENT,
          'Missing payment intent in session',
          'validation',
          'error',
          ctx.paymentContext
        )
      }

      ctx.updateContext({
        paymentIntentId: session.payment_intent,
        amount: !isNil(session.amount_total)
          ? session.amount_total / 100
          : undefined,
      })

      logger.info(
        { sessionId: session.id, paymentIntentId: session.payment_intent },
        'Processing completed checkout session'
      )

      // A replayed event (same payment intent) records nothing and answers
      // 200, so Stripe stops retrying. Checked before any write.
      const existingResult = await PaymentService.findPaymentByIntentId(
        session.payment_intent,
        { dangerouslyBypassRLS: true }
      )
      if (isErr(existingResult)) {
        // Fail so Stripe retries, rather than risk recording it twice.
        return webhookErr(
          WebhookErrorCodes.PROCESSING_ERROR,
          `Failed to look up existing payment: ${existingResult.error}`,
          'database_lookup',
          'error',
          ctx.paymentContext
        )
      }
      if (!isNil(existingResult.data)) {
        const paymentId = existingResult.data.id
        logger.info(
          { paymentIntentId: session.payment_intent, paymentId },
          'Payment already recorded; ignoring replayed checkout.session.completed'
        )
        // A delivery that recorded the payment but failed to confirm the
        // candidate is retried; finish that step instead of skipping it.
        const candidateId = session.metadata?.candidateId
        if (
          checkoutFeeTypeFromMetadata(session.metadata) === 'candidate' &&
          !isNil(candidateId)
        ) {
          const confirmResult = await confirmIfAwaitingPayment(
            candidateId,
            ctx.adminClient
          )
          if (isErr(confirmResult)) {
            return webhookErr(
              WebhookErrorCodes.STATUS_UPDATE_FAILED,
              confirmResult.error,
              'status_update',
              'error',
              ctx.paymentContext
            )
          }
        }
        return ok({
          processed: false,
          entityType: replayEntityType(session.metadata),
          entityId: paymentId,
        })
      }

      // Metadata keys are written by lib/payments/checkout-metadata.ts.
      switch (checkoutFeeTypeFromMetadata(session.metadata)) {
        case 'candidate':
          return handleCandidatePayment(session, ctx)

        case 'team':
          return handleTeamPayment(session, ctx)

        default:
          logger.warn(
            { feeType: session.metadata?.fee_type },
            'Unknown fee type in checkout session - ignoring'
          )
          // Return success but not processed - unknown sessions are not an error
          return ok({ processed: false })
      }
    },
  }

/** The success entity type a replay reports, from the session's fee type. */
function replayEntityType(
  metadata: Stripe.Checkout.Session['metadata']
): HandlerSuccess['entityType'] {
  switch (checkoutFeeTypeFromMetadata(metadata)) {
    case 'candidate':
      return 'candidate_payment'
    case 'team':
      return 'team_payment'
    default:
      return undefined
  }
}

/**
 * Handles candidate payment processing.
 */
async function handleCandidatePayment(
  session: Stripe.Checkout.Session,
  ctx: WebhookHandlerContext
): Promise<ReturnType<WebhookHandler['handle']>> {
  // Written by lib/payments/checkout-metadata.ts.
  const candidateId = session.metadata?.candidateId ?? null

  if (isNil(candidateId)) {
    return webhookErr(
      WebhookErrorCodes.MISSING_CANDIDATE_ID,
      'Missing candidate ID in session metadata',
      'validation',
      'error',
      ctx.paymentContext
    )
  }

  ctx.updateContext({ candidateId })
  logger.info({ candidateId }, 'Processing candidate payment')

  // The money arrived whatever the candidate's status: a confirmed
  // candidate can still owe (fee raised, partial cash), and two open
  // checkouts can both be paid. Always record it; only the status change
  // depends on the candidate still awaiting payment.
  const paymentIntentId = session.payment_intent as string
  const grossAmount = !isNil(session.amount_total)
    ? session.amount_total / 100
    : 0

  // Try to fetch Stripe fee data (may not be available at checkout time)
  const transactionResult = await getTransactionData(paymentIntentId)
  if (isErr(transactionResult)) {
    logger.warn(
      { candidateId, error: transactionResult.error },
      'Transaction data not available at checkout time - will be backfilled at charge.updated or payout'
    )
  }
  const transaction = Results.unwrapOr(transactionResult, null)

  const paymentResult = await PaymentService.recordPayment(
    {
      type: 'fee',
      target_type: 'candidate',
      target_id: candidateId,
      // weekend_id is derived inside recordPayment from the candidate
      payment_intent_id: paymentIntentId,
      gross_amount: grossAmount,
      net_amount: transaction?.netAmount ?? null,
      stripe_fee: transaction?.stripeFee ?? null,
      payment_method: 'stripe',
      payment_owner: session.metadata?.payment_owner ?? 'unknown',
      charge_id: transaction?.chargeId ?? null,
      balance_transaction_id: transaction?.balanceTransactionId ?? null,
    },
    { dangerouslyBypassRLS: true }
  )

  if (isErr(paymentResult)) {
    return webhookErr(
      WebhookErrorCodes.PAYMENT_RECORD_FAILED,
      paymentResult.error,
      'payment_recording',
      'error',
      ctx.paymentContext
    )
  }

  logger.info(
    { candidateId, paymentId: paymentResult.data.id },
    'Successfully recorded candidate payment'
  )

  const confirmResult = await confirmIfAwaitingPayment(
    candidateId,
    ctx.adminClient
  )
  if (isErr(confirmResult)) {
    return webhookErr(
      WebhookErrorCodes.STATUS_UPDATE_FAILED,
      confirmResult.error,
      'status_update',
      'error',
      ctx.paymentContext
    )
  }

  logger.info(
    { candidateId, confirmed: confirmResult.data },
    'Candidate payment processed'
  )

  // Notify pre-weekend couple (don't fail webhook if email fails)
  const paymentAmount = grossAmount
  const notifyResult = await notifyCandidatePaymentReceivedAdmin(
    candidateId,
    paymentAmount,
    'card'
  )
  if (isErr(notifyResult)) {
    logger.error(
      { candidateId, error: notifyResult.error },
      'Failed to notify pre-weekend couple of candidate payment'
    )
  } else {
    logger.info(
      { candidateId },
      'Successfully notified pre-weekend couple of candidate payment'
    )
  }

  return ok({
    processed: true,
    entityType: 'candidate_payment',
    entityId: paymentResult.data.id,
    details: {
      candidateId,
      paymentAmount,
    },
  })
}

/**
 * Handles team member payment processing.
 * Uses group_member_id from Stripe metadata to target weekend_group_member.
 */
async function handleTeamPayment(
  session: Stripe.Checkout.Session,
  ctx: WebhookHandlerContext
): Promise<ReturnType<WebhookHandler['handle']>> {
  // Written by lib/payments/checkout-metadata.ts.
  const groupMemberId = session.metadata?.group_member_id ?? null

  if (isNil(groupMemberId)) {
    return webhookErr(
      WebhookErrorCodes.MISSING_USER_ID,
      'Missing group_member_id in session metadata',
      'validation',
      'error',
      ctx.paymentContext
    )
  }

  logger.info({ groupMemberId }, 'Processing team payment')

  // Verify the group member exists and get weekendId + userId for notification
  const groupMemberResult = await getGroupMemberById(groupMemberId)
  if (isErr(groupMemberResult)) {
    return webhookErr(
      WebhookErrorCodes.WEEKEND_ROSTER_NOT_FOUND,
      groupMemberResult.error,
      'database_lookup',
      'error',
      ctx.paymentContext
    )
  }

  const groupMember = groupMemberResult.data
  ctx.updateContext({
    userId: groupMember.user_id,
    weekendId: groupMember.weekendId ?? undefined,
  })

  logger.info(
    { groupMemberId, userId: groupMember.user_id },
    'Found group member record'
  )

  // Record the payment using PaymentService
  const paymentIntentId = session.payment_intent as string
  const grossAmount = !isNil(session.amount_total)
    ? session.amount_total / 100
    : 0

  // Try to fetch Stripe fee data (may not be available at checkout time)
  const transactionResult = await getTransactionData(paymentIntentId)
  if (isErr(transactionResult)) {
    logger.warn(
      { groupMemberId, error: transactionResult.error },
      'Transaction data not available at checkout time - will be backfilled at charge.updated or payout'
    )
  }
  const transaction = Results.unwrapOr(transactionResult, null)

  const paymentResult = await PaymentService.recordPayment(
    {
      type: 'fee',
      target_type: 'weekend_group_member',
      target_id: groupMemberId,
      // weekend_id is derived inside recordPayment from the member's roster;
      // a member on no roster fails the recording rather than guessing
      payment_intent_id: paymentIntentId,
      gross_amount: grossAmount,
      net_amount: transaction?.netAmount ?? null,
      stripe_fee: transaction?.stripeFee ?? null,
      payment_method: 'stripe',
      payment_owner: session.metadata?.payment_owner ?? null,
      charge_id: transaction?.chargeId ?? null,
      balance_transaction_id: transaction?.balanceTransactionId ?? null,
    },
    { dangerouslyBypassRLS: true }
  )

  if (isErr(paymentResult)) {
    return webhookErr(
      WebhookErrorCodes.PAYMENT_RECORD_FAILED,
      paymentResult.error,
      'payment_recording',
      'error',
      ctx.paymentContext
    )
  }

  logger.info(
    { groupMemberId, paymentId: paymentResult.data.id },
    'Successfully recorded group member payment'
  )

  // Notify assistant head (don't fail webhook if email fails)
  const paymentAmount = grossAmount
  const notifyResult = await notifyAssistantHeadForTeamPayment(
    groupMember.user_id,
    groupMember.weekendId ?? null,
    paymentAmount
  )
  if (isErr(notifyResult)) {
    logger.error(
      { groupMemberId, error: notifyResult.error },
      'Failed to notify assistant head of team payment'
    )
  } else {
    logger.info(
      { groupMemberId },
      'Successfully notified assistant head of team payment'
    )
  }

  return ok({
    processed: true,
    entityType: 'team_payment',
    entityId: paymentResult.data.id,
    details: {
      groupMemberId,
      userId: groupMember.user_id,
      weekendId: groupMember.weekendId,
      paymentAmount,
    },
  })
}

/**
 * Moves a candidate from awaiting_payment to confirmed. Any other status is
 * left alone (already confirmed, or set by hand), so it is safe to repeat.
 *
 * @returns Whether this call confirmed the candidate
 */
async function confirmIfAwaitingPayment(
  candidateId: string,
  adminClient: WebhookHandlerContext['adminClient']
): Promise<
  ReturnType<typeof ok<boolean>> | ReturnType<typeof Results.err<string>>
> {
  const { data, error } = await adminClient
    .from('candidates')
    .update({ status: 'confirmed' })
    .eq('id', candidateId)
    .eq('status', 'awaiting_payment')
    .select('id')

  if (!isNil(error)) {
    return Results.err(
      `Failed to update candidate status to confirmed: ${error.message}`
    )
  }

  return ok((data ?? []).length > 0)
}
