import { isNil } from 'lodash'
import { ClipboardCheck, CreditCard, FileText, LayoutGrid } from 'lucide-react'
import { StatTile } from '@/components/ui/stat-tile'
import { ComingUp } from '@/components/weekend-hub/coming-up'
import { PrayerWheelCard } from '@/components/weekend-hub/prayer-wheel-card'
import {
  YourPart,
  type YourPartAction,
} from '@/components/weekend-hub/your-part'
import { hasCompletedAllTeamForms } from '@/services/weekend-group-member/weekend-group-member-service'
import {
  getCandidateReviewCountByWeekend,
  getConfirmedCandidateCountByWeekend,
  getSponsoredCandidatesForWeekend,
} from '@/services/candidates/candidate-service'
import { getMyTeamFeeStatus } from '@/services/payment'
import { isTeamFeeSettled } from '@/lib/payments/checkout-price'
import { formatFee } from '@/lib/payments/group-fees'
import { getCachedPrayerWheelUrls } from '@/services/settings/cached'
import {
  getRosterAssignmentForUser,
  getRosterCountByWeekend,
} from '@/services/weekend/weekend-service'
import { Results } from '@/lib/results'
import { Permission, userHasPermission } from '@/lib/security'
import { cn } from '@/lib/utils'
import { formatWeekendGender } from '@/lib/weekend'
import {
  eventsForWeekend,
  hubPath,
  sendOffCountdown,
  upcomingEvents,
} from '@/lib/weekend/hub'
import { WEEKEND_CANDIDATE_CAPACITY, WeekendType } from '@/lib/weekend/types'
import { loadHubContextFromParams, type HubParams } from '../../hub-context'
import { loadHubEvents } from '../../hub-data'

const COMING_UP_LIMIT = 3

