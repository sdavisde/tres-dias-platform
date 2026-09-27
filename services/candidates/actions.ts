'use server'

import { authorizedAction } from '@/lib/actions/authorized-action'
import { Permission } from '@/lib/security'
import type { PaymentTransactionRow } from '@/services/payment/types'
import * as CandidateService from './candidate-service'

/**
 * Records a manual (cash/check) payment for a candidate. The weekend
 * leadership team (`READ_WRITE_TEAM_PAYMENTS` via CHA role) and anyone who can
 * record payments in admin (`WRITE_PAYMENTS`: treasurer, PWC) may do this;
 * it mirrors the "Record payment" menu item on the review page.
 */
export const recordManualCandidatePayment = authorizedAction<
  [string, number, 'cash' | 'check', string, string | undefined],
  PaymentTransactionRow
>(
  [Permission.READ_WRITE_TEAM_PAYMENTS, Permission.WRITE_PAYMENTS],
  async (
    _user,
    candidateId,
    paymentAmount,
    paymentMethod,
    paymentOwner,
    notes
  ) => {
    return CandidateService.recordManualCandidatePayment(
      candidateId,
      paymentAmount,
      paymentMethod,
      paymentOwner,
      notes
    )
  }
)
