'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { isNil } from 'lodash'
import { authorizedAction } from '@/lib/actions/authorized-action'
import { Permission } from '@/lib/security'
import { TAGS } from '@/lib/cache/tags'
import { isErr, ok } from '@/lib/results'
import type { GroupFees } from '@/lib/payments/group-fees'
import {
  describeFeeChangeImpact,
  type FeeChangeImpact,
} from '@/lib/payments/fee-change-impact'
import * as PaymentService from '@/services/payment/payment-service'
import * as FeesService from './fees-service'
import type { FeeChange, FeeDefaults } from './types'

function revalidateFeeViews() {
  revalidatePath('/admin')
  revalidatePath('/admin/payments')
  revalidatePath('/admin/payments/summary')
  revalidatePath('/admin/weekends')
  revalidatePath('/admin/settings')
  revalidatePath('/weekends/[groupId]', 'layout')
}

/** Changes what new groups start at. Requires MANAGE_FEES. */
export const updateFeeDefaults = authorizedAction<[FeeDefaults], FeeDefaults>(
  Permission.MANAGE_FEES,
  async (_user, defaults) => {
    const result = await FeesService.updateFeeDefaults(defaults)
    if (!isErr(result)) {
      // Defaults live in site_settings.
      updateTag(TAGS.settings)
      revalidateFeeViews()
    }
    return result
  }
)

/**
 * Changes a group's fees. Everyone in the group owes the new amount; the
 * change is logged by the database. Requires MANAGE_FEES.
 */
export const updateGroupFees = authorizedAction<
  [{ groupId: string; fees: GroupFees }],
  GroupFees
>(Permission.MANAGE_FEES, async (_user, { groupId, fees }) => {
  const result = await FeesService.setGroupFees(groupId, fees)
  if (!isErr(result)) {
    updateTag(TAGS.groupFees)
    updateTag(TAGS.weekendGroup(groupId))
    revalidateFeeViews()
  }
  return result
})

/**
 * What a fee change would do to the people in a group, for the confirmation
 * shown before saving. Requires MANAGE_FEES.
 */
export const previewGroupFeeChange = authorizedAction<
  [{ groupId: string; groupNumber: number | null; fees: GroupFees }],
  FeeChangeImpact
>(Permission.MANAGE_FEES, async (_user, { groupId, groupNumber, fees }) => {
  const [paymentsResult, currentResult] = await Promise.all([
    PaymentService.getAllPayments(),
    FeesService.getGroupFees(groupId),
  ])
  if (isErr(paymentsResult)) return paymentsResult
  if (isErr(currentResult)) return currentResult

  const payments = paymentsResult.data
  const current = currentResult.data
  // A group that isn't tracked yet owes nothing today, so there is no
  // "before" to price.
  const [beforeResult, afterResult] = await Promise.all([
    PaymentService.getFeeAccounts(
      payments,
      isNil(current) ? [] : [{ groupId, groupNumber, fees: current }]
    ),
    PaymentService.getFeeAccounts(payments, [{ groupId, groupNumber, fees }]),
  ])
  if (isErr(beforeResult)) return beforeResult
  if (isErr(afterResult)) return afterResult

  return ok(describeFeeChangeImpact(beforeResult.data, afterResult.data))
})

/** A group's fee history, newest first. Requires READ_PAYMENTS. */
export const getGroupFeeHistory = authorizedAction<[string], FeeChange[]>(
  Permission.READ_PAYMENTS,
  async (_user, groupId) => FeesService.getFeeHistory(groupId)
)
