import { redirect } from 'next/navigation'
import { getAllCandidatesWithDetails } from '@/services/candidates/hydrated-candidates'
import { MemberBreadcrumbs } from '@/components/member/breadcrumbs'
import { PageContent } from '@/components/member/page-content'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Errors } from '@/lib/error'
import { Results } from '@/lib/results'
import { Permission, userHasPermission } from '@/lib/security'
import { reviewQueuePath, toReviewCandidate } from '@/lib/candidates/review'
import { appendQueryParams } from '@/lib/url'
import { formatWeekendGender, formatWeekendGroupTitle } from '@/lib/weekend'
import { hubPath } from '@/lib/weekend/hub'
import { WeekendType } from '@/lib/weekend/types'
import { loadHubContextFromParams, type HubParams } from '../../hub-context'
import { ReviewWorkspace } from './components/review-workspace'

type PageProps = {
  params: HubParams
  searchParams: Promise<{ candidate?: string }>
}

/**
 * Review candidates — the Pre-Weekend Couple's queue for one weekend. A
 * weekend-operations screen, so it lives under the hub rather than in Admin,
 * and only people with candidate access get past the redirect.
 */
export default async function ReviewCandidatesPage({
  params,
  searchParams,
}: PageProps) {
  const { user, group, weekend, weekendType } =
    await loadHubContextFromParams(params)

  if (!userHasPermission(user, [Permission.READ_CANDIDATES])) {
    redirect(
      appendQueryParams(hubPath(group.groupId, 'overview', weekendType), {
        error: Errors.INSUFFICIENT_PERMISSIONS,
      })
    )
  }

  const canEdit = userHasPermission(user, [Permission.WRITE_CANDIDATES])
  const canEditPayments = userHasPermission(user, [Permission.WRITE_PAYMENTS])
  const canViewMedical = userHasPermission(user, [
    Permission.READ_CANDIDATE_MEDICAL_INFO,
  ])

  const candidatesResult = await getAllCandidatesWithDetails({
    weekendGroupId: group.groupId,
    weekendType,
  })
  Results.logFailures(candidatesResult)
  const candidates = Results.unwrapOr(candidatesResult, [])
    // Candidates are per weekend; the join already scopes them, this keeps
    // the client shape honest if it ever widens.
    .filter((candidate) => candidate.weekend_id === weekend.id)
    .map((candidate) => toReviewCandidate(candidate, { canViewMedical }))

  const groupTitle = formatWeekendGroupTitle(weekend.number)
  const gender = formatWeekendGender(weekendType, 'possessive') ?? ''
  const weekendLabel = `${gender} #${weekend.number ?? ''}`.trim()
  const { candidate: requested } = await searchParams
  // The picked candidate only rides along to the other weekend if they are
  // on it, which they never are — so the switch drops the selection.
  const switchTo = (type: WeekendType) =>
    reviewQueuePath(
      group.groupId,
      type,
      type === weekendType ? requested : null
    )

  return (
    <PageContent className="md:flex md:h-[calc(100dvh-3.5rem)] md:flex-col md:pb-5">
      <MemberBreadcrumbs
        title="Review candidates"
        breadcrumbs={[
          { label: 'Home', href: '/home' },
          { label: 'The weekends', href: '/weekends' },
          {
            label: groupTitle,
            href: hubPath(group.groupId, 'overview', weekendType),
          },
        ]}
      />
      <div className="mb-4 flex flex-wrap items-center gap-x-3.5 gap-y-2">
        <h1 className="font-serif text-[23px] font-semibold tracking-tight">
          Review candidates
        </h1>
        <SegmentedControl
          aria-label="Weekend"
          value={weekendType}
          options={[
            {
              value: WeekendType.MENS,
              label: "Men's",
              href: switchTo(WeekendType.MENS),
            },
            {
              value: WeekendType.WOMENS,
              label: "Women's",
              href: switchTo(WeekendType.WOMENS),
            },
          ]}
        />
      </div>

      <ReviewWorkspace
        groupId={group.groupId}
        weekendType={weekendType}
        weekendLabel={weekendLabel}
        candidates={candidates}
        canEdit={canEdit}
        canEditPayments={canEditPayments}
        canViewMedical={canViewMedical}
      />
    </PageContent>
  )
}
