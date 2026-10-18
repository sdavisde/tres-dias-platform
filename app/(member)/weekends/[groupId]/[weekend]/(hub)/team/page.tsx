import { Suspense } from 'react'
import {
  WeekendRosterView,
  WeekendRosterViewSkeleton,
} from '@/components/weekend'
import { isNil } from 'lodash'
import { loadTeamEmailMenu } from '@/components/community-email/hub-email'
import { EmailMenu } from '@/components/community-email/email-menu'
import { Results } from '@/lib/results'
import { eventsForWeekend } from '@/lib/weekend/hub'
import { loadHubContextFromParams, type HubParams } from '../../../hub-context'
import { loadHubEvents } from '../../../hub-data'
import { TeamSummaryCard } from './team-summary-card'

export default async function WeekendTeamPage({
  params,
}: {
  params: HubParams
}) {
  const { user, group, weekend, weekendType } =
    await loadHubContextFromParams(params)
  const [email, eventsResult] = await Promise.all([
    loadTeamEmailMenu({
      user,
      groupId: group.groupId,
      weekend,
      weekendType,
    }),
    loadHubEvents(group.groupId),
  ])
  Results.logFailures(eventsResult)
  const events = eventsForWeekend(Results.unwrapOr(eventsResult, []), weekend)

  return (
    <Suspense fallback={<WeekendRosterViewSkeleton hideWeekendHeader />}>
      <WeekendRosterView
        weekendId={weekend.id}
        weekend={weekend}
        user={user}
        hideWeekendHeader
        summarySlot={(roster) => (
          <TeamSummaryCard roster={roster} events={events} />
        )}
        toolbarSlot={!isNil(email) && <EmailMenu {...email} />}
      />
    </Suspense>
  )
}
