import 'server-only'

import type Stripe from 'stripe'
import { ok, isErr, isOk } from '@/lib/results'
import { logger } from '@/lib/logger'
import { getPayoutTransactions } from '../stripe-service'
import type { WebhookHandler } from './types'
import { WebhookErrorCodes } from './types'
import { webhookErr } from '../webhook-context'
import * as DepositService from '@/services/deposit/deposit-service'
import * as PaymentService from '@/services/payment/payment-service'
import { isNil } from 'lodash'

/**
 * Handler for payout.paid events.
 * Records deposit information using DepositService and backfills fee data using PaymentService.
 */
export const payoutPaidHandler: WebhookHandler<Stripe.PayoutPaidEvent> = {
  eventType: 'payout.paid',
  handle: async (event, ctx) => {
    const payout = event.data.object

    logger.info(
      { payoutId: payout.id, amount: payout.amount / 100 },
      'Processing payout.paid event'
    )

    // Get all transactions in this payout
    const transactionsResult = await getPayoutTransactions(payout.id)
    if (isErr(transactionsResult)) {
      // Fail so Stripe retries; answering 200 would drop the deposit.
      return webhookErr(
        WebhookErrorCodes.PAYOUT_RECORD_FAILED,
        `Failed to get payout transactions: ${transactionsResult.error}`,
        'payout_processing',
        'error',
        ctx.paymentContext
      )
    }

    const transactions = transactionsResult.data
    logger.info(
      { payoutId: payout.id, transactionCount: transactions.length },
      'Found transactions in payout'
    )

    // Collect all payment intent IDs from the transactions
    const paymentIntentIds = transactions
      .map((t) => t.paymentIntentId)
      .filter((id) => !isNil(id))

    // Backfill Stripe fee data for each transaction before creating the deposit
    // This ensures payments have their fee data before being linked to the deposit
    let paymentsBackfilled = 0
    for (const transaction of transactions) {
      if (!isNil(transaction.paymentIntentId)) {
        const backfillResult = await PaymentService.backfillStripeData(
          transaction.paymentIntentId,
          {
            net_amount: transaction.netAmount / 100,
            stripe_fee: transaction.stripeFee / 100,
            charge_id: transaction.chargeId,
            balance_transaction_id: transaction.balanceTransactionId,
          },
          { dangerouslyBypassRLS: true }
        )

        if (isOk(backfillResult)) {
          paymentsBackfilled++
          logger.debug(
            {
              paymentIntentId: transaction.paymentIntentId,
              paymentId: backfillResult.data.id,
            },
            'Backfilled fee data for payment in payout'
          )
        } else {
          // Payment not found - might be legacy or from another system
          logger.debug(
            {
              paymentIntentId: transaction.paymentIntentId,
              error: backfillResult.error,
            },
            'No matching payment_transaction for payout transaction'
          )
        }
      }
    }

    // Calculate arrival date
    const arrivalDate =
      payout.arrival_date !== 0
        ? new Date(payout.arrival_date * 1000).toISOString()
        : null

    // Create the deposit using DepositService
    // The service will create the deposit and link all payments by payment_intent_id
    const depositResult = await DepositService.recordStripePayoutDeposit(
      {
        payout_id: payout.id,
        amount: payout.amount / 100, // Convert from cents to dollars
        status: payout.status as
          'pending' | 'in_transit' | 'paid' | 'canceled' | 'failed',
        arrival_date: arrivalDate,
        payment_intent_ids: paymentIntentIds,
      },
      { dangerouslyBypassRLS: true }
    )

    if (isErr(depositResult)) {
      return webhookErr(
        WebhookErrorCodes.PAYOUT_RECORD_FAILED,
        depositResult.error,
        'payout_processing',
        'error',
        ctx.paymentContext
      )
    }

    const deposit = depositResult.data

    logger.info(
      {
        payoutId: payout.id,
        depositId: deposit.id,
        paymentsBackfilled,
        paymentsLinked: deposit.payment_count,
        totalTransactions: transactions.length,
      },
      'Payout processing complete'
    )

    return ok({
      processed: true,
      entityType: 'payout',
      entityId: deposit.id,
      details: {
        payoutId: payout.id,
        paymentsBackfilled,
        paymentsLinked: deposit.payment_count,
        totalTransactions: transactions.length,
      },
    })
  },
}
