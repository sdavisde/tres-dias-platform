import { Permission, userHasPermission } from '@/lib/security'
import { redirect } from 'next/navigation'
import { getLoggedInUser } from '@/services/identity/user'
import {
  getAllPaymentsIncludingVoided,
  getFeeBalances,
} from '@/services/payment'
import { getGroupFees } from '@/services/fees/fees-service'
import { getActiveWeekends } from '@/services/weekend/weekend-service'
import { isErr, isOk } from '@/lib/results'
import * as Results from '@/lib/results'
import { AdminBreadcrumbs } from '@/components/admin/breadcrumbs'
import type { FeeBalances } from '@/lib/payments/fee-balances'
import { Payments } from './components/Payments'
import { isNil } from 'lodash'

export default async function PaymentsPage() {
  // Auth runs concurrently with the data fetches; the redirects below still
  // fire before anything renders.
  // Payments include voided rows so corrections stay visible behind a toggle.
  // The table hides them by default and never counts them in totals.
  const [userResult, paymentsResult, activeWeekendsResult] = await Promise.all([
    getLoggedInUser(),
    getAllPaymentsIncludingVoided(),
    getActiveWeekends(),
  ])
  const user = userResult?.data

  try {
    if (isErr(userResult) || isNil(user)) {
      throw new Error('User not found')
    }
  } catch (error) {
    redirect('/')
  }

  if (!userHasPermission(user, [Permission.READ_PAYMENTS])) {
    redirect('/admin')
  }

  if (isErr(paymentsResult)) {
    throw new Error(`Failed to fetch payments: ${paymentsResult.error}`)
  }

  const activeGroupId = isOk(activeWeekendsResult)
    ? (activeWeekendsResult.data.MENS.groupId ??
      activeWeekendsResult.data.WOMENS.groupId)
    : null

  // Fee balances are calculated from every tracked group's rosters and
  // candidates on every load — never stored. When they can't be worked out
  // the page still renders; the tile says so instead of showing a $0.
  const [balancesResult, activeFeesResult] = await Promise.all([
    getFeeBalances({ payments: paymentsResult.data }),
    isNil(activeGroupId) ? Promise.resolve(null) : getGroupFees(activeGroupId),
  ])
  Results.logFailures(balancesResult)
  if (!isNil(activeFeesResult)) Results.logFailures(activeFeesResult)

  const balances: FeeBalances = Results.unwrapOr(balancesResult, {
    outstanding: [],
    overpaid: [],
  })

  // Suggested amounts for "Record a payment": the active group's cash price,
  // which is what someone paying by hand owes. An open fee's own row prefills
  // its own group's amount instead.
  const activeFees = isNil(activeFeesResult)
    ? null
    : Results.toNullable(activeFeesResult)

  return (
    <>
      <AdminBreadcrumbs
        title="Payments"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }]}
      />
      <div className="container mx-auto px-4 py-6 sm:px-8">
        <Payments
          payments={paymentsResult.data}
          outstandingFees={balances.outstanding}
          overpaidFees={balances.overpaid}
          balancesUnavailable={isErr(balancesResult)}
          feeDefaults={{
            team: activeFees?.teamFee ?? null,
            candidate: activeFees?.candidateFee ?? null,
          }}
          user={user}
        />
      </div>
    </>
  )
}
