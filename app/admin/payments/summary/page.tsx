import { Permission, userHasPermission } from '@/lib/security'
import { redirect } from 'next/navigation'
import { getLoggedInUser } from '@/services/identity/user'
import {
  FEES_NOT_SET,
  getActiveWeekendFinancials,
} from '@/services/payment/payment-service'
import {
  getAllPayments,
  type ActiveWeekendFinancials,
} from '@/services/payment'
import { getActiveWeekends } from '@/services/weekend/weekend-service'
import { isErr, isOk } from '@/lib/results'
import * as Results from '@/lib/results'
import { AdminBreadcrumbs } from '@/components/admin/breadcrumbs'
import { PageHeader } from '@/components/ui/page-header'
import { isNil } from 'lodash'
import { PaymentReport } from './components/PaymentReport'

export default async function PaymentSummaryPage() {
  const userResult = await getLoggedInUser()
  const user = userResult?.data

  if (isErr(userResult) || isNil(user)) {
    redirect('/')
  }

  if (!userHasPermission(user, [Permission.READ_PAYMENTS])) {
    redirect('/admin')
  }

  const [paymentsResult, activeWeekendsResult] = await Promise.all([
    getAllPayments(),
    getActiveWeekends(),
  ])

  if (isErr(paymentsResult)) {
    throw new Error(`Failed to fetch payments: ${paymentsResult.error}`)
  }

  let activeWeekendFinancials: ActiveWeekendFinancials | null = null
  let activeFeesNotSet = false

  if (isOk(activeWeekendsResult)) {
    // A failure here leaves the active-group section out rather than showing
    // expected totals computed from a fee we don't actually know.
    const financialsResult = await getActiveWeekendFinancials(
      paymentsResult.data,
      activeWeekendsResult.data
    )
    activeFeesNotSet =
      isErr(financialsResult) && financialsResult.error === FEES_NOT_SET
    if (!activeFeesNotSet) Results.logFailures(financialsResult)
    activeWeekendFinancials = Results.toNullable(financialsResult)
  }

  return (
    <>
      <AdminBreadcrumbs
        title="Payment Report"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Payments', href: '/admin/payments' },
        ]}
      />
      <div className="container mx-auto px-4 py-6 sm:px-8">
        <PageHeader
          title="Payment summary"
          description="How each weekend's fees are coming in — collection by weekend, with the active group's totals."
        />
        <PaymentReport
          payments={paymentsResult.data}
          activeWeekendFinancials={activeWeekendFinancials}
          activeFeesNotSet={activeFeesNotSet}
        />
      </div>
    </>
  )
}
