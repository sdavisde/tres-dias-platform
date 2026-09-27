'use server'

import { revalidatePath } from 'next/cache'
import { authorizedAction } from '@/lib/actions/authorized-action'
import { Permission } from '@/lib/security'
import { PaymentRecord } from '@/lib/payments/types'
import * as PaymentService from './payment-service'
import type {
  PaymentTargetOption,
  PaymentTransactionDTO,
  PaymentTransactionRow,
  ReassignPaymentInput,
  RecordAdminPaymentInput,
  UpdatePaymentDetailsInput,
  VoidPaymentInput,
} from './types'
import type { FeeBalances } from '@/lib/payments/fee-balances'
import type { Result } from '@/lib/results'
import { err, isErr, isOk, ok } from '@/lib/results'
import { getLoggedInUser } from '@/services/identity/user'
import {
  teamFeeStatusFromPrice,
  type TeamFeeStatus,
} from '@/lib/payments/checkout-price'

/**
 * The signed-in member's own team fee: paid only once the full amount is
 * covered, so a partial payment or a raised fee still shows money owed. Uses
 * the same calculation as online checkout.
 */
export const getMyTeamFeeStatus = authorizedAction<[string], TeamFeeStatus>(
  'authenticated',
  async (user, groupMemberId) => {
    // Session first, then the admin-client quote, so an anonymous caller learns
    // nothing about whether a group member exists or has paid.
    const quoteResult = await PaymentService.getCheckoutQuote({
      kind: 'team',
      groupMemberId,
    })
    if (isErr(quoteResult)) return err('Not your team fee')
    if (user.id !== quoteResult.data.userId) {
      return err('Not your team fee')
    }
    return ok(teamFeeStatusFromPrice(quoteResult.data.price))
  }
)

/**
 * Retrieves all payment records from the new payment_transaction table.
 * Requires READ_PAYMENTS permission.
 */
export const getAllPayments = authorizedAction<[], PaymentTransactionDTO[]>(
  Permission.READ_PAYMENTS,
  async () => {
    return await PaymentService.getAllPayments()
  }
)

/**
 * Retrieves all payment records including voided ones, for the admin payments
 * table. Voided payments never reach a total — see getAllPayments for every
 * other caller. Requires READ_PAYMENTS permission.
 */
export const getAllPaymentsIncludingVoided = authorizedAction<
  [],
  PaymentTransactionDTO[]
>(Permission.READ_PAYMENTS, async () => {
  return await PaymentService.getAllPaymentsIncludingVoided()
})

/**
 * Lists the candidates and team members a payment can be reassigned to.
 * Requires WRITE_PAYMENTS permission.
 */
export const getPaymentTargetOptions = authorizedAction<
  [],
  PaymentTargetOption[]
>(Permission.WRITE_PAYMENTS, async () => {
  return await PaymentService.getPaymentTargetOptions()
})

/**
 * Reassigns a payment to a different candidate or team member, moving its
 * weekend with it. Requires WRITE_PAYMENTS permission.
 */
export const reassignPayment = authorizedAction<
  [ReassignPaymentInput],
  PaymentTransactionRow
>(Permission.WRITE_PAYMENTS, async (_user, input) => {
  const result = await PaymentService.reassignPayment(input)
  if (isOk(result)) revalidatePaymentViews()
  return result
})

/**
 * Voids a payment without deleting it. Requires WRITE_PAYMENTS permission.
 */
export const voidPayment = authorizedAction<
  [VoidPaymentInput],
  PaymentTransactionRow
>(Permission.WRITE_PAYMENTS, async (_user, input) => {
  const result = await PaymentService.voidPayment(input)
  if (isOk(result)) revalidatePaymentViews()
  return result
})

/**
 * Corrects a payment's amount, method, payer, or notes.
 * Requires WRITE_PAYMENTS permission.
 */
export const updatePaymentDetails = authorizedAction<
  [UpdatePaymentDetailsInput],
  PaymentTransactionRow
>(Permission.WRITE_PAYMENTS, async (_user, input) => {
  const result = await PaymentService.updatePaymentDetails(input)
  if (isOk(result)) revalidatePaymentViews()
  return result
})

/**
 * Records a payment entered by hand on the admin Payments page: cash, a
 * check, or a waived fee. Requires WRITE_PAYMENTS permission.
 */
export const recordAdminPayment = authorizedAction<
  [RecordAdminPaymentInput],
  PaymentTransactionRow
>(Permission.WRITE_PAYMENTS, async (_user, input) => {
  const result = await PaymentService.recordAdminPayment(input)
  if (isOk(result)) revalidatePaymentViews()
  return result
})

/**
 * Who still owes a fee, and who paid more than they owe, across every weekend
 * group whose fees are set. Calculated from the rosters and candidates on
 * every call — fee balances are never stored. Requires READ_PAYMENTS.
 */
export const getFeeBalances = authorizedAction<
  [{ payments: PaymentTransactionDTO[] }],
  FeeBalances
>(Permission.READ_PAYMENTS, async (_user, { payments }) => {
  return await PaymentService.getFeeBalances(payments)
})

/**
 * Refreshes every server-rendered view whose numbers a correction can move:
 * the payments table and report, and the candidate list where balances show.
 */
function revalidatePaymentViews() {
  revalidatePath('/admin/payments')
  revalidatePath('/admin/payments/summary')
  revalidatePath('/admin')
  // Every hub page (overview tiles, Candidates tab) under any group.
  revalidatePath('/weekends/[groupId]', 'layout')
}