export default async function WeekendHubOverviewPage({
  params,
}: {
  params: HubParams
}) {
  const { user, group, weekend, weekendType } =
    await loadHubContextFromParams(params)

  const canReviewCandidates = userHasPermission(user, [
    Permission.READ_CANDIDATES,
  ])
  const canBuildRoster = userHasPermission(user, [
    Permission.READ_TEAM_ROSTER_BUILDER,
  ])
  // Team forms and the team fee belong to the active group's membership, so
  // they only show on that group's hub.
  const groupMemberId =
    user.teamMemberInfo?.groupId === group.groupId
      ? user.teamMemberInfo.groupMemberId
      : null

  // Every tile and card has its own source; one failing just drops that
  // tile (omit, don't approximate).
  const [
    confirmedResult,
    rosterCountResult,
    eventsResult,
    sponsoredResult,
    assignmentResult,
    prayerWheelResult,
    reviewCountResult,
    formsDoneResult,
    feeStatusResult,
  ] = await Promise.all([
    getConfirmedCandidateCountByWeekend(weekend.id),
    getRosterCountByWeekend(weekend.id),
    loadHubEvents(group.groupId),
    getSponsoredCandidatesForWeekend(user.email, weekend.id),
    getRosterAssignmentForUser(user.id, weekend.id),
    getCachedPrayerWheelUrls(),
    canReviewCandidates
      ? getCandidateReviewCountByWeekend(weekend.id)
      : Promise.resolve(null),
    isNil(groupMemberId)
      ? Promise.resolve(null)
      : hasCompletedAllTeamForms(groupMemberId),
    isNil(groupMemberId)
      ? Promise.resolve(null)
      : getMyTeamFeeStatus(groupMemberId),
  ])
  Results.logFailures(
    confirmedResult,
    rosterCountResult,
    eventsResult,
    sponsoredResult,
    assignmentResult
  )

  const confirmed = Results.toNullable(confirmedResult)
  const rosterCount = Results.toNullable(rosterCountResult)
  const events = eventsForWeekend(Results.unwrapOr(eventsResult, []), weekend)
  const countdown = sendOffCountdown(events, weekend, new Date())
  const comingUp = upcomingEvents(events, new Date(), COMING_UP_LIMIT)
  const sponsored = Results.unwrapOr(sponsoredResult, [])
  const assignment = Results.unwrapOr(assignmentResult, null)
  const reviewCount = isNil(reviewCountResult)
    ? null
    : Results.toNullable(reviewCountResult)
  const formsDone = isNil(formsDoneResult)
    ? null
    : Results.unwrapOr(formsDoneResult, false)
  const feeStatus = isNil(feeStatusResult)
    ? null
    : Results.toNullable(feeStatusResult)

  const gender = formatWeekendGender(weekendType, 'possessive') ?? 'this'
  const weekendLabel = isNil(weekend.number)
    ? `the ${gender} weekend`
    : `${gender} #${weekend.number}`
  const prayerWheelUrl = Results.match(
    prayerWheelResult,
    (urls) => (weekendType === WeekendType.MENS ? urls.mens : urls.womens),
    () => ''
  )

  const actions: YourPartAction[] = [
    isNil(formsDone)
      ? null
      : {
          key: 'forms',
          title: 'My forms',
          description: formsDone
            ? 'All of your team forms are signed.'
            : 'Sign your team forms before the weekend.',
          href: '/team-forms',
          icon: FileText,
          done: formsDone,
        },
    isNil(feeStatus)
      ? null
      : {
          key: 'fee',
          title: 'Team fee',
          description:
            feeStatus.state === 'paid'
              ? 'Paid — thank you.'
              : feeStatus.state === 'not-owed'
                ? 'No team fee for your role.'
                : feeStatus.state === 'fees-not-set'
                  ? "The team fee hasn't been set yet."
                  : feeStatus.coveredSoFar > 0
                    ? `${formatFee(feeStatus.amountDue)} left to pay.`
                    : 'Pay your team fee online.',
          href: '/payment',
          icon: CreditCard,
          done: isTeamFeeSettled(feeStatus),
        },
    canReviewCandidates
      ? {
          key: 'review',
          title: 'Review candidates',
          description: isNil(reviewCount)
            ? 'Decide on the candidates sponsored for this weekend.'
            : reviewCount === 1
              ? '1 candidate is waiting for a decision.'
              : `${reviewCount} candidates are waiting for a decision.`,
          href: hubPath(group.groupId, 'review-candidates', weekendType),
          icon: ClipboardCheck,
          restricted: true,
        }
      : null,
    canBuildRoster
      ? {
          key: 'roster-builder',
          title: 'Roster builder',
          description: 'Place team members into their roles.',
          href: `/roster-builder?weekendId=${weekend.id}`,
          icon: LayoutGrid,
          restricted: true,
        }
      : null,
  ].filter((action) => !isNil(action))

  const tiles = [
    isNil(confirmed)
      ? null
      : {
          key: 'confirmed',
          value: confirmed,
          suffix: `/ ${WEEKEND_CANDIDATE_CAPACITY}`,
          label: 'Candidates confirmed',
        },
    isNil(rosterCount)
      ? null
      : { key: 'team', value: rosterCount, label: 'Team members serving' },
    countdown.kind === 'until' || countdown.kind === 'since'
      ? {
          key: 'countdown',
          value: countdown.days,
          suffix: countdown.days === 1 ? 'day' : 'days',
          label: countdown.label,
        }
      : {
          key: 'countdown',
          value: countdown.kind === 'today' ? 'Today' : 'Underway',
          label: countdown.label,
        },
  ].filter((tile) => !isNil(tile))

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <StatTile
            key={tile.key}
            value={tile.value}
            suffix={tile.suffix}
            label={tile.label}
          />
        ))}
      </div>

      <div
        className={cn(
          'grid grid-cols-1 items-start gap-4',
          prayerWheelUrl !== '' &&
            'lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]'
        )}
      >
        <ComingUp
          events={comingUp}
          groupId={group.groupId}
          weekendType={weekendType}
        />
        {prayerWheelUrl !== '' && (
          <PrayerWheelCard url={prayerWheelUrl} weekendGender={gender} />
        )}
      </div>

      <YourPart
        weekendLabel={weekendLabel}
        sponsored={sponsored}
        assignment={assignment}
        actions={actions}
      />
    </>
  )
}
