import { Suspense } from 'react'
import { isNil } from 'lodash'
import { AdminBreadcrumbs } from '@/components/admin/breadcrumbs'
import { PageHeader } from '@/components/ui/page-header'
import * as Results from '@/lib/results'
import type { Result } from '@/lib/results'
import { guardAdminPage } from '@/lib/admin/page-guard'
import {
  deriveActionItems,
  deriveCollectedThisYear,
  deriveOutstanding,
  hasActiveWeekendGroup,
  type ActiveGroupSecuela,
} from '@/lib/admin/dashboard-metrics'
import { deriveSystemAlerts } from '@/lib/admin/system-alerts'
import { getAllPayments, getFeeBalances } from '@/services/payment'
import { getGroupFees } from '@/services/fees/fees-service'
import type { FeeBalances } from '@/lib/payments/fee-balances'
import type { GroupFees } from '@/lib/payments/group-fees'
import { getMasterRoster } from '@/services/master-roster'
import {
  getSecuelaDateForGroup,
  getUpcomingEvents,
} from '@/services/events/events-service'
import { getWeekendGroupsByStatus } from '@/services/weekend'
import { getActiveWeekends } from '@/services/weekend/weekend-service'
import { MetricCards } from './components/metric-cards'
import { ActionItemsList } from './components/action-items-list'
import { CalendarPreview } from './components/calendar-preview'
import {
  StorageUsageTile,
  StorageUsageTileSkeleton,
} from './components/storage-usage-tile'
import { SystemAlertsBanner } from './components/system-alerts-banner'

/** Presence check only — the value itself is a secret and is never read out. */
function isConfigured(value: string | undefined): boolean {
  return !isNil(value) && value !== ''
}

export default async function Page() {
  await guardAdminPage()

  // Each source is independent: one failing (including a permission the
  // viewer lacks) degrades its own card to a placeholder, never the page.
  const [
    paymentsResult,
    rosterResult,
    eventsResult,
    groupsResult,
    activeWeekendsResult,
  ] = await Promise.all([
    getAllPayments(),
    getMasterRoster(),
    getUpcomingEvents(),
    getWeekendGroupsByStatus({}),
    getActiveWeekends(),
  ])
  Results.logFailures(
    paymentsResult,
    rosterResult,
    eventsResult,
    groupsResult,
    activeWeekendsResult
  )

  const payments = Results.toNullable(paymentsResult)
  const activeWeekends = Results.toNullable(activeWeekendsResult)
  const activeGroupId =
    activeWeekends?.MENS.groupId ?? activeWeekends?.WOMENS.groupId ?? null
  const activeGroupNumber =
    activeWeekends?.MENS.number ?? activeWeekends?.WOMENS.number ?? null

  // These wait for the first round (payments, the active group) but stay
  // separate reads, each degrading only what it feeds. Outstanding money
  // comes from the same per-person calculation the Payments ledger lists, so
  // the tile and that page can never disagree — and it covers every group
  // with fees set, not just the active one.
  const balancesPromise: Promise<Result<string, FeeBalances>> | null = isNil(
    payments
  )
    ? null
    : getFeeBalances({ payments })
  const secuelaPromise: Promise<Result<string, string | null>> | null = isNil(
    activeGroupId
  )
    ? null
    : getSecuelaDateForGroup(activeGroupId)
  const activeFeesPromise: Promise<Result<string, GroupFees | null>> | null =
    isNil(activeGroupId) ? null : getGroupFees(activeGroupId)

  const [balancesResult, secuelaResult, activeFeesResult] = await Promise.all([
    balancesPromise,
    secuelaPromise,
    activeFeesPromise,
  ])
  if (!isNil(balancesResult)) Results.logFailures(balancesResult)
  if (!isNil(secuelaResult)) Results.logFailures(secuelaResult)
  if (!isNil(activeFeesResult)) Results.logFailures(activeFeesResult)

  const outstandingFees = isNil(balancesResult)
    ? null
    : (Results.toNullable(balancesResult)?.outstanding ?? null)

  // A secuela we couldn't look up is not a secuela we can say is missing.
  const activeGroupSecuela: ActiveGroupSecuela | null =
    isNil(secuelaResult) || Results.isErr(secuelaResult)
      ? null
      : {
          groupNumber: activeGroupNumber,
          isScheduled: !isNil(secuelaResult.data),
          mensStartDate: activeWeekends?.MENS.start_date ?? null,
        }

  // Undefined when there's no active group or its fees couldn't be read.
  const activeFees =
    isNil(activeFeesResult) || Results.isErr(activeFeesResult)
      ? undefined
      : activeFeesResult.data

  const outstanding = isNil(outstandingFees)
    ? null
    : deriveOutstanding(outstandingFees)
  const collected = isNil(payments) ? null : deriveCollectedThisYear(payments)
  const memberCount = Results.toNullable(rosterResult)?.members.length ?? null
  const events = Results.toNullable(eventsResult)
  const weekendGroups = Results.toNullable(groupsResult)

  const actionItems = deriveActionItems({
    outstanding,
    weekendGroups,
    activeGroupSecuela,
  })
  const actionItemsDegraded =
    isNil(outstanding) ||
    isNil(weekendGroups) ||
    (!isNil(secuelaResult) && Results.isErr(secuelaResult))

  // Banner checks. Friendly source names only — the raw errors were logged
  // above by `Results.logFailures` and never reach the page.
  const degradedSources: string[] = []
  if (isNil(payments)) degradedSources.push('Payments')
  if (Results.isErr(rosterResult)) degradedSources.push('Community roster')
  if (isNil(events)) degradedSources.push('Events')
  if (isNil(weekendGroups)) degradedSources.push('Weekends')
  if (!isNil(balancesResult) && isNil(outstandingFees)) {
    degradedSources.push('Outstanding fees')
  }

  const alerts = deriveSystemAlerts({
    activeGroupFeesSet: activeFees === undefined ? null : !isNil(activeFees),
    activeWeekendGroup: isNil(weekendGroups)
      ? null
      : hasActiveWeekendGroup(weekendGroups),
    stripeCheckoutConfigured: isConfigured(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ),
    stripeWebhookConfigured: isConfigured(process.env.STRIPE_WEBHOOK_SECRET),
    emailConfigured: isConfigured(process.env.RESEND_API_KEY),
    siteUrlConfigured: isConfigured(process.env.SITE_URL),
    degradedSources,
  })

  return (
    <>
      <AdminBreadcrumbs title="Admin" breadcrumbs={[]} />
      <div className="container mx-auto px-4 pb-12 md:px-8">
        <PageHeader
          title="Admin"
          description="Manage the website, users and permissions, payments, and files."
        />

        <SystemAlertsBanner alerts={alerts} />

        <MetricCards
          outstanding={outstanding}
          collected={collected}
          memberCount={memberCount}
          storageTile={
            /* Storage walks every bucket, so it streams into its tile on its
               own rather than holding up the money and people figures. */
            <Suspense fallback={<StorageUsageTileSkeleton />}>
              <StorageUsageTile />
            </Suspense>
          }
        />

        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
          <ActionItemsList items={actionItems} degraded={actionItemsDegraded} />
          <CalendarPreview
            events={events}
            scopeContext={{
              mensWeekendId: activeWeekends?.MENS.id,
              womensWeekendId: activeWeekends?.WOMENS.id,
            }}
            groupNumber={activeGroupNumber}
          />
        </div>
      </div>
    </>
  )
}
