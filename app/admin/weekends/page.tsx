import { Permission, userHasPermission } from '@/lib/security'
import { guardAdminPage } from '@/lib/admin/page-guard'
import {
  bucketGroupsForBoard,
  countOpenFeesByWeekend,
  deriveWeekendStats,
  type ActiveGroupStats,
  type WeekendOpenFees,
} from '@/lib/admin/weekend-stats'
import { isErr } from '@/lib/results'
import * as Results from '@/lib/results'
import { isNil } from 'lodash'
import { getWeekendGroupsByStatus } from '@/services/weekend'
import { getRosterCountByWeekend } from '@/services/weekend/weekend-service'
import {
  getCandidateCountByWeekend,
  getCandidateCountsByWeekends,
  getCandidateReviewCountByWeekend,
} from '@/services/candidates/candidate-service'
import { getAllPayments, getFeeBalances } from '@/services/payment'
import {
  getFeeDefaults,
  getTrackedGroups as getTrackedGroupFees,
} from '@/services/fees/fees-service'
import type { GroupFees } from '@/lib/payments/group-fees'
import { AdminBreadcrumbs } from '@/components/admin/breadcrumbs'
import { Weekends } from './components/Weekends'

export default async function WeekendsPage() {
  const { user, canEdit } = await guardAdminPage({
    required: [Permission.READ_WEEKENDS],
    edit: [Permission.WRITE_WEEKENDS],
  })

  // Fees are small, independent reads: a failure just leaves prices off the
  // rows (and the create form falls back to the server-side defaults).
  const feesPromise = Promise.all([getTrackedGroupFees(), getFeeDefaults()])

  const weekendGroupsResult = await getWeekendGroupsByStatus({})
  if (isErr(weekendGroupsResult)) {
    throw new Error(`Failed to fetch weekends: ${weekendGroupsResult.error}`)
  }
  const weekendGroups = weekendGroupsResult.data
  const buckets = bucketGroupsForBoard(weekendGroups)

  // Candidate counts for the past rows. One round trip for every past weekend,
  // started here so it overlaps the active-group fetches below; a failure just
  // drops the count off those rows.
  const pastCountsPromise = getCandidateCountsByWeekends(
    buckets.past.flatMap((group) =>
      [group.weekends.MENS?.id, group.weekends.WOMENS?.id].filter(
        (id): id is string => !isNil(id)
      )
    )
  )

  // Stat tiles only exist for the active group. Each source is fetched and
  // handled independently: a failed (or permission-denied) source nulls its
  // tile instead of breaking the page.
  let activeStats: ActiveGroupStats | null = null
  if (!isNil(buckets.active)) {
    const { MENS: mens, WOMENS: womens } = buckets.active.weekends
    const [
      mensRoster,
      womensRoster,
      mensCandidates,
      womensCandidates,
      mensToReview,
      womensToReview,
      paymentsResult,
    ] = await Promise.all([
      getRosterCountByWeekend(mens.id),
      getRosterCountByWeekend(womens.id),
      getCandidateCountByWeekend(mens.id),
      getCandidateCountByWeekend(womens.id),
      getCandidateReviewCountByWeekend(mens.id),
      getCandidateReviewCountByWeekend(womens.id),
      getAllPayments(),
    ])
    Results.logFailures(
      mensRoster,
      womensRoster,
      mensCandidates,
      womensCandidates,
      mensToReview,
      womensToReview
    )

    // Open fees come from the same per-person list the dashboard tile and the
    // Payments ledger read, so the three pages can never disagree. A failed
    // read nulls the stat rather than reporting a count we don't know.
    const payments = Results.toNullable(paymentsResult)
    let openFees: Record<string, WeekendOpenFees> | null = null
    if (!isNil(payments)) {
      const balancesResult = await getFeeBalances({ payments })
      Results.logFailures(balancesResult)
      openFees = Results.toNullable(
        Results.map(balancesResult, (balances) =>
          countOpenFeesByWeekend(balances.outstanding)
        )
      )
    }

    // A weekend nobody owes on has no bucket, which is zero open fees — not a
    // missing source, so the tile still shows.
    const openFeeCountFor = (weekendId: string) =>
      isNil(openFees) ? null : (openFees[weekendId]?.count ?? 0)

    activeStats = {
      MENS: deriveWeekendStats({
        candidateCount: Results.toNullable(mensCandidates),
        rosterCount: Results.toNullable(mensRoster),
        reviewCount: Results.toNullable(mensToReview),
        openFeeCount: openFeeCountFor(mens.id),
      }),
      WOMENS: deriveWeekendStats({
        candidateCount: Results.toNullable(womensCandidates),
        rosterCount: Results.toNullable(womensRoster),
        reviewCount: Results.toNullable(womensToReview),
        openFeeCount: openFeeCountFor(womens.id),
      }),
    }
  }

  const pastCountsResult = await pastCountsPromise
  Results.logFailures(pastCountsResult)
  const pastCandidateCounts = Results.toNullable(pastCountsResult)

  const [trackedGroupsResult, feeDefaultsResult] = await feesPromise
  Results.logFailures(trackedGroupsResult, feeDefaultsResult)
  const feesByGroupId: Record<string, GroupFees> | null = Results.toNullable(
    Results.map(trackedGroupsResult, (groups) =>
      Object.fromEntries(groups.map((g) => [g.groupId, g.fees]))
    )
  )

  return (
    <>
      <AdminBreadcrumbs
        title="Weekends"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }]}
      />
      <div className="container mx-auto px-4 sm:px-8 py-6">
        <Weekends
          buckets={buckets}
          activeStats={activeStats}
          pastCandidateCounts={pastCandidateCounts}
          allGroups={weekendGroups}
          canEdit={canEdit}
          feesByGroupId={feesByGroupId}
          feeDefaults={Results.toNullable(feeDefaultsResult)}
          canManageFees={userHasPermission(user, [Permission.MANAGE_FEES])}
          canReadPayments={userHasPermission(user, [Permission.READ_PAYMENTS])}
        />
      </div>
    </>
  )
}
